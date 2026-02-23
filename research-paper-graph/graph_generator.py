from sentence_transformers import SentenceTransformer, util

def generate_links(papers, threshold=0.5):
    """The AI Magic: Turns text into numbers and finds matches."""
    
    papers_with_abstracts = [p for p in papers if p.get('abstract')]
    
    if len(papers_with_abstracts) < 2:
        print("Not enough papers with abstracts to generate links.")
        return []

    print("Loading AI model (all-MiniLM-L6-v2)...")
    model = SentenceTransformer('all-MiniLM-L6-v2')

    # combining title + abstract gives better context
    combined_texts = [f"{p['title']} {p['abstract']}" for p in papers_with_abstracts]

    print("Generating embeddings (this might take a moment)...")
    embeddings = model.encode(combined_texts, convert_to_tensor=True, show_progress_bar=True)

    cosine_scores = util.cos_sim(embeddings, embeddings)

    links = []
    print("\n--- FOUND CONNECTIONS ---\n")
    
    # Loop through the upper triangle of the matrix (avoid duplicates and self-matching)
    for i in range(len(papers_with_abstracts)):
        for j in range(i + 1, len(papers_with_abstracts)):
            score = cosine_scores[i][j].item()
            
            if score > threshold:
                link = {
                    "source_openalex_id": papers_with_abstracts[i]['openAlexId'],
                    "target_openalex_id": papers_with_abstracts[j]['openAlexId'],
                    "source_title": papers_with_abstracts[i]['title'],
                    "target_title": papers_with_abstracts[j]['title'],
                    "score": round(score, 4)
                }
                links.append(link)
                
                print(f"🔗 [Score: {score:.2f}]")
                print(f"   A: {link['source_title']}")
                print(f"   B: {link['target_title']}")
                print("-" * 40)

    return links
