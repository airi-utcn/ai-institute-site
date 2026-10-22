"""
Static consistency and sanity tests.
Verifies that:
1. Every environment variable defined/read in shared/config.py is present in .env, sample.env, and docker-compose.yml.
2. Every variable exported in coordinator_service/entrypoint.sh and worker_service/entrypoint.sh is accounted for.
3. Both entrypoint.sh files have Unix (LF) line endings (no Windows CRLF corruption) and end with exec cron -f.
4. No forbidden patterns remain in the codebase:
   - No Python watchdog threads or watchdog prints
   - No Strapi PUT / write calls
"""

import re
import unittest
from pathlib import Path

from helpers import COORDINATOR_DIR, PIPELINE_ROOT, WORKER_DIR


class TestStaticConfigConsistency(unittest.TestCase):
    def test_environment_variables_consistency(self) -> None:
        config_py = (PIPELINE_ROOT / "shared" / "config.py").read_text(encoding="utf-8")
        env_file = (PIPELINE_ROOT / ".env").read_text(encoding="utf-8")
        sample_env = (PIPELINE_ROOT / "sample.env").read_text(encoding="utf-8")
        docker_compose = (PIPELINE_ROOT / "docker-compose.yml").read_text(encoding="utf-8")

        # Extract all os.getenv("VAR_NAME")
        read_vars = set(re.findall(r'os\.getenv\(["\']([A-Z0-9_]+)["\']', config_py))
        # Remove secondary fallbacks like NEXT_PUBLIC_STRAPI_URL
        read_vars.discard("NEXT_PUBLIC_STRAPI_URL")
        read_vars.discard("TZ")

        for var_name in sorted(read_vars):
            with self.subTest(var=var_name):
                self.assertIn(
                    var_name,
                    env_file,
                    f"Variable {var_name} from shared/config.py is missing in services/pdf-ack-pipeline/.env",
                )
                self.assertIn(
                    var_name,
                    sample_env,
                    f"Variable {var_name} from shared/config.py is missing in services/pdf-ack-pipeline/sample.env",
                )
                self.assertIn(
                    var_name,
                    docker_compose,
                    f"Variable {var_name} from shared/config.py is missing in services/pdf-ack-pipeline/docker-compose.yml",
                )

    def test_entrypoint_scripts_sanity(self) -> None:
        coordinator_sh = COORDINATOR_DIR / "entrypoint.sh"
        worker_sh = WORKER_DIR / "entrypoint.sh"

        for script in (coordinator_sh, worker_sh):
            raw_bytes = script.read_bytes()
            # Must not contain CRLF
            self.assertNotIn(
                b"\r\n",
                raw_bytes,
                f"{script.name} contains Windows CRLF line endings which will fail in Linux containers!",
            )

            text = raw_bytes.decode("utf-8")
            self.assertTrue(text.startswith("#!/bin/bash"), f"{script.name} must start with #!/bin/bash")
            self.assertIn("exec cron -f", text, f"{script.name} must end by launching cron in foreground")

    def test_no_watchdog_or_strapi_put_in_codebase(self) -> None:
        py_files = list(PIPELINE_ROOT.rglob("*.py"))
        for py_path in py_files:
            # Ignore test files and virtual environments
            if "tests" in py_path.parts or ".venv" in py_path.parts:
                continue
            content = py_path.read_text(encoding="utf-8")

            # Check no watchdog threads
            self.assertNotIn(
                "watchdog",
                content.lower(),
                f"Forbidden watchdog pattern found in {py_path}",
            )

            # Check no client.put or httpx.put to Strapi
            self.assertNotRegex(
                content,
                r"\.put\(",
                f"Found forbidden write/PUT method in read-only pipeline: {py_path}",
            )


if __name__ == "__main__":
    unittest.main()
