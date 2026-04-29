"""Logging configuration and memory snapshot helpers for the seeding pipeline."""
import logging
import os
import resource
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


def log_memory(stage: str, **context) -> None:
    """Log current process RSS in MB at a named pipeline stage.

    ru_maxrss is in KB on Linux and bytes on macOS — normalise to MB.
    """
    max_rss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    rss_mb = max_rss / 1024 if sys.platform.startswith("linux") else max_rss / (1024 * 1024)
    extras = " ".join(f"{k}={v}" for k, v in context.items())
    logging.getLogger("memory").info(f"rss={rss_mb:.0f}MB stage={stage} {extras}".rstrip())
