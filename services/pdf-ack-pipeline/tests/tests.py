"""
Master Test Runner for the PDF Acknowledgment Pipeline.
Executes the test suite in `services/pdf-ack-pipeline/tests/`.

Usage (from services/pdf-ack-pipeline):
    python tests/tests.py          # Fast tests (unit, integration, static checks)
    python tests/tests.py --ai     # Fast tests + real AI model inference tests
"""

import argparse
import os
import sys
import unittest
from pathlib import Path

TESTS_DIR = Path(__file__).resolve().parent
PIPELINE_ROOT = TESTS_DIR.parent
REPO_ROOT = PIPELINE_ROOT.parent.parent

# Ensure all pipeline modules and tests can be imported smoothly
for p in (
    str(TESTS_DIR),
    str(PIPELINE_ROOT),
    str(PIPELINE_ROOT / "coordinator_service"),
    str(PIPELINE_ROOT / "worker_service"),
    str(REPO_ROOT),
):
    if p not in sys.path:
        sys.path.insert(0, p)


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run pdf-ack-pipeline tests.")
    parser.add_argument(
        "--ai",
        action="store_true",
        help="Include real AI model tests (Bi-Encoder + Cross-Encoder). Loads model weights into RAM.",
    )
    parser.add_argument(
        "-v",
        "--verbosity",
        type=int,
        default=2,
        help="Unittest output verbosity (1=quiet, 2=verbose, default: 2).",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_arguments()

    if args.ai:
        os.environ["RUN_AI_TESTS"] = "1"
        print("[INFO] AI model testing enabled (RUN_AI_TESTS=1).")
    else:
        os.environ.pop("RUN_AI_TESTS", None)

    print("=" * 70)
    print("PDF ACKNOWLEDGMENT PIPELINE - TEST RUNNER")
    print(f"Target test directory: {TESTS_DIR}")
    print("=" * 70, flush=True)

    loader = unittest.TestLoader()
    suite = loader.discover(
        start_dir=str(TESTS_DIR),
        pattern="test_*.py",
        top_level_dir=str(TESTS_DIR),
    )

    runner = unittest.TextTestRunner(verbosity=args.verbosity)
    result = runner.run(suite)

    print("=" * 70)
    if result.wasSuccessful():
        print(f"SUCCESS: Ran {result.testsRun} tests ({len(result.skipped)} skipped). All passed!")
        print("=" * 70)
        return 0

    print(f"FAILURE: Ran {result.testsRun} tests. Failures={len(result.failures)}, Errors={len(result.errors)}")
    print("=" * 70)
    return 1


if __name__ == "__main__":
    sys.exit(main())
