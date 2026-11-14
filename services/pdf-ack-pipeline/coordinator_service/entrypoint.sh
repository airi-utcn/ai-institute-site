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

# Stream logs to container stdout so `docker compose logs` shows scheduler output
LOG_TARGET="${ACK_SYNC_LOG_TARGET:-/proc/1/fd/1}"
RUNTIME_ENV_FILE="/tmp/ack-sync-runtime.env"

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
	emit_cron_env STATE_DB_PATH
	emit_cron_env PDF_STORAGE_DIR
	emit_cron_env STRAPI_URL
	emit_cron_env STRAPI_INTERNAL_URL
	emit_cron_env PUBLIC_STRAPI_URL
	emit_cron_env STRAPI_API_TOKEN
	emit_cron_env STRAPI_PAGE_SIZE
	emit_cron_env STRAPI_TIMEOUT_SECONDS
	emit_cron_env COMPUTE_SHA256_STREAM
	emit_cron_env ACK_TEST_PDF_URLS
	emit_cron_env ACK_MAX_PAPERS_PER_RUN
	emit_cron_env ACK_SYNC_CRON
	emit_cron_env ACK_SYNC_TZ
	emit_cron_env TASK_RETRY_TIMEOUT_SECONDS
	emit_cron_env MAX_TASK_RETRIES
	emit_cron_env COORDINATOR_RESULT_POLL_SECONDS
} > "$RUNTIME_ENV_FILE"

chmod 600 "$RUNTIME_ENV_FILE"

# Setup cron job for acknowledgment sync
{
	printf "CRON_TZ=%s\n" "$CRON_TZ"
	printf '%s . %s && cd /app/coordinator_service && %s main.py >> %s 2>&1\n' "$CRON_SCHEDULE" "$RUNTIME_ENV_FILE" "$PYTHON_BIN" "$LOG_TARGET"
} | crontab -

echo "[$(date)] Acknowledgment coordinator scheduler started. Schedule: $CRON_SCHEDULE TZ: $CRON_TZ"
echo "[$(date)] Using Python binary: $PYTHON_BIN"
echo "[$(date)] Runtime env file: $RUNTIME_ENV_FILE"
echo "[$(date)] Installed crontab:"
crontab -l

# Optional immediate test run on container startup if ACK_RUN_ON_STARTUP is enabled
case "${ACK_RUN_ON_STARTUP:-false}" in
	1|true|TRUE|yes|YES|on|ON)
		echo "[$(date)] ACK_RUN_ON_STARTUP is enabled -> running initial sync now..."
		(cd /app/coordinator_service && "$PYTHON_BIN" main.py)
		echo "[$(date)] Initial sync finished. Coordinator Python process stopped; entering cron standby mode (cron -f)..."
		;;
esac

# Start cron in foreground (occupies negligible CPU/RAM 99% of the time)
exec cron -f
