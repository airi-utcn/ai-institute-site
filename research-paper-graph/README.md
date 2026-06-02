# Research Paper Graph

This package syncs publications from OpenAlex or local files into Strapi `Publication` entries and rebuilds the site-wide similarity graph.

Use [../SETUP.md](../SETUP.md) for the repository-wide setup, and keep the repository-root `.env` file in place because this package reads its configuration from there.

## Local Setup

From this directory:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Run

Show the available options:

```bash
python main.py --help
```

Common invocations:

```bash
python main.py
python main.py --institution "Technical University of Cluj-Napoca"
python main.py --person "Adrian Groza"
```
