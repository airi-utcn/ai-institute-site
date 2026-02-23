# Setup

1. Create venv:

```bash
python3 -m venv venv
```

2. Activate:

```bash
source venv/bin/activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Run:

```bash
python author_harvester.py
```

___

#### If the requirements.txt is outdated, or breaks for whatever reason

```bash
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install sentence-transformers requests numpy scikit-learn
```