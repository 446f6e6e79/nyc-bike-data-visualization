import os
from contextlib import contextmanager
from psycopg2.pool import ThreadedConnectionPool

_pool: ThreadedConnectionPool | None = None

def init_pool() -> None:
    global _pool
    _pool = ThreadedConnectionPool(
        minconn=2,
        maxconn=10,
        dsn=os.environ["DATABASE_URL"],
    )


@contextmanager
def get_conn():
    assert _pool is not None, "DB pool not initialised — call init_pool() first"
    conn = _pool.getconn()
    try:
        yield conn
    finally:
        _pool.putconn(conn)
