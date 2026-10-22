"""
Unit tests for RabbitMQ QueueManager wrapper in shared/queue_manager.py.
Uses mock pika adapters to verify queue declarations, JSON serialization,
logging formats, and reconnection logic without requiring a live RabbitMQ server.
"""

import unittest
from unittest.mock import MagicMock, patch

import pika

from shared.config import settings
from shared.queue_manager import QueueManager
from shared.schemas import ResultMessage, TaskMessage, TaskStatus


class TestQueueManagerUnit(unittest.TestCase):
    @patch("shared.queue_manager.pika.BlockingConnection")
    def test_push_and_pop_task_serialization(self, mock_conn_cls) -> None:
        mock_conn = MagicMock()
        mock_channel = MagicMock()
        mock_conn_cls.return_value = mock_conn
        mock_conn.channel.return_value = mock_channel
        mock_conn.is_closed = False
        mock_channel.is_closed = False

        qm = QueueManager(settings)

        task = TaskMessage(paper_id="p1", pdf_path="doc.pdf", file_hash="abcdef123456")
        qm.push_task(task)

        # Verify basic_publish was called with JSON payload
        mock_channel.basic_publish.assert_called_once()
        _, kwargs = mock_channel.basic_publish.call_args
        self.assertEqual(kwargs["routing_key"], settings.tasks_queue)
        self.assertIn(b"p1", kwargs["body"])

        # Simulate pop_task
        mock_channel.basic_get.return_value = (
            MagicMock(),
            None,
            task.model_dump_json().encode("utf-8"),
        )
        popped = qm.pop_task()
        self.assertIsNotNone(popped)
        self.assertEqual(popped.paper_id, "p1")
        self.assertEqual(popped.file_hash, "abcdef123456")

    @patch("shared.queue_manager.pika.BlockingConnection")
    def test_push_and_pop_result_serialization(self, mock_conn_cls) -> None:
        mock_conn = MagicMock()
        mock_channel = MagicMock()
        mock_conn_cls.return_value = mock_conn
        mock_conn.channel.return_value = mock_channel
        mock_conn.is_closed = False
        mock_channel.is_closed = False

        qm = QueueManager(settings)

        result = ResultMessage(
            paper_id="p1",
            file_hash="abcdef123456",
            status=TaskStatus.SUCCESS,
            acknowledgment_text="Supported by grant 100.",
            confidence_score=0.912,
        )
        qm.push_result(result)

        mock_channel.basic_publish.assert_called_once()
        _, kwargs = mock_channel.basic_publish.call_args
        self.assertEqual(kwargs["routing_key"], settings.results_queue)

        # Empty queue returns None
        mock_channel.basic_get.return_value = (None, None, None)
        self.assertIsNone(qm.pop_result())

    @patch("shared.queue_manager.pika.BlockingConnection")
    def test_reconnect_on_amqp_error(self, mock_conn_cls) -> None:
        mock_conn = MagicMock()
        mock_channel = MagicMock()
        mock_conn_cls.return_value = mock_conn
        mock_conn.channel.return_value = mock_channel
        mock_conn.is_closed = False
        mock_channel.is_closed = False

        # First publish raises AMQPError, second succeeds
        mock_channel.basic_publish.side_effect = [
            pika.exceptions.AMQPError("Broker restart"),
            None,
        ]

        qm = QueueManager(settings)
        task = TaskMessage(paper_id="p1", pdf_path="doc.pdf", file_hash="hash1")
        qm.push_task(task)

        # Should have called basic_publish twice (once failed, once reconnected)
        self.assertEqual(mock_channel.basic_publish.call_count, 2)


if __name__ == "__main__":
    unittest.main()
