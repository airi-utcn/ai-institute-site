import logging

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
        src_oa = link["source_openalex_id"]
        tgt_oa = link["target_openalex_id"]

        src_id = pub_map.get(src_oa) or strapi.get_publication_id_by_openalex(src_oa)
        tgt_id = pub_map.get(tgt_oa) or strapi.get_publication_id_by_openalex(tgt_oa)

        if not src_id or not tgt_id:
            link_fail += 1
            continue

        is_cross = False
        if communities:
            src_comm = communities.get(src_oa)
            tgt_comm = communities.get(tgt_oa)
            is_cross = src_comm is not None and tgt_comm is not None and src_comm != tgt_comm

        success = strapi.create_graph_link(src_id, tgt_id, link["score"], is_cross_cluster=is_cross)
        if success:
            link_ok += 1
        else:
            link_fail += 1

    log.info(f"Links: {link_ok} created, {link_fail} failed/skipped")
    return {"created": link_ok, "failed": link_fail}


def update_community_assignments(strapi, communities, community_labels, pub_map, logger=None):
    """Write community assignments back onto publications."""
    log = logger or logging.getLogger("paper-sync")

    if not communities or not community_labels:
        return 0

    log.info("Updating community assignments on publications...")
    comm_ok = 0
    for oa_id, comm_id in communities.items():
        doc_id = pub_map.get(oa_id) or strapi.get_publication_id_by_openalex(oa_id)
        if not doc_id:
            continue

        label_str = community_labels.get(comm_id, f"Cluster {comm_id}")
        if strapi.update_publication(doc_id, {"community": comm_id, "communityLabel": label_str}):
            comm_ok += 1

    log.info(f"Community assignments: {comm_ok} updated")
    return comm_ok