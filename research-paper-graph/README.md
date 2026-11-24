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

5. Optional: add `OPENALEX_API_KEY` to `.env` to authenticate OpenAlex requests and get higher rate limits. Create a key at <https://openalex.org> (Settings → API key); when unset, imports use the anonymous free tier.

## Run

Show current usage:

```bash
python main.py --help
```

Common examples:

```bash
python main.py
python main.py --institution "Technical University of Cluj-Napoca"
python main.py --person "Adrian Groza"
```

## Documentation

- [docs/paper-graph-operations.md](/home/shumy/Projects/ai-institute-site/docs/paper-graph-operations.md): runbook for author identity, coverage, concurrency, PDFs, graph semantics, health checks, and environment variables
- [paper-graph-user-manual.md](/home/shumy/Projects/ai-institute-site/paper-graph-user-manual.md): editor-facing guide to the graph fields

## Dependency fallback

If `requirements.txt` fails in a fresh environment, install the core packages manually:

```bash
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install sentence-transformers requests numpy scikit-learn python-dotenv
```