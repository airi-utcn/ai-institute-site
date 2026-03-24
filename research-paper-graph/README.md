# Research Paper Graph

This package fetches publications from OpenAlex or local files, syncs them into Strapi `Publication` entries, and rebuilds the global similarity graph used by the site.

## Setup

1. Create a virtual environment.

```bash
python3 -m venv venv
```

2. Activate it.

```bash
source venv/bin/activate
```

3. Install dependencies.

```bash
pip install -r requirements.txt
```

4. Ensure the repository `.env` contains a working `STRAPI_API_TOKEN` and Strapi URL settings.

## Run

Show current usage:

```bash
python main.py --help
```

Common examples:

```bash
python main.py --strapi-people
python main.py --strapi-people --dry-run
python main.py --institution "Technical University of Cluj-Napoca"
python main.py --institution "Technical University of Cluj-Napoca" --dry-run
python main.py --person "Adrian Groza"
python main.py --person "Adrian Groza" --dry-run
```

## Documentation

- [docs/paper-graph-generation.md](/home/shumy/Projects/ai-institute-site/docs/paper-graph-generation.md): detailed explanation of embeddings, FAISS, links, duplicates, and Louvain communities
- [docs/paper-sync-cli-guide.md](/home/shumy/Projects/ai-institute-site/docs/paper-sync-cli-guide.md): option-by-option CLI guide, usage patterns, and current caveats

## Dependency fallback

If `requirements.txt` fails in a fresh environment, install the core packages manually:

```bash
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install sentence-transformers requests numpy scikit-learn python-dotenv
```