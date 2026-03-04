import os
import json
import glob
import strapi_client
import openalex_fetcher
import graph_generator
from dotenv import load_dotenv

# Load environment variables from parent directory
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_file = os.path.join(parent_dir, ".env")
if os.path.exists(env_file):
    load_dotenv(env_file)

# Strapi connection
STRAPI_API_URL = os.getenv("STRAPI_URL", "http://localhost:1337")
STRAPI_TOKEN   = os.getenv("STRAPI_API_TOKEN", "your_strapi_token_here")

# Graph / similarity settings
GRAPH_SIMILARITY_THRESHOLD = float(os.getenv("GRAPH_SIMILARITY_THRESHOLD", "0.5"))
GRAPH_DUPLICATE_THRESHOLD  = float(os.getenv("GRAPH_DUPLICATE_THRESHOLD",  "0.92"))
GRAPH_AI_MODEL             = os.getenv("GRAPH_AI_MODEL", "all-MiniLM-L6-v2")


def main():
    print("=== Research Paper Graph Manager ===")
    source_choice = input("Load papers from (1) OpenAlex, (2) Local file [1/2]: ").strip() or "1"

    processed_papers = []
    author_name = "local"

    if source_choice == "2":
        files = glob.glob("outputs/*.json")
        if not files:
            print("No local files found in outputs/. Falling back to OpenAlex fetch.")
            source_choice = "1"

    if source_choice == "1":
        # 1a. Fetch from OpenAlex
        author_name  = input("Enter Author Name to fetch: ")
        institution  = input("Enter Institution filter (optional, press Enter to skip): ").strip() or None

        author_id = openalex_fetcher.find_author_id(author_name, institution)
        if not author_id:
            print("Author not found. Exiting.")
            return

        works            = openalex_fetcher.get_author_works(author_id)
        processed_papers = [openalex_fetcher.process_work(w) for w in works]
    else:
        # 1b. Load from local file
        files = glob.glob("outputs/*.json")
        print("Local files:")
        for idx, f in enumerate(files):
            print(f"  [{idx}] {f}")

        choice = input("Choose file index or enter a full path: ").strip()
        try:
            path = files[int(choice)] if choice.isdigit() else choice
            with open(path, 'r', encoding='utf-8') as fh:
                processed_papers = json.load(fh)
            author_name = os.path.splitext(os.path.basename(path))[0]
            print(f"Loaded {len(processed_papers)} papers from {path}")
        except Exception as e:
            print(f"Failed to load local file: {e}")
            return

    # Save local copy (only when fetched from OpenAlex)
    output_dir = "outputs"
    os.makedirs(output_dir, exist_ok=True)
    if source_choice == "1":
        out_path = f"{output_dir}/papers_{author_name.replace(' ', '_')}.json"
        with open(out_path, "w") as f:
            json.dump(processed_papers, f, indent=2)

    # 2. Generate links & detect duplicates BEFORE uploading anything
    all_links           = []
    duplicate_paper_ids = set()

    link_gen_decision = input(
        f"\nGenerate links from {len(processed_papers)} papers? (y/n): "
    ).lower().strip()

    if link_gen_decision == 'y':
        print(
            f"\n  Similarity threshold : {GRAPH_SIMILARITY_THRESHOLD}  "
            f"(links below this score are ignored)\n"
            f"  Duplicate threshold  : {GRAPH_DUPLICATE_THRESHOLD}  "
            f"(papers scoring at or above this are duplicates)\n"
        )
        all_links, duplicate_paper_ids = graph_generator.generate_links(
            processed_papers,
            similarity_threshold=GRAPH_SIMILARITY_THRESHOLD,
            duplicate_threshold=GRAPH_DUPLICATE_THRESHOLD,
            model_name=GRAPH_AI_MODEL,
        )

    # Split into clean / duplicate sets
    papers_to_upload = [p for p in processed_papers if p['openAlexId'] not in duplicate_paper_ids]
    links_to_upload  = [l for l in all_links if not l['is_duplicate']]

    skipped_papers = len(processed_papers) - len(papers_to_upload)
    skipped_links  = len(all_links) - len(links_to_upload)

    if link_gen_decision == 'y':
        print(f"\n--- Pre-upload summary ---")
        print(f"  Papers : {len(papers_to_upload)} to upload, {skipped_papers} duplicates skipped")
        print(f"  Links  : {len(links_to_upload)} to upload, {skipped_links} duplicates skipped")

    # 3. Upload non-duplicate papers to Strapi
    strapi    = strapi_client.StrapiClient(STRAPI_API_URL, STRAPI_TOKEN)
    paper_map = {}  # openAlexId -> Strapi documentId (for link resolution)

    upload_decision = input(
        f"\nUpload {len(papers_to_upload)} papers to Strapi? (y/n): "
    ).lower().strip()

    if upload_decision == 'y':
        print("\n--- Uploading Papers ---")
        for paper in papers_to_upload:
            pdf_id = None
            if paper.get("pdf_url"):
                safe_filename = f"{paper['openAlexId'].split('/')[-1]}.pdf"
                pdf_id = strapi.upload_pdf(paper['pdf_url'], safe_filename)

            if pdf_id:
                paper["attachment"] = pdf_id

            paper_id = strapi.create_paper(paper)
            if paper_id:
                paper_map[paper['openAlexId']] = paper_id
                print(f"✅ Created: {paper['title'][:50]}...")
    else:
        print("Skipping paper upload. Note: linking requires papers to already exist in Strapi.")

    # 4. Upload non-duplicate links to Strapi
    if all_links:
        upload_links_decision = input(
            f"\nUpload {len(links_to_upload)} AI Graph Links? (y/n): "
        ).lower().strip()

        if upload_links_decision == 'y':
            print(f"\n--- Uploading {len(links_to_upload)} Links ---")
            for link in links_to_upload:
                source_oa_id = link['source_openalex_id']
                target_oa_id = link['target_openalex_id']

                # Use the map populated during paper upload, fall back to Strapi API
                source_id = paper_map.get(source_oa_id) or strapi.get_paper_id_by_openalex(source_oa_id)
                target_id = paper_map.get(target_oa_id) or strapi.get_paper_id_by_openalex(target_oa_id)

                if source_id and target_id:
                    success = strapi.create_graph_link(source_id, target_id, link['score'])
                    if success:
                        print(f"🔗 Linked: {link['source_title'][:20]}... <-> {link['target_title'][:20]}...")
                else:
                    print(
                        f"⚠️  Skipped link: papers not found in Strapi "
                        f"for {source_oa_id} or {target_oa_id}"
                    )

    print("\nDone!")

if __name__ == "__main__":
    main()
