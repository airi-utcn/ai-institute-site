from sentence_transformers import SentenceTransformer, util

def generate_links(papers, similarity_threshold=0.5, duplicate_threshold=0.92, model_name='all-MiniLM-L6-v2'):
    """
    Computes cosine-similarity links between papers.

    Links with score >= duplicate_threshold are flagged as duplicates. For each
    such pair, the second paper (j) is added to the returned duplicate set so the
    caller can skip uploading it.

    Returns:
        links               – list of link dicts, each with an 'is_duplicate' bool
        duplicate_paper_ids – set of openAlexId strings that should be skipped
    """

    papers_with_abstracts = [p for p in papers if p.get('abstract')]

    if len(papers_with_abstracts) < 2:
        print("Not enough papers with abstracts to generate links.")
        return [], set()

    print(f"Loading AI model ({model_name})...")
    model = SentenceTransformer(model_name)

    # Combining title + abstract gives better context
    combined_texts = [f"{p['title']} {p['abstract']}" for p in papers_with_abstracts]

    print("Generating embeddings (this might take a moment)...")
    embeddings = model.encode(combined_texts, convert_to_tensor=True, show_progress_bar=True)

    cosine_scores = util.cos_sim(embeddings, embeddings)

    links = []
    duplicate_paper_ids = set()

    print("\n--- FOUND CONNECTIONS ---\n")

    # Loop through the upper triangle of the matrix (avoid self-matches and double-counting)
    for i in range(len(papers_with_abstracts)):
        for j in range(i + 1, len(papers_with_abstracts)):
            score = cosine_scores[i][j].item()

            if score > similarity_threshold:
                paper_i = papers_with_abstracts[i]
                paper_j = papers_with_abstracts[j]
                is_duplicate = score >= duplicate_threshold

                if is_duplicate:
                    # Keep paper_i, mark paper_j as the duplicate
                    duplicate_paper_ids.add(paper_j['openAlexId'])

                link = {
                    "source_openalex_id": paper_i['openAlexId'],
                    "target_openalex_id": paper_j['openAlexId'],
                    "source_title": paper_i['title'],
                    "target_title": paper_j['title'],
                    "score": round(score, 4),
                    "is_duplicate": is_duplicate,
                }
                links.append(link)

                prefix = "[DUPLICATE]" if is_duplicate else "[SIMILAR]"
                print(f"{prefix} [Score: {score:.2f}]")
                print(f"   A: {paper_i['title']}")
                print(f"   B: {paper_j['title']}")
                print("-" * 40)

    total_links     = len(links)
    dup_links       = sum(1 for l in links if l['is_duplicate'])
    clean_links     = total_links - dup_links

    print(f"\nLOG: Links  : {total_links} total  |  {clean_links} to upload  |  {dup_links} duplicates skipped")
    print(f"LOG: Papers : {len(duplicate_paper_ids)} duplicates detected and will be skipped")

    return links, duplicate_paper_ids
