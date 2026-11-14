FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    cron \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

COPY coordinator_service/requirements.txt ./coordinator_service/requirements.txt
RUN pip install --no-cache-dir -r ./coordinator_service/requirements.txt

COPY shared/ ./shared/
COPY coordinator_service/ ./coordinator_service/

RUN sed -i 's/\r$//' /app/coordinator_service/entrypoint.sh && \
    chmod +x /app/coordinator_service/entrypoint.sh

WORKDIR /app/coordinator_service

# Can be overridden with: docker compose run --rm coordinator_service python main.py
ENTRYPOINT ["/app/coordinator_service/entrypoint.sh"]
