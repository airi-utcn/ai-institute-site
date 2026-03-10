import logging
from datetime import datetime, timezone

from .strapi import StrapiClient


def create_client(settings):
    return StrapiClient(settings.strapi_api_url, settings.strapi_token)


def upload_publications(strapi, papers_to_upload, args, logger=None):
    """Upsert publications into Strapi and return the publication map and stats."""
    log = logger or logging.getLogger("paper-sync")

    strapi.load_existing_publications()
    strapi.load_existing_people()

    pub_map = {}
    stats = {"created": 0, "updated": 0, "skipped": 0, "failed": 0}

    log.info(f"Uploading {len(papers_to_upload)} publications...")
    for paper in papers_to_upload:
        oa_id = paper.get("openAlexId")
        existing_id, match_type = strapi.find_existing_publication(
            openalex_id=oa_id,
            doi=paper.get("doi"),
            title=paper.get("title"),
        )

        if existing_id:
            pub_map[oa_id] = existing_id
            if args.update_existing:
                update_payload = strapi.build_import_update_payload(paper)
                strapi.update_publication(existing_id, update_payload)
                stats["updated"] += 1
                log.debug(f"  Updated ({match_type}): {paper['title'][:60]}")
            else:
                stats["skipped"] += 1
                log.debug(f"  Exists ({match_type}): {paper['title'][:60]}")
            continue

        author_ids = strapi.match_authors(paper.get("authors", []))

        if args.upload_pdfs and paper.get("pdf_url"):
            safe_name = f"{oa_id.split('/')[-1]}.pdf"
            pdf_id = strapi.upload_pdf(paper["pdf_url"], safe_name)
            if pdf_id:
                paper["attachment"] = pdf_id

        doc_id = strapi.create_publication(paper, author_ids=author_ids or None)
        if doc_id:
            pub_map[oa_id] = doc_id
            stats["created"] += 1
            log.info(f"  Created: {paper['title'][:60]}")
        else:
            stats["failed"] += 1

    log.info(
        f"Publications: {stats['created']} created, {stats['updated']} updated, "
        f"{stats['skipped']} skipped, {stats['failed']} failed"
    )
    return pub_map, stats


def upload_graph_links(strapi, links_to_upload, pub_map, communities=None, logger=None):
    """Create graph links between uploaded publications."""
    log = logger or logging.getLogger("paper-sync")

    if not links_to_upload:
        return {"created": 0, "failed": 0}

    log.info(f"Uploading {len(links_to_upload)} graph links...")
    link_ok = 0
    link_fail = 0

    for link in links_to_upload:
        source_paper_id = link["source_paper_id"]
        target_paper_id = link["target_paper_id"]

        src_id = pub_map.get(source_paper_id) or strapi.get_publication_id_by_openalex(source_paper_id)
        tgt_id = pub_map.get(target_paper_id) or strapi.get_publication_id_by_openalex(target_paper_id)

        if not src_id or not tgt_id:
            link_fail += 1
            continue

        is_cross = False
        if communities:
            src_comm = communities.get(source_paper_id)
            tgt_comm = communities.get(target_paper_id)
            is_cross = src_comm is not None and tgt_comm is not None and src_comm != tgt_comm

        success = strapi.create_graph_link(src_id, tgt_id, link["score"], is_cross_cluster=is_cross)
        if success:
            link_ok += 1
        else:
            link_fail += 1

    log.info(f"Links: {link_ok} created, {link_fail} failed/skipped")
    return {"created": link_ok, "failed": link_fail}


def replace_graph_links(strapi, links_to_upload, pub_map, communities=None, logger=None):
    """Replace all derived graph links with a freshly rebuilt set."""
    log = logger or logging.getLogger("paper-sync")

    log.info("Replacing graph links from global rebuild...")
    strapi.clear_graph_links()
    return upload_graph_links(strapi, links_to_upload, pub_map, communities=communities, logger=log)


def update_community_assignments(strapi, communities, community_labels, pub_map, logger=None):
    """Write community assignments back onto publications."""
    log = logger or logging.getLogger("paper-sync")

    if not communities or not community_labels:
        return 0

    log.info("Updating community assignments on publications...")
    comm_ok = 0
    for paper_id, comm_id in communities.items():
        doc_id = pub_map.get(paper_id) or strapi.get_publication_id_by_openalex(paper_id)
        if not doc_id:
            continue

        label_str = community_labels.get(comm_id, f"Cluster {comm_id}")
        if strapi.update_publication(doc_id, {"community": comm_id, "communityLabel": label_str}):
            comm_ok += 1

    log.info(f"Community assignments: {comm_ok} updated")
    return comm_ok


def update_graph_metadata(strapi, graph, pub_map, logger=None):
    """Write embedding and graph indexing metadata back onto publications."""
    log = logger or logging.getLogger("paper-sync")

    indexed_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    updated = 0

    for paper_id, document_id in pub_map.items():
        embedding_payload = graph.embedding_payloads.get(paper_id)
        community_id = graph.communities.get(paper_id)
        community_label = graph.community_labels.get(community_id) if community_id is not None else None
        payload = strapi.build_graph_metadata_payload(
            embedding_payload=embedding_payload,
            community_id=community_id,
            community_label=community_label,
            indexed_at=indexed_at,
        )
        if not payload:
            continue
        if strapi.update_publication(document_id, payload):
            updated += 1

    log.info(f"Graph metadata: {updated} publications updated")
    return updated