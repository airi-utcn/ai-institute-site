"""
Unit tests for configuration loading and parsing in shared/config.py.
"""

import os
import unittest
from unittest.mock import patch

from shared.config import _parse_bool, _parse_csv, load_config


class TestConfig(unittest.TestCase):
    def test_parse_helpers(self) -> None:
        self.assertTrue(_parse_bool("true"))
        self.assertTrue(_parse_bool("1"))
        self.assertTrue(_parse_bool("YES"))
        self.assertTrue(_parse_bool("on"))
        self.assertFalse(_parse_bool("false"))
        self.assertFalse(_parse_bool("0"))
        self.assertFalse(_parse_bool(None, default=False))
        self.assertTrue(_parse_bool(None, default=True))

        self.assertEqual(_parse_csv("a, b, c"), ("a", "b", "c"))
        self.assertEqual(_parse_csv(""), ())
        self.assertEqual(_parse_csv(None), ())

    def test_load_config_env_overrides(self) -> None:
        overrides = {
            "RABBITMQ_HOST": "broker.internal",
            "RABBITMQ_PORT": "5673",
            "PUBLIC_STRAPI_URL": "https://strapi.example.com",
            "ACK_MAX_PAPERS_PER_RUN": "15",
            "WORKER_IDLE_EXIT_SECONDS": "45",
            "COMPUTE_SHA256_STREAM": "false",
            "AI_SLM_ENABLED": "false",
            "AI_SLM_MODEL": "Qwen/Qwen3.5-0.8B",
            "AI_SLM_MAX_NEW_TOKENS": "256",
            "AI_SLM_TEMPERATURE": "0.2",
        }
        with patch.dict(os.environ, overrides, clear=False):
            cfg = load_config()
            self.assertEqual(cfg.rabbitmq_host, "broker.internal")
            self.assertEqual(cfg.rabbitmq_port, 5673)
            self.assertEqual(cfg.public_strapi_url, "https://strapi.example.com")
            self.assertEqual(cfg.ack_max_papers_per_run, 15)
            self.assertEqual(cfg.worker_idle_exit_seconds, 45)
            self.assertFalse(cfg.compute_sha256_stream)
            self.assertFalse(cfg.ai_slm_enabled)
            self.assertEqual(cfg.ai_slm_model, "Qwen/Qwen3.5-0.8B")
            self.assertEqual(cfg.ai_slm_max_new_tokens, 256)
            self.assertAlmostEqual(cfg.ai_slm_temperature, 0.2)


if __name__ == "__main__":
    unittest.main()
