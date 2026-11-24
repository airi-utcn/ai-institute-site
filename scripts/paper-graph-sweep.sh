#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GRAPH_DIR="$ROOT_DIR/research-paper-graph"
PYTHON_BIN="$GRAPH_DIR/.venv/bin/python"

RUN_MODE="print"
SOURCE_SELECTOR=""

usage() {
  cat <<'EOF'
Usage:
  scripts/paper-graph-sweep.sh [--run] [--source "--institution ...|--person ..."]

Default behavior prints commands only.
Use --run to execute commands.

Examples:
  scripts/paper-graph-sweep.sh
  scripts/paper-graph-sweep.sh --run
  scripts/paper-graph-sweep.sh --run --source "--person \"Adrian Groza\""
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --run)
      RUN_MODE="run"
      shift
      ;;
    --source)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --source" >&2
        exit 1
      fi
      SOURCE_SELECTOR="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ ! -x "$PYTHON_BIN" ]]; then
  echo "Python executable not found at $PYTHON_BIN" >&2
  echo "Create the virtual environment first." >&2
  exit 1
fi

PAPER_CLUSTER_SIZES=(18 22 26 30)
PAPER_MIN_SAMPLES=(4 6 8)
TOPIC_CLUSTER_SIZES=(4 6 8)
TOPIC_MIN_SAMPLES=(2 3 4)

run_or_print() {
  local command="$1"
  if [[ "$RUN_MODE" == "run" ]]; then
    echo "Running: $command"
    eval "$command"
  else
    echo "$command"
  fi
}

echo "# Phase A: paper-level clustering sweep"
for cluster_size in "${PAPER_CLUSTER_SIZES[@]}"; do
  for min_samples in "${PAPER_MIN_SAMPLES[@]}"; do
    cmd="cd \"$GRAPH_DIR\" && GRAPH_HDBSCAN_MIN_CLUSTER_SIZE=$cluster_size GRAPH_HDBSCAN_MIN_SAMPLES=$min_samples \"$PYTHON_BIN\" main.py $SOURCE_SELECTOR --dry-run --skip-pdf"
    run_or_print "$cmd"
  done
done

echo "# Phase B: topic-level clustering sweep"
for cluster_size in "${TOPIC_CLUSTER_SIZES[@]}"; do
  for min_samples in "${TOPIC_MIN_SAMPLES[@]}"; do
    cmd="cd \"$GRAPH_DIR\" && GRAPH_TOPIC_HDBSCAN_MIN_CLUSTER_SIZE=$cluster_size GRAPH_TOPIC_HDBSCAN_MIN_SAMPLES=$min_samples \"$PYTHON_BIN\" main.py $SOURCE_SELECTOR --dry-run --skip-pdf"
    run_or_print "$cmd"
  done
done
