# Paper Sync CLI Guide

Stage 1 simplifies the sync command into a strict, non-interactive interface.

## Command Shape

```bash
python main.py (--strapi-people | --institution INSTITUTION | --person PERSON_NAME) [--dry-run]
```

## Default Behavior

Running `python main.py --strapi-people` now always:

1. loads Strapi people
2. resolves each person against OpenAlex
3. fetches and deduplicates papers
4. updates/creates publications in Strapi
5. rebuilds graph links and graph metadata from all graph-eligible publications

The run is deterministic and low-config:

- source selection is explicit and strict (`--strapi-people`, `--institution`, or `--person`)
- OpenAlex fetch cache reuse is always enabled
- refresh-cache, local file mode, and interactive prompts are removed from the CLI surface
- updates for existing machine-managed publications are always enabled

## Options

### `--strapi-people`

Import based only on people loaded from Strapi.

### `--institution`

Import works for one OpenAlex institution.

Institution name for institution-based import.

### `--person`

Import works for one OpenAlex author resolved by person name.

Person name is required for single-person import.

Validation rules:

- one of `--strapi-people`, `--institution`, or `--person` is required
- they are mutually exclusive

If no source selector is provided, the CLI prints help and exits without running.
Any other invalid invocation still hard-fails.

### `--dry-run`

Skips Strapi writes.

The tool still performs fetch + graph computation and writes local debug artifacts in `outputs/`.

## Examples

Run the full Strapi-people sync:

```bash
python main.py --strapi-people
```

Run institution-wide sync:

```bash
python main.py --institution "Technical University of Cluj-Napoca"
```

Run non-writing dry run in Strapi-people mode:

```bash
python main.py --strapi-people --dry-run
```

Run non-writing dry run in institution mode:

```bash
python main.py --institution "Technical University of Cluj-Napoca" --dry-run
```

Run single-person import:

```bash
python main.py --person "Adrian Groza"
```