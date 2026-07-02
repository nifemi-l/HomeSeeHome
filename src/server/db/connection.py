from __future__ import annotations

import os
from threading import Lock

import psycopg2
from dotenv import load_dotenv
from flask import g, has_app_context
from psycopg2.pool import ThreadedConnectionPool

load_dotenv()

DB_HOST = os.environ["DB_HOST"]
DB_NAME = os.environ["DB_NAME"]
DB_USER = os.environ["DB_USER"]
DB_PASSWORD = os.environ["DB_PASSWORD"]
DB_PORT = int(os.environ.get("DB_PORT", "5432"))
DB_POOL_MIN = int(os.environ.get("DB_POOL_MIN", "1"))
DB_POOL_MAX = int(os.environ.get("DB_POOL_MAX", "10"))

_pool = None
_pool_lock = Lock()


def connect_to_db():
    """Create a standalone PostgreSQL connection."""
    return psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        port=DB_PORT,
    )


def _get_pool():
    global _pool
    if _pool is None:
        with _pool_lock:
            if _pool is None:
                _pool = ThreadedConnectionPool(
                    DB_POOL_MIN,
                    DB_POOL_MAX,
                    host=DB_HOST,
                    database=DB_NAME,
                    user=DB_USER,
                    password=DB_PASSWORD,
                    port=DB_PORT,
                )
    return _pool


def get_conn():
    """Return the current request connection, creating one from the pool if needed."""
    if not has_app_context():
        raise RuntimeError("get_conn() requires a Flask application context")

    conn = g.get("db_conn")
    if conn is None:
        conn = _get_pool().getconn()
        g.db_conn = conn
    return conn


def close_conn(error=None):
    """Commit or roll back the request connection, then return it to the pool."""
    if not has_app_context():
        return

    conn = g.pop("db_conn", None)
    if conn is None:
        return

    try:
        if error is not None:
            conn.rollback()
        else:
            conn.commit()
    finally:
        _get_pool().putconn(conn)
