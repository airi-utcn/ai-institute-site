FROM python:3.12-slim

WORKDIR /app

# Limit CPU thread usage to 2 threads so the worker runs quietly in the background
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    OMP_NUM_THREADS=2 \
    MKL_NUM_THREADS=2 \
    OPENBLAS_NUM_THREADS=2 \
    VECLIB_MAXIMUM_THREADS=2 \
    NUMEXPR_NUM_THREADS=2 \
    TOKENIZERS_PARALLELISM=false

RUN apt-get update && apt-get install -y --no-install-recommends \
    cron \
    && rm -rf /var/lib/apt/lists/*

COPY worker_service/requirements.txt ./worker_service/requirements.txt

# Install CPU-only PyTorch first to keep the Docker image small and fast (no CUDA bloat)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r ./worker_service/requirements.txt

# Copy shared module and worker_service source code
COPY shared/ ./shared/
COPY worker_service/src/ ./worker_service/src/
COPY worker_service/semantic_data/ ./worker_service/semantic_data/
COPY worker_service/main.py ./worker_service/main.py
COPY worker_service/entrypoint.sh ./worker_service/entrypoint.sh

RUN sed -i 's/\r$//' /app/worker_service/entrypoint.sh && \
    chmod +x /app/worker_service/entrypoint.sh

WORKDIR /app/worker_service

# Can be overridden with: docker compose run --rm worker_service python main.py
ENTRYPOINT ["/app/worker_service/entrypoint.sh"]
