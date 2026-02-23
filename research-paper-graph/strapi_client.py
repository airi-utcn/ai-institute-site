import os
import requests
from io import BytesIO

class StrapiClient:
    def __init__(self, base_url, token):
        self.base_url = base_url.rstrip('/')
        self.api_url = f"{self.base_url}/api"
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        self.upload_headers = {
            "Authorization": f"Bearer {token}"
        }

    def upload_pdf(self, pdf_url, filename):
        """Downloads PDF from source and uploads to Strapi Media Library."""
        if not pdf_url:
            return None

        print(f"   Attempting PDF download: {pdf_url}...")
        try:
            # 1. Download PDF into memory
            pdf_resp = requests.get(pdf_url, timeout=15)
            pdf_resp.raise_for_status()
            
            # 2. Prepare for Strapi Upload
            files = {
                'files': (filename, BytesIO(pdf_resp.content), 'application/pdf')
            }
            
            # 3. Upload to Strapi
            upload_resp = requests.post(f"{self.api_url}/upload", headers=self.upload_headers, files=files)
            upload_resp.raise_for_status()
            
            return upload_resp.json()[0]['id']

        except Exception as e:
            print(f"   [Warning] PDF download/upload failed: {e}")
            return None

    def create_paper(self, paper_data):
        """Creates a paper entry in Strapi."""
        url = f"{self.api_url}/papers"
        payload = {"data": paper_data}

        try:
            r = requests.post(url, headers=self.headers, json=payload)
            r.raise_for_status()
            created_entry = r.json().get("data", {})
            return created_entry.get("documentId") or created_entry.get("id")
        except requests.exceptions.RequestException as e:
            print(f"[Strapi] Failed to push paper {paper_data.get('title', 'Unknown')}: {e}")
            return None

    def get_paper_id_by_openalex(self, openalex_id):
        """Finds existing Strapi ID for a given OpenAlex ID."""
        url = f"{self.api_url}/papers"
        params = {
            "filters[openAlexId][$eq]": openalex_id,
            "pagination[pageSize]": 1,
            "fields[0]": "documentId", # efficient query
            "fields[1]": "id"
        }
        
        try:
            r = requests.get(url, headers=self.headers, params=params)
            r.raise_for_status()
            data = r.json().get("data", [])
            if data:
                return data[0].get("documentId") or data[0].get("id")
            return None
        except Exception:
            return None

    def create_graph_link(self, source_id, target_id, score):
        """Creates a link relationship between two papers."""
        url = f"{self.api_url}/graph-links"
        payload = {
            "data": {
                "source": source_id,
                "target": target_id,
                "score": score
            }
        }

        try:
            r = requests.post(url, headers=self.headers, json=payload)
            r.raise_for_status()
            return True
        except requests.exceptions.RequestException as e:
            print(f"[Strapi] Failed to link papers: {e}")
            return False
