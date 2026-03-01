import logging
import logging.config
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI

from app.config import settings
from app.consumer import RabbitMQConsumer, start_consumer_thread

logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

_consumer: RabbitMQConsumer | None = None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    global _consumer
    logger.info("Starting RabbitMQ consumer thread...")
    _consumer = start_consumer_thread()
    yield
    logger.info("Stopping RabbitMQ consumer...")
    if _consumer:
        _consumer.stop()


app = FastAPI(
    title="IntelliDocs Parsing Service",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "parsing-service"}