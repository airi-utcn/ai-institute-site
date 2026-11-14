#!/bin/bash
set -euo pipefail

# Allow overriding cron schedule/timezone from environment (default: Saturday 02:00 UTC)
CRON_SCHEDULE="${ACK_SYNC_CRON:-0 2 * * 6}"
CRON_TZ="${ACK_SYNC_TZ:-${TZ:-UTC}}"
PYTHON_BIN="${PYTHON_BIN:-$(command -v python3 || command -v python)}"

if [ -z "$PYTHON_BIN" ]; then
	echo "[$(date)] ERROR: could not find python3 or python in the image PATH" >&2
	exit 1
fi

# Stream logs to container stdout so `docker compose logs` shows worker output
LOG_TARGET="${ACK_SYNC_LOG_TARGET:-/proc/1/fd/1}"
RUNTIME_ENV_FILE="/tmp/ack-worker-runtime.env"

emit_cron_env() {
	local name="$1"
	local value="${!name:-}"
	if [ -n "$value" ]; then
		printf "export %s=%q\n" "$name" "$value"
	fi
}

{
	emit_cron_env RABBITMQ_HOST
	emit_cron_env RABBITMQ_PORT
	emit_cron_env RABBITMQ_USER
	emit_cron_env RABBITMQ_PASSWORD
	emit_cron_env RABBITMQ_VHOST
	emit_cron_env TASKS_QUEUE_NAME
	emit_cron_env RESULTS_QUEUE_NAME
	emit_cron_env MODEL_CACHE_DIR
	emit_cron_env AI_BI_MODEL
	emit_cron_env AI_CROSS_MODEL
	emit_cron_env AI_CONFIDENCE_THRESHOLD
	emit_cron_env AI_BI_THRESHOLD
	emit_cron_env AI_CROSS_THRESHOLD
	emit_cron_env AI_TOP_K
	emit_cron_env AI_SLM_ENABLED
	emit_cron_env AI_SLM_MODEL
	emit_cron_env AI_SLM_PROMPT_FILE
	emit_cron_env AI_SLM_MAX_NEW_TOKENS
	emit_cron_env AI_SLM_TEMPERATURE
	emit_cron_env WORKER_POLL_INTERVAL_SECONDS
	emit_cron_env WORKER_IDLE_EXIT_SECONDS
	emit_cron_env ACK_MAX_PAPERS_PER_RUN
	emit_cron_env ACK_SYNC_CRON
	emit_cron_env ACK_SYNC_TZ
	emit_cron_env OMP_NUM_THREADS
	emit_cron_env MKL_NUM_THREADS
	emit_cron_env OPENBLAS_NUM_THREADS
	emit_cron_env VECLIB_MAXIMUM_THREADS
	emit_cron_env NUMEXPR_NUM_THREADS
	emit_cron_env TOKENIZERS_PARALLELISM
} > "$RUNTIME_ENV_FILE"

chmod 600 "$RUNTIME_ENV_FILE"

# Setup cron job for acknowledgment worker
{
	printf "CRON_TZ=%s\n" "$CRON_TZ"
	printf '%s . %s && cd /app/worker_service && %s main.py >> %s 2>&1\n' "$CRON_SCHEDULE" "$RUNTIME_ENV_FILE" "$PYTHON_BIN" "$LOG_TARGET"
} | crontab -

echo "[$(date)] Acknowledgment worker scheduler started. Schedule: $CRON_SCHEDULE TZ: $CRON_TZ"
echo "[$(date)] Using Python binary: $PYTHON_BIN"
echo "[$(date)] Runtime env file: $RUNTIME_ENV_FILE"
echo "[$(date)] Installed crontab:"
crontab -l

# Optional immediate run on container startup if ACK_RUN_ON_STARTUP is enabled
case "${ACK_RUN_ON_STARTUP:-false}" in
	1|true|TRUE|yes|YES|on|ON)
		echo "[$(date)] ACK_RUN_ON_STARTUP is enabled -> starting worker batch processor now..."
		(cd /app/worker_service && "$PYTHON_BIN" main.py)
		echo "[$(date)] Initial worker batch finished. Worker Python process stopped; entering cron standby mode (cron -f)..."
		;;
esac

# Start cron in foreground (occupies negligible CPU/RAM 99% of the time)
exec cron -f
