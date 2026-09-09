from __future__ import annotations

import logging
import os
import time
from threading import Lock

import psycopg2
from dotenv import load_dotenv
from flask import g, has_app_context
from psycopg2.pool import ThreadedConnectionPool

load_dotenv()

logger = logging.getLogger(__name__)

DB_HOST = os.environ["DB_HOST"]
DB_NAME = os.environ["DB_NAME"]
DB_USER = os.environ["DB_USER"]
DB_PASSWORD = os.environ["DB_PASSWORD"]
DB_PORT = int(os.environ.get("DB_PORT", "5432"))
DB_POOL_MIN = int(os.environ.get("DB_POOL_MIN", "1"))
DB_POOL_MAX = int(os.environ.get("DB_POOL_MAX", "10"))

_CONNECT_TIMEOUT = 5

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
        connect_timeout=_CONNECT_TIMEOUT,
    )


def _get_pool():
    global _pool
    if _pool is None:
        with _pool_lock:
            if _pool is None:
                _pool = _create_pool()
    return _pool


def _create_pool(retries=2, base_delay=0.5):
    last_exc = None
    for attempt in range(retries):
        try:
            return ThreadedConnectionPool(
                DB_POOL_MIN,
                DB_POOL_MAX,
                host=DB_HOST,
                database=DB_NAME,
                user=DB_USER,
                password=DB_PASSWORD,
                port=DB_PORT,
                connect_timeout=_CONNECT_TIMEOUT,
            )
        except psycopg2.OperationalError as exc:
            last_exc = exc
            logger.warning("DB pool creation failed (attempt %d/%d): %s",
                           attempt + 1, retries, exc)
            if attempt < retries - 1:
                time.sleep(base_delay * (2 ** attempt))
    raise last_exc


def get_conn():
    """Return the current request connection, creating one from the pool if needed."""
    if not has_app_context():
        raise RuntimeError("get_conn() requires a Flask application context")

    conn = g.get("db_conn")
    if conn is None:
        try:
            conn = _get_pool().getconn()
        except psycopg2.OperationalError:
            _reset_pool()
            conn = _get_pool().getconn()
        g.db_conn = conn
    return conn


def _reset_pool():
    """Discard a broken pool so the next call creates a fresh one."""
    global _pool
    with _pool_lock:
        old = _pool
        _pool = None
    if old is not None:
        try:
            old.closeall()
        except Exception:
            pass


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
    except Exception:
        pass
    finally:
        try:
            _get_pool().putconn(conn)
        except Exception:
            try:
                conn.close()
            except Exception:
                pass
