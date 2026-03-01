import json
import logging
import threading
import time

import pika
import pika.exceptions

from app.chunking import chunk_sections
from app.config import settings
from app.parsers import get_parser

logger = logging.getLogger(__name__)


class RabbitMQConsumer:
    def __init__(self) -> None:
        self._connection: pika.BlockingConnection | None = None
        self._channel: pika.adapters.blocking_connection.BlockingChannel | None = None
        self._stop_event = threading.Event()

    def _make_connection(self) -> pika.BlockingConnection:
        credentials = pika.PlainCredentials(
            settings.rabbitmq_username, settings.rabbitmq_password
        )
        params = pika.ConnectionParameters(
            host=settings.rabbitmq_host,
            port=settings.rabbitmq_port,
            virtual_host=settings.rabbitmq_vhost,
            credentials=credentials,
            heartbeat=600,
            blocked_connection_timeout=300,
        )
        return pika.BlockingConnection(params)

    def _on_message(
        self,
        ch: pika.adapters.blocking_connection.BlockingChannel,
        method: pika.spec.Basic.Deliver,
        properties: pika.spec.BasicProperties,
        body: bytes,
    ) -> None:
        document_id = "unknown"
        try:
            data = json.loads(body)
            document_id = data["documentId"]
            filename = data["filename"]
            file_type = data["fileType"]
            storage_path = data["storagePath"]

            logger.info("Processing document %s (%s)", document_id, filename)

            parser = get_parser(file_type)
            sections, total_pages = parser.parse(storage_path)
            chunks = chunk_sections(sections)

            result = {
                "documentId": document_id,
                "success": True,
                "errorMessage": None,
                "totalPages": total_pages,
                "chunks": chunks,
            }
            logger.info(
                "Document %s parsed successfully: %d chunks", document_id, len(chunks)
            )
        except Exception as exc:
            logger.exception("Failed to process document %s", document_id)
            result = {
                "documentId": document_id,
                "success": False,
                "errorMessage": str(exc),
                "totalPages": 0,
                "chunks": [],
            }

        ch.basic_publish(
            exchange=settings.exchange_name,
            routing_key=settings.result_routing_key,
            body=json.dumps(result, ensure_ascii=False),
            properties=pika.BasicProperties(
                content_type="application/json",
                delivery_mode=2,  # persistent
            ),
        )
        ch.basic_ack(delivery_tag=method.delivery_tag)

    def _consume_loop(self) -> None:
        while not self._stop_event.is_set():
            try:
                self._connection = self._make_connection()
                self._channel = self._connection.channel()
                self._channel.basic_qos(prefetch_count=1)
                self._channel.basic_consume(
                    queue=settings.parse_queue,
                    on_message_callback=self._on_message,
                )
                logger.info(
                    "Connected to RabbitMQ — consuming from %s", settings.parse_queue
                )
                self._channel.start_consuming()
            except pika.exceptions.AMQPConnectionError as exc:
                logger.warning("RabbitMQ connection error: %s — retrying in 5s", exc)
                time.sleep(5)
            except Exception as exc:
                logger.exception("Unexpected consumer error — retrying in 5s")
                time.sleep(5)

    def start(self) -> None:
        self._consume_loop()

    def stop(self) -> None:
        self._stop_event.set()
        if self._connection and self._connection.is_open:
            try:
                self._connection.add_callback_threadsafe(self._shutdown)
            except Exception:
                pass

    def _shutdown(self) -> None:
        if self._channel and self._channel.is_open:
            self._channel.stop_consuming()


def start_consumer_thread() -> RabbitMQConsumer:
    consumer = RabbitMQConsumer()
    thread = threading.Thread(target=consumer.start, daemon=True, name="rabbitmq-consumer")
    thread.start()
    return consumer
