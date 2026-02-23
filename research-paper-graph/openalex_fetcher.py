import requests
import time

BASE_URL = "https://api.openalex.org"

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

    print(f"Fetching works for author {author_id}...")
    while True:
        params = {
            "filter": f"author.id:{author_id},is_oa:true", 
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

        time.sleep(0.2)  # be polite to the API

    print(f"Collected {len(works)} works.")
    return works

def process_work(work):
    """Extract fields, including Topics and Authors for the graph."""
    abstract_text = _inverted_to_text(work.get("abstract_inverted_index"))
    
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
        "topics": topics,     
        "authors": authors,   
        "pdf_url": _extract_pdf_url(work), 
    }

def _inverted_to_text(inverted):
    """Convert OpenAlex's inverted-index abstracts into normal text."""
    if not inverted:
        return None

    words = []
    for word, positions in inverted.items():
        for pos in positions:
            if len(words) <= pos:
                words.extend([None] * (pos - len(words) + 1))
            words[pos] = word

    return " ".join(w for w in words if w)

def _extract_pdf_url(work):
    """Find the best Open Access PDF link."""
    # Priority 1: Direct PDF link
    if work.get("open_access", {}).get("oa_url"):
        return work["open_access"]["oa_url"]
    return None
