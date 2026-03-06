from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    rabbitmq_host: str = "localhost"
    rabbitmq_port: int = 5672
    rabbitmq_username: str = "intellidocs"
    rabbitmq_password: str = "intellidocs_secret"
    rabbitmq_vhost: str = "intellidocs"

    exchange_name: str = "intellidocs.exchange"
    parse_queue: str = "intellidocs.parse.queue"
    result_queue: str = "intellidocs.parse.result.queue"
    parse_routing_key: str = "document.parse"
    result_routing_key: str = "document.parse.result"

    upload_dir: str = "/tmp/intellidocs/uploads"

    log_level: str = "INFO"

    model_config = {"env_file": ".env"}


settings = Settings()