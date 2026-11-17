import logging
from typing import Optional

import pika
from pika.adapters.blocking_connection import BlockingChannel

from .config import PipelineConfig, settings
from .schemas import ResultMessage, TaskMessage

logger = logging.getLogger(__name__)


class QueueManager:
    """Manages RabbitMQ connections and message exchange across tasks_queue and results_queue."""

    def __init__(self, config: PipelineConfig = settings) -> None:
        self.config = config
        self._connection: Optional[pika.BlockingConnection] = None
        self._channel: Optional[BlockingChannel] = None

    def _get_channel(self) -> BlockingChannel:
        """Establishes or re-establishes connection and declares durable queues."""
        if self._connection is None or self._connection.is_closed:
            credentials = pika.PlainCredentials(
                self.config.rabbitmq_user,
                self.config.rabbitmq_password,
            )
            parameters = pika.ConnectionParameters(
                host=self.config.rabbitmq_host,
                port=self.config.rabbitmq_port,
                virtual_host=self.config.rabbitmq_vhost,
                credentials=credentials,
                heartbeat=600,
                blocked_connection_timeout=300,
            )
            self._connection = pika.BlockingConnection(parameters)
            self._channel = self._connection.channel()

            # Ensure both queues exist and survive broker restarts
            self._channel.queue_declare(queue=self.config.tasks_queue, durable=True)
            self._channel.queue_declare(queue=self.config.results_queue, durable=True)

        elif self._channel is None or self._channel.is_closed:
            self._channel = self._connection.channel()
            self._channel.queue_declare(queue=self.config.tasks_queue, durable=True)
            self._channel.queue_declare(queue=self.config.results_queue, durable=True)

        return self._channel

    def _publish(self, queue_name: str, payload_json: str) -> None:
        try:
            channel = self._get_channel()
            channel.basic_publish(
                exchange="",
                routing_key=queue_name,
                body=payload_json.encode("utf-8"),
                properties=pika.BasicProperties(
                    delivery_mode=pika.DeliveryMode.Persistent,
                    content_type="application/json",
                ),
            )
        except pika.exceptions.AMQPError:
            # Reconnect once if connection dropped while idle
            self.close()
            channel = self._get_channel()
            channel.basic_publish(
                exchange="",
                routing_key=queue_name,
                body=payload_json.encode("utf-8"),
                properties=pika.BasicProperties(
                    delivery_mode=pika.DeliveryMode.Persistent,
                    content_type="application/json",
                ),
            )

    def _consume_one(self, queue_name: str) -> Optional[str]:
        try:
            channel = self._get_channel()
            method_frame, _, body = channel.basic_get(queue=queue_name, auto_ack=True)
        except pika.exceptions.AMQPError:
            self.close()
            channel = self._get_channel()
            method_frame, _, body = channel.basic_get(queue=queue_name, auto_ack=True)

        if method_frame is None or body is None:
            return None
        return body.decode("utf-8")

    def push_task(self, task: TaskMessage) -> None:
        """Pushes a TaskMessage into tasks_queue (Queue 1)."""
        self._publish(self.config.tasks_queue, task.model_dump_json())
        logger.info(
            "[PRODUCE -> %s] paper_id='%s' | file='%s' | hash=%s...",
            self.config.tasks_queue,
            task.paper_id,
            task.pdf_path,
            task.file_hash[:12],
        )

    def pop_task(self) -> Optional[TaskMessage]:
        """Pops a single TaskMessage from tasks_queue (Queue 1), or returns None if empty."""
        raw_body = self._consume_one(self.config.tasks_queue)
        if raw_body is None:
            return None
        task = TaskMessage.model_validate_json(raw_body)
        logger.info(
            "[CONSUME <- %s] paper_id='%s' | file='%s' | hash=%s...",
            self.config.tasks_queue,
            task.paper_id,
            task.pdf_path,
            task.file_hash[:12],
        )
        return task

    def push_result(self, result: ResultMessage) -> None:
        """Pushes a ResultMessage into results_queue (Queue 2)."""
        self._publish(self.config.results_queue, result.model_dump_json())
        logger.info(
            "[PRODUCE -> %s] paper_id='%s' | status=%s | confidence=%s | hash=%s...",
            self.config.results_queue,
            result.paper_id,
            result.status.value,
            f"{result.confidence_score:.4f}" if result.confidence_score is not None else "None",
            result.file_hash[:12],
        )

    def pop_result(self) -> Optional[ResultMessage]:
        """Pops a single ResultMessage from results_queue (Queue 2), or returns None if empty."""
        raw_body = self._consume_one(self.config.results_queue)
        if raw_body is None:
            return None
        result = ResultMessage.model_validate_json(raw_body)
        logger.info(
            "[CONSUME <- %s] paper_id='%s' | status=%s | confidence=%s | hash=%s...",
            self.config.results_queue,
            result.paper_id,
            result.status.value,
            f"{result.confidence_score:.4f}" if result.confidence_score is not None else "None",
            result.file_hash[:12],
        )
        return result

    def close(self) -> None:
        """Cleanly closes the RabbitMQ channel and connection."""
        try:
            if self._channel and self._channel.is_open:
                self._channel.close()
        except Exception:
            pass
        try:
            if self._connection and self._connection.is_open:
                self._connection.close()
        except Exception:
            pass
        self._channel = None
        self._connection = None


# Default shared instance and module-level helper functions
_default_manager = QueueManager()


def push_task(task: TaskMessage) -> None:
    """Pushes a TaskMessage into tasks_queue (Queue 1)."""
    _default_manager.push_task(task)


def pop_task() -> Optional[TaskMessage]:
    """Pops a TaskMessage from tasks_queue (Queue 1), or returns None if the queue is empty."""
    return _default_manager.pop_task()


def push_result(result: ResultMessage) -> None:
    """Pushes a ResultMessage into results_queue (Queue 2)."""
    _default_manager.push_result(result)


def pop_result() -> Optional[ResultMessage]:
    """Pops a ResultMessage from results_queue (Queue 2), or returns None if the queue is empty."""
    return _default_manager.pop_result()
