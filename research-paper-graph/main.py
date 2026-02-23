import os
import json
import glob
import strapi_client
import openalex_fetcher
import graph_generator

# Configuration
STRAPI_API_URL = os.getenv("STRAPI_URL", "http://localhost:1337")
STRAPI_TOKEN = os.getenv("STRAPI_TOKEN", "c9e8fedefd150bcf284ed3d571e83a440f639afe64532de63e31db9965b7839e6bf1e519dfea5da79b09844cfc3fa350328ec92562e308830a7d6ae98868dba775ef79ec5d0543280277c36ba3f6d89ab046e292b223e4c4ab4f16a9a27e3ff3edc4bfa51a1ee48b84b3ac8cf6174e64b883290e49d9819f625b99e705e43a03")

def main():
    print("=== Research Paper Graph Manager ===")
    # Choose data source: OpenAlex or local JSON
    source_choice = input("Load papers from (1) OpenAlex, (2) Local file [1/2]: ").strip() or "1"

    processed_papers = []
    author_name = "local"

    if source_choice == "2":
        files = glob.glob("outputs/*.json")
        if not files:
            print("No local files found in outputs/. Falling back to OpenAlex fetch.")
            source_choice = "1"

    if source_choice == "1":
        # 1. Fetch Data from OpenAlex
        author_name = input("Enter Author Name to fetch: ")
        institution = input("Enter Institution filter (optional, press Enter to skip): ").strip() or None

        author_id = openalex_fetcher.find_author_id(author_name, institution)
        if not author_id:
            print("Author not found. Exiting.")
            return

        works = openalex_fetcher.get_author_works(author_id)
        processed_papers = [openalex_fetcher.process_work(w) for w in works]
    else:
        # 1b. Load from local file
        files = glob.glob("outputs/*.json")
        print("Local files:")
        for idx, f in enumerate(files):
            print(f"  [{idx}] {f}")

        choice = input("Choose file index or enter a full path: ").strip()
        try:
            if choice.isdigit():
                path = files[int(choice)]
            else:
                path = choice
            with open(path, 'r', encoding='utf-8') as fh:
                processed_papers = json.load(fh)
            author_name = os.path.splitext(os.path.basename(path))[0]
            print(f"Loaded {len(processed_papers)} papers from {path}")
        except Exception as e:
            print(f"Failed to load local file: {e}")
            return
    
    # Save local copy just in case (only if we fetched from OpenAlex)
    output_dir = "outputs"
    os.makedirs(output_dir, exist_ok=True)
    if source_choice == "1":
        with open(f"{output_dir}/papers_{author_name.replace(' ', '_')}.json", "w") as f:
            json.dump(processed_papers, f, indent=2)

    # 2. Upload to Strapi
    upload_decision = input(f"Upload {len(processed_papers)} papers to Strapi? (y/n): ").lower().strip()
    strapi = strapi_client.StrapiClient(STRAPI_API_URL, STRAPI_TOKEN)
    
    paper_map = {} # OpenAlexID -> StrapiID
    
    if upload_decision == 'y':
        print("\n--- Uploading Papers ---")
        for paper in processed_papers:
            # Handle PDF
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
        # If we skipped upload, we assume they might exist or we can't link them yet.
        # But to do linking, we need their IDs.
        print("Skipping upload. Note: Linking requires papers to be in Strapi.")
        
    # 3. Generate & Upload Links
    link_decision = input("Generate and upload AI Graph Links? (y/n): ").lower().strip()
    if link_decision == 'y':
        links = graph_generator.generate_links(processed_papers)
        
        print(f"\n--- Uploading {len(links)} Links ---")
        for link in links:
            source_oa_id = link['source_openalex_id']
            target_oa_id = link['target_openalex_id']
             
            # Resolve Strapi IDs (check map first, then API)
            source_id = paper_map.get(source_oa_id) or strapi.get_paper_id_by_openalex(source_oa_id)
            target_id = paper_map.get(target_oa_id) or strapi.get_paper_id_by_openalex(target_oa_id)
            
            if source_id and target_id:
                success = strapi.create_graph_link(source_id, target_id, link['score'])
                if success:
                    print(f"🔗 Linked: {link['source_title'][:20]}... <-> {link['target_title'][:20]}...")
            else:
                print(f"⚠️ Skipped link: Papers not found in Strapi for {source_oa_id} or {target_oa_id}")

    print("\nDone!")

if __name__ == "__main__":
    main()
