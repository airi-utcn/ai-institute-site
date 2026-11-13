#!/bin/bash
set -euo pipefail

# Allow overriding cron schedule/timezone from environment.
CRON_SCHEDULE="${PAPER_SYNC_CRON:-0 0 * * 6}"
CRON_TZ="${TZ:-UTC}"
PYTHON_BIN="${PYTHON_BIN:-$(command -v python3 || command -v python)}"

if [ -z "$PYTHON_BIN" ]; then
	echo "[$(date)] ERROR: could not find python3 or python in the image PATH" >&2
	exit 1
fi

# Stream logs to container stdout so `docker compose logs` can show scheduler output.
LOG_TARGET="${PAPER_SYNC_LOG_TARGET:-/proc/1/fd/1}"
RUNTIME_ENV_FILE="/tmp/paper-sync-runtime.env"

emit_cron_env() {
	local name="$1"
	local value="${!name:-}"
	if [ -n "$value" ]; then
		printf "export %s=%q\n" "$name" "$value"
	fi
}

{
	emit_cron_env STRAPI_URL
	emit_cron_env STRAPI_API_TOKEN
	emit_cron_env OPENALEX_API_KEY
	emit_cron_env GRAPH_SIMILARITY_THRESHOLD
	emit_cron_env GRAPH_DUPLICATE_THRESHOLD
	emit_cron_env GRAPH_AI_MODEL
	emit_cron_env GRAPH_HDBSCAN_MIN_CLUSTER_SIZE
	emit_cron_env GRAPH_HDBSCAN_MIN_SAMPLES
	emit_cron_env GRAPH_SECONDARY_CLUSTER_DISTANCE_THRESHOLD
	emit_cron_env GRAPH_TOPIC_HDBSCAN_MIN_CLUSTER_SIZE
	emit_cron_env GRAPH_TOPIC_HDBSCAN_MIN_SAMPLES
	emit_cron_env GRAPH_TOP_K
} > "$RUNTIME_ENV_FILE"

chmod 600 "$RUNTIME_ENV_FILE"

# Setup cron job for paper sync (default: Saturday 00:00 UTC)
{
	printf "CRON_TZ=%s\n" "$CRON_TZ"
	printf '%s . %s && cd /app && %s main.py >> %s 2>&1\n' "$CRON_SCHEDULE" "$RUNTIME_ENV_FILE" "$PYTHON_BIN" "$LOG_TARGET"
} | crontab -

# Log startup and installed crontab to container stdout.
echo "[$(date)] Paper sync scheduler started. Schedule: $CRON_SCHEDULE TZ: $CRON_TZ"
echo "[$(date)] Using Python binary: $PYTHON_BIN"
echo "[$(date)] Runtime env file: $RUNTIME_ENV_FILE"
echo "[$(date)] Installed crontab:"
crontab -l

# Start cron in foreground
exec cron -f
