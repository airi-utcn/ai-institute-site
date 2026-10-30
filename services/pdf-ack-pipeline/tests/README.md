# PDF Acknowledgment Pipeline - Test Suite

Modular test suite covering all layers of the `pdf-ack-pipeline` architecture.

## Structure

```
tests/
├── helpers.py                           # Fixture generators, in-memory queue bridge, test configs
├── test_01_hashing_utils.py             # Unit: SHA-256 (bytes/file/stream) & Strapi media URL resolution
├── test_02_state_tracker.py             # Unit: SQLite3 StateTracker lifecycle, retries, persistence
├── test_03_config.py                    # Unit: Config loading, env overrides, CSV/boolean parsing
├── test_04_pdf_chunker.py               # Unit: PyMuPDF chunking, hyphen rejoining, RAM-only URL loading
├── test_05_strapi_client.py             # Unit: StrapiAckClient (strictly read-only GET, pagination)
├── test_06_queue_manager.py             # Unit: QueueManager pika wrapper & message serialization
├── test_07_result_consumer.py           # Unit: ResultConsumer drain & waiting logic
├── test_08_ack_sync_integration.py      # Integration: 1-by-1 coordinator sync + retry loop + batch limit
├── test_09_worker_loop.py               # Integration: Worker batch loop, max limit & idle shutdown
├── test_10_semantic_extractor_ai.py     # AI: Real Bi-Encoder + Cross-Encoder inference (opt-in, --ai)
├── test_11_static_config_consistency.py # Static: .env / sample.env / docker-compose.yml / entrypoint.sh sanity
└── tests.py                             # Master test runner
```

## Running the tests

With `.venv` active (you see `(.venv)` in the terminal), from `services/pdf-ack-pipeline`:

```bash
# Fast tests: unit, integration, static checks (~6s, no AI models loaded)
python tests/tests.py

# Fast tests + real AI models (Bi-Encoder + Cross-Encoder)
python tests/tests.py --ai
```

From the project root (`ai-institute-site`):

```bash
python services/pdf-ack-pipeline/tests/tests.py
python services/pdf-ack-pipeline/tests/tests.py --ai
```
