"""Read-only diagnostics for the publication corpus and graph.

Designed to be safe to run against production: it only performs GET requests and
prints a funnel plus the anomalies that most often explain a bad graph.
"""

import json
from collections import Counter, defaultdict

from .strapi_sync import create_client
from .utils import normalize_doi, normalize_openalex_id, normalize_title


def _as_attributes(entry):
    return entry.get("attributes", entry) if isinstance(entry, dict) else {}


def _relation_list(value):
    if not value:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, dict):
        data = value.get("data")
        if isinstance(data, list):
            return data
        if data:
            return [data]
        return [value]
    return []


def _collect(strapi, settings):
    publications = strapi._fetch_all_pages(
        "publications",
        {
            "fields[0]": "title",
            "fields[1]": "slug",
            "fields[2]": "openAlexId",
            "fields[3]": "doi",
            "fields[4]": "year",
            "fields[5]": "sourceKind",
            "fields[6]": "graphEligible",
            "fields[7]": "kind",
            "fields[8]": "abstract",
            "fields[9]": "embedding",
            "fields[10]": "publishedAt",
            "populate[authors][fields][0]": "documentId",
            "populate[pdfFile][fields][0]": "id",
            "populate[graphMacroPrimary][fields][0]": "name",
            "populate[graphMacroPrimary][fields][1]": "slug",
            "populate[graphMesoPrimary][fields][0]": "name",
            "populate[graphMesoPrimary][fields][1]": "slug",
        },
    )
    people = strapi._fetch_all_pages(
        "people",
        {
            "fields[0]": "fullName",
            "fields[1]": "firstName",
            "fields[2]": "lastName",
            "fields[3]": "type",
            "fields[4]": "importEligible",
            "fields[5]": "openAlexAuthorId",
            "fields[6]": "orcid",
            "fields[7]": "publishedAt",
            "populate[publications][fields][0]": "documentId",
        },
    )
    links = strapi._fetch_all_pages(
        "graph-links",
        {
            "fields[0]": "score",
            "fields[1]": "isCrossCluster",
            "populate[source][fields][0]": "documentId",
            "populate[target][fields][0]": "documentId",
        },
    )
    mesos = strapi._fetch_all_pages(
        "graph-mesos",
        {
            "fields[0]": "name",
            "fields[1]": "slug",
            "fields[2]": "publishedAt",
            "populate[macro][fields][0]": "name",
            "populate[publications][fields][0]": "documentId",
            "populate[publicationsPrimary][fields][0]": "documentId",
        },
    )
    return publications, people, links, mesos


def _publication_metrics(publications):
    total = len(publications)
    graph = []
    for entry in publications:
        attrs = _as_attributes(entry)
        if attrs.get("graphEligible"):
            graph.append(entry)

    def count(predicate, rows):
        return sum(1 for row in rows if predicate(_as_attributes(row)))

    def has_relation(attrs, key):
        return bool(_relation_list(attrs.get(key)))

    return {
        "publications": total,
        "graphEligible": len(graph),
        "graphEligibleWithoutAbstract": count(
            lambda a: not (a.get("abstract") or "").strip(), graph
        ),
        "graphEligibleWithoutEmbedding": count(lambda a: not a.get("embedding"), graph),
        "graphEligibleWithoutDoi": count(lambda a: not (a.get("doi") or "").strip(), graph),
        "graphEligibleWithoutAuthors": count(
            lambda a: not has_relation(a, "authors"), graph
        ),
        "graphEligibleWithoutPdf": count(
            lambda a: not has_relation(a, "pdfFile"), graph
        ),
        "graphEligibleWithoutMacro": count(
            lambda a: not has_relation(a, "graphMacroPrimary"), graph
        ),
        "graphEligibleWithoutMeso": count(
            lambda a: not has_relation(a, "graphMesoPrimary"), graph
        ),
        "manualGraphEligible": count(
            lambda a: a.get("sourceKind") == "manual", graph
        ),
        "missingKind": count(lambda a: not (a.get("kind") or "").strip(), publications),
    }, graph


def _duplicate_metrics(publications):
    fields = {
        "title": lambda a: normalize_title(a.get("title")),
        "doi": lambda a: normalize_doi(a.get("doi")),
        "openAlexId": lambda a: normalize_openalex_id(a.get("openAlexId")),
    }
    result = {}
    for name, getter in fields.items():
        counts = Counter(getter(_as_attributes(row)) for row in publications)
        duplicates = {value: count for value, count in counts.items() if value and count > 1}
        result[name] = duplicates
    return result


def _people_metrics(people):
    total = len(people)
    eligible = 0
    no_author_id = 0
    no_publications = 0
    eligible_no_publications = 0
    for entry in people:
        attrs = _as_attributes(entry)
        if attrs.get("publishedAt") is None:
            continue
        pub_ids = {
            item.get("documentId") or item.get("id")
            for item in _relation_list(attrs.get("publications"))
            if item.get("documentId") or item.get("id")
        }
        if attrs.get("importEligible"):
            eligible += 1
            if not attrs.get("openAlexAuthorId"):
                no_author_id += 1
        if not pub_ids:
            no_publications += 1
            if attrs.get("importEligible"):
                eligible_no_publications += 1
    return {
        "people": total,
        "importEligible": eligible,
        "importEligibleWithoutOpenAlexId": no_author_id,
        "peopleWithoutPublications": no_publications,
        "importEligibleWithoutPublications": eligible_no_publications,
    }


def _link_metrics(links, graph_publications):
    pub_by_id = {}
    macro_by_id = {}
    for entry in graph_publications:
        attrs = _as_attributes(entry)
        doc_id = entry.get("documentId") or entry.get("id")
        if not doc_id:
            continue
        pub_by_id[doc_id] = attrs
        macro = _relation_list(attrs.get("graphMacroPrimary"))
        macro_by_id[doc_id] = macro[0].get("name") if macro else None

    degree = Counter()
    actual_cross = 0
    flagged_cross = 0
    bad_endpoints = 0
    for entry in links:
        attrs = _as_attributes(entry)
        source = _relation_list(attrs.get("source"))
        target = _relation_list(attrs.get("target"))
        source_id = source[0].get("documentId") if source else None
        target_id = target[0].get("documentId") if target else None
        if source_id not in pub_by_id or target_id not in pub_by_id:
            bad_endpoints += 1
            continue
        degree[source_id] += 1
        degree[target_id] += 1
        if attrs.get("isCrossCluster"):
            flagged_cross += 1
        if macro_by_id.get(source_id) and macro_by_id.get(target_id) and macro_by_id[source_id] != macro_by_id[target_id]:
            actual_cross += 1

    isolated = [doc_id for doc_id in pub_by_id if degree[doc_id] == 0]
    return {
        "links": len(links),
        "badEndpoints": bad_endpoints,
        "isolatedGraphEligible": len(isolated),
        "isolatedTitles": [pub_by_id[doc_id].get("title", "")[:120] for doc_id in isolated[:10]],
        "isCrossClusterFlagged": flagged_cross,
        "actualMacroCross": actual_cross,
        "crossFlagMismatch": abs(flagged_cross - actual_cross),
    }


def _meso_metrics(mesos):
    names = Counter(
        (_as_attributes(row).get("name") or "").strip().lower()
        for row in mesos
        if (_as_attributes(row).get("name") or "").strip()
    )
    empty = 0
    legacy_empty = 0
    for entry in mesos:
        attrs = _as_attributes(entry)
        if attrs.get("publishedAt") is None:
            continue
        if _relation_list(attrs.get("publications")) or _relation_list(
            attrs.get("publicationsPrimary")
        ):
            continue
        slug = attrs.get("slug") or ""
        if slug.startswith("sc-"):
            empty += 1
        else:
            legacy_empty += 1
    return {
        "mesos": len(mesos),
        "mesosWithoutAnyPublications": empty,
        "legacyEmptyMesos": legacy_empty,
        "duplicateMesoNames": {name: count for name, count in names.items() if count > 1},
    }


def _orphan_media(strapi, publications, recent=200):
    """Find recently uploaded PDFs that are not attached to a publication."""
    attached = set()
    for entry in publications:
        attrs = _as_attributes(entry)
        for item in _relation_list(attrs.get("pdfFile")):
            file_id = item.get("id")
            if file_id:
                attached.add(file_id)

    response = strapi._request(
        "GET",
        f"{strapi.api_url}/upload/files",
        headers=strapi.headers,
        params={
            "pagination[pageSize]": recent,
            "sort": "createdAt:desc",
            "fields[0]": "name",
            "fields[1]": "createdAt",
            "fields[2]": "url",
        },
    )
    if not response.ok:
        return {"error": f"{response.status_code} {response.text[:500]}"}
    files = response.json()
    if isinstance(files, dict):
        files = files.get("results") or files.get("data") or []
    orphans = [
        {"id": file.get("id"), "name": file.get("name"), "createdAt": file.get("createdAt")}
        for file in files
        if file.get("id") not in attached
        and (file.get("name") or "").lower().endswith(".pdf")
    ]
    return {"recentFiles": len(files), "unattachedPdfs": len(orphans), "sample": orphans[:10]}


def build_report(settings):
    strapi = create_client(settings)
    publications, people, links, mesos = _collect(strapi, settings)
    pub_metrics, graph_publications = _publication_metrics(publications)
    report = {
        "publications": pub_metrics,
        "duplicates": _duplicate_metrics(publications),
        "people": _people_metrics(people),
        "links": _link_metrics(links, graph_publications),
        "mesos": _meso_metrics(mesos),
        "media": _orphan_media(strapi, publications),
    }
    report["summary"] = {
        "graphEligible": pub_metrics["graphEligible"],
        "embedded": pub_metrics["graphEligible"] - pub_metrics["graphEligibleWithoutEmbedding"],
        "noAbstract": pub_metrics["graphEligibleWithoutAbstract"],
        "noPdf": pub_metrics["graphEligibleWithoutPdf"],
        "isolated": report["links"]["isolatedGraphEligible"],
        "links": report["links"]["links"],
        "importEligiblePeople": report["people"]["importEligible"],
        "peopleWithoutPublications": report["people"]["peopleWithoutPublications"],
    }
    return report


def run_doctor(settings, json_output=False):
    report = build_report(settings)
    if json_output:
        print(json.dumps(report, indent=2, sort_keys=True))
        return 0

    s = report["summary"]
    print("Paper graph doctor")
    print("==================")
    print(f"Graph eligible:            {s['graphEligible']}")
    print(f"Embedded/linkable:         {s['embedded']}")
    print(f"No abstract (title+topic): {s['noAbstract']}")
    print(f"No PDF:                    {s['noPdf']}")
    print(f"Graph links:               {s['links']}")
    print(f"Isolated graph papers:     {s['isolated']}")
    print(f"Importable people:         {s['importEligiblePeople']}")
    print(f"People with no publications:{s['peopleWithoutPublications']:>4}")

    print("\nGraph links")
    for key in ("badEndpoints", "isCrossClusterFlagged", "actualMacroCross", "crossFlagMismatch"):
        print(f"  {key}: {report['links'][key]}")

    print("\nMeses")
    for key, value in report["mesos"].items():
        print(f"  {key}: {value}")

    print("\nDuplicates")
    for key, value in report["duplicates"].items():
        print(f"  {key}: {len(value)} duplicate value(s)")
        for duplicate, count in list(value.items())[:5]:
            print(f"    {count} x {duplicate[:100]}")

    print("\nPeople")
    for key, value in report["people"].items():
        print(f"  {key}: {value}")

    print("\nMedia")
    for key, value in report["media"].items():
        if key != "sample":
            print(f"  {key}: {value}")

    return 0
