import json
import glob
import os
from sentence_transformers import SentenceTransformer, util

# --- CONFIGURATION ---
# The threshold determines how strict the "link" is.
# 0.0 = everything is linked, 1.0 = identical text only.
# Start with 0.5 or 0.6 for testing.
SIMILARITY_THRESHOLD = 0.5 

def load_local_papers():
    """Reads all JSON files from the output directory."""
    files = glob.glob("outputs/results_*/*.json")
    papers = []
    
    print(f"Loading {len(files)} files...")
    for f_path in files:
        try:
            with open(f_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # We strictly need an abstract to do AI linking
                if data.get('abstract'): 
                    papers.append(data)
        except Exception as e:
            print(f"Skipping broken file {f_path}: {e}")
            
    print(f"Loaded {len(papers)} papers with valid abstracts.")
    return papers

def generate_links(papers):
    """The AI Magic: Turns text into numbers and finds matches."""
    
    # 1. Initialize the Model
    # 'all-MiniLM-L6-v2' is fast, small (80MB), and free.
    print("Loading AI model (all-MiniLM-L6-v2)...")
    model = SentenceTransformer('all-MiniLM-L6-v2')

    # 2. Prepare the texts
    # combining title + abstract gives better context
    combined_texts = [f"{p['title']} {p['abstract']}" for p in papers]

    # 3. Generate Embeddings (The "Vector" representation)
    print("Generating embeddings (this might take a moment)...")
    embeddings = model.encode(combined_texts, convert_to_tensor=True, show_progress_bar=True)

    # 4. Calculate Cosine Similarity Matrix
    # This checks every paper against every other paper instantly
    cosine_scores = util.cos_sim(embeddings, embeddings)

    # 5. Extract Links
    links = []
    print("\n--- FOUND CONNECTIONS ---\n")
    
    # Loop through the upper triangle of the matrix (avoid duplicates and self-matching)
    for i in range(len(papers)):
        for j in range(i + 1, len(papers)):
            score = cosine_scores[i][j].item()
            
            if score > SIMILARITY_THRESHOLD:
                link = {
                    "source": papers[i]['title'],
                    "target": papers[j]['title'],
                    "score": round(score, 4)
                }
                links.append(link)
                
                # Print it to the console so you can FEEL the success
                print(f"🔗 [Score: {score:.2f}]")
                print(f"   A: {papers[i]['title']}")
                print(f"   B: {papers[j]['title']}")
                print("-" * 40)

    return links

if __name__ == "__main__":
    # 1. Load Data
    papers = load_local_papers()
    
    if len(papers) < 2:
        print("Not enough papers to link! Run the harvester first.")
        exit()

    # 2. Run AI
    links = generate_links(papers)
    
    # 3. Save "Graph" to file (Proof for your teacher)
    print(f"\nFound {len(links)} total connections.")
    with open("graph_links.json", "w") as f:
        json.dump(links, f, indent=2)
    print("Saved connections to graph_links.json")