"""Logging configuration and memory snapshot helpers for the seeding pipeline."""
import logging
import os
import sys


def configure_logging() -> None:
    """Configure root logger to stdout with timestamp + thread name + level."""
    level = os.getenv("LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        level=level,
        # Include timestamp, log level, and thread name in logs to help debug parallel processing issues
        format="%(asctime)s [%(levelname)s] [%(threadName)s] %(message)s",
        datefmt="%H:%M:%S",
        stream=sys.stdout,
        force=True,
    )