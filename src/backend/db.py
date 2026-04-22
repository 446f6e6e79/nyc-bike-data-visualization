import os
from contextlib import contextmanager
from psycopg2.pool import ThreadedConnectionPool

# Global connection pool variable, initialized by init_pool()
_pool: ThreadedConnectionPool | None = None 

def init_pool() -> None:
    """Initialise the global database connection pool."""
    global _pool
    # Initialize the connection pool with parameters from environment variables
    _pool = ThreadedConnectionPool(
        minconn=2,
        maxconn=10,
        dsn=os.environ["DATABASE_URL"],
    )


@contextmanager
def get_conn():
    """Get a database connection from the pool, yielding it for use, and ensuring it's returned to the pool afterwards."""
    assert _pool is not None, "DB pool not initialised — call init_pool() first"
    conn = _pool.getconn()
    try:
        yield conn
    finally:
        _pool.putconn(conn)
