from io import BytesIO
import requests
import json
import os
import time

# --- CONFIGURATION BLOCK ---
BASE_URL = "https://api.openalex.org"
STRAPI_CONFIG = {
    "url": "http://localhost:1337", 
    "api_url": "http://localhost:1337/api",
    "collection": "papers", # Name of Strapi collection (plural form)
    # Todo: containerize this and import secret from global .env
    "token": "c9e8fedefd150bcf284ed3d571e83a440f639afe64532de63e31db9965b7839e6bf1e519dfea5da79b09844cfc3fa350328ec92562e308830a7d6ae98868dba775ef79ec5d0543280277c36ba3f6d89ab046e292b223e4c4ab4f16a9a27e3ff3edc4bfa51a1ee48b84b3ac8cf6174e64b883290e49d9819f625b99e705e43a03" 
}
# ---------------------------

def find_author_id(author_name, institution=None):
    """Search for an author by name (and optional institution)."""
    params = {
        "search": author_name,
        "per-page": 5
    }
    if institution:
        params["filter"] = f"last_known_institution.display_name.search:{institution}"

    r = requests.get(f"{BASE_URL}/authors", params=params)
    r.raise_for_status()
    data = r.json()

    if data["results"]:
        author = data["results"][0]
        print(f"Found author: {author['display_name']} ({author['id']})")
        return author["id"]
    else:
        print("No author found.")
        return None


def get_author_works(author_id):
    """Retrieve all works for a given author."""
    works = []
    cursor = "*"

    while True:
        params = {
            "filter": f"author.id:{author_id},is_oa:true", # Open Alex added a new filter for open access papers, so we can use that to get more full texts
            "per-page": 50,
            "cursor": cursor
        }
        r = requests.get(f"{BASE_URL}/works", params=params)
        r.raise_for_status()
        data = r.json()

        works.extend(data["results"])
        cursor = data.get("meta", {}).get("next_cursor")

        if not cursor:
            break

        time.sleep(0.2)  # be polite

    print(f"Collected {len(works)} works.")
    return works

def process_work(work):
    """Extract fields, including Topics and Authors for the graph."""
    abstract_text = inverted_to_text(work.get("abstract_inverted_index"))
    
    # Extract Topics (Top 3) for the "Meso" graph level
    topics = []
    for t in work.get("topics", [])[:3]:
        topics.append(t["display_name"])

    # Extract Co-Authors for the network
    authors = []
    for a in work.get("authorships", []):
        authors.append(a.get("author", {}).get("display_name"))

    return {
        "openAlexId": work.get("id"),
        "title": work.get("title"),
        "doi": work.get("doi"),
        "year": work.get("publication_year"),
        "cited_by": work.get("cited_by_count"),
        "abstract": abstract_text,
        "topics": topics,     # NEW: For topic clustering
        "authors": authors,   # NEW: For co-author graph
        "pdf_url": extract_pdf_url(work), # Helper to find the best link
    }


def inverted_to_text(inverted):
    """Convert OpenAlex's inverted-index abstracts into normal text."""
    if not inverted:
        return None

    words = []
    for word, positions in inverted.items():
        for pos in positions:
            # Extend list if needed
            if len(words) <= pos:
                words.extend([None] * (pos - len(words) + 1))
            words[pos] = word

    return " ".join(w for w in words if w)


def extract_pdf_url(work):
    """Find the best Open Access PDF link."""
    # Priority 1: Direct PDF link
    if work.get("open_access", {}).get("oa_url"):
        return work["open_access"]["oa_url"]
    return None

def save_results(name, works):
    """Save results into a folder."""
    folder = f"outputs/results_{name.replace(' ', '_')}"
    os.makedirs(folder, exist_ok=True)

    for w in works:
        processed = process_work(w)
        fname = os.path.join(folder, f"{processed['openAlexId'].split('/')[-1]}.json")

        with open(fname, "w", encoding="utf-8") as f:
            json.dump(processed, f, indent=2, ensure_ascii=False)

    print(f"Saved {len(works)} papers in {folder}/")

def upload_pdf_to_strapi(pdf_url, filename):
    """Downloads PDF from source and uploads to Strapi Media Library."""
    if not pdf_url:
        return None, False, False

    print(f"   Attempting PDF download: {pdf_url}...")
    try:
        # 1. Download PDF into memory
        # Set a timeout so we don't hang forever on bad links
        pdf_resp = requests.get(pdf_url, timeout=10)
        pdf_resp.raise_for_status()
        download_ok = True
        
        # 2. Prepare for Strapi Upload
        # Strapi expects 'files': (filename, file_object, mime_type)
        files = {
            'files': (filename, BytesIO(pdf_resp.content), 'application/pdf')
        }
        headers = {"Authorization": f"Bearer {STRAPI_CONFIG['token']}"}
        
        # 3. Upload to Strapi
        upload_resp = requests.post(f"{STRAPI_CONFIG['api_url']}/upload", headers=headers, files=files)
        upload_resp.raise_for_status()
        upload_ok = True
        
        # 4. Return the Strapi File ID
        return upload_resp.json()[0]['id'], download_ok, upload_ok

    except Exception as e:
        print(f"   [Warning] PDF download/upload failed: {e}")
        return None, False, False
    
def push_to_strapi(work_data, stats=None):
    """Push metadata AND attach PDF if available."""
    
    # 1. Try to handle PDF first (if link exists)
    pdf_id = None
    if work_data.get("pdf_url"):
        if stats is not None:
            stats["pdf_candidates"] += 1
        safe_filename = f"{work_data['openAlexId'].split('/')[-1]}.pdf"
        pdf_id, download_ok, upload_ok = upload_pdf_to_strapi(work_data['pdf_url'], safe_filename)
        if stats is not None:
            if download_ok:
                stats["download_ok"] += 1
            if upload_ok:
                stats["upload_ok"] += 1

    # 2. Add the file link to the payload if successful
    # Note: In Strapi, the field name for media usually determines the key. 
    # If your field is named 'attachment', use 'attachment': pdf_id
    if pdf_id:
        work_data['attachment'] = pdf_id 

    # 3. Push the main entry
    url = f"{STRAPI_CONFIG['api_url']}/{STRAPI_CONFIG['collection']}"
    headers = {
        "Authorization": f"Bearer {STRAPI_CONFIG['token']}",
        "Content-Type": "application/json"
    }
    
    payload = {"data": work_data}

    try:
        r = requests.post(url, headers=headers, json=payload)
        r.raise_for_status()
        print(f"[Strapi] Success: {work_data['title'][:30]}... (PDF: {'Yes' if pdf_id else 'No'})")
    except requests.exceptions.RequestException as e:
        print(f"[Strapi] Failed to push {work_data['openAlexId']}: {e}")


if __name__ == "__main__":
    name = input("Author name: ")
    
    institution = input("Institution filter (press ENTER to skip): ").strip() or None

    author_id = find_author_id(name, institution)
    if not author_id:
        exit()

    works = get_author_works(author_id)
    save_results(name, works)

    print("\n--- Pushing to Strapi ---")
    stats = {
        "pdf_candidates": 0,
        "download_ok": 0,
        "upload_ok": 0,
    }
    for w in works:
        processed = process_work(w)
        push_to_strapi(processed, stats)

    if stats["pdf_candidates"] > 0:
        download_pct = (stats["download_ok"] / stats["pdf_candidates"]) * 100
        upload_pct = (stats["upload_ok"] / stats["pdf_candidates"]) * 100
    else:
        download_pct = 0.0
        upload_pct = 0.0

    print("\n--- PDF Stats ---")
    print(
        f"Download success: {stats['download_ok']}/{stats['pdf_candidates']} "
        f"({download_pct:.1f}%)"
    )
    print(
        f"Upload success:   {stats['upload_ok']}/{stats['pdf_candidates']} "
        f"({upload_pct:.1f}%)"
    )