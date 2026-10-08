#!/usr/bin/env python3
"""
SATMaster Relational Database Engine
====================================
Strict relational database management with foreign key constraints,
cascading deletes, UUID primary keys, and data isolation.
Connects directly to remote Supabase PostgreSQL via DATABASE_URL from .env,
with resilient fallback support for local SQLite.
"""

import os
import sys
import uuid
import sqlite3
import threading
from datetime import datetime
from contextlib import contextmanager
import time

try:
    import psycopg2
    from psycopg2 import pool
    from psycopg2.extras import RealDictCursor
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False


DEFAULT_SQLITE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "satmaster.db")


def load_env():
    """Load environment variables from .env file if present."""
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass

    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ.setdefault(key.strip(), val.strip())


def _format_row(row):
    """Normalize row dict: convert UUID and datetime to serializable strings."""
    if not row:
        return None
    d = dict(row)
    for k, v in d.items():
        if isinstance(v, uuid.UUID):
            d[k] = str(v)
        elif isinstance(v, datetime):
            d[k] = v.isoformat()
    return d


def _format_rows(rows):
    """Normalize a list of row dicts."""
    return [_format_row(r) for r in rows] if rows else []


DEFAULT_SUPABASE_URL = "postgresql://postgres.mzagstfpiiueiofoehhl:0000AAxx..88@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"


class RelationalDB:
    def __init__(self, db_url=None, db_path=None):
        load_env()
        self._pool = None
        self._pool_lock = threading.Lock()
        self._cache_lock = threading.Lock()
        self._groups_cache = None
        self._cache_ttl = 4.0  # In-memory read cache TTL in seconds

        # If first argument is actually a file path, treat as db_path
        if db_url and not db_path and not (db_url.startswith("postgresql://") or db_url.startswith("postgres://")):
            db_path = db_url
            db_url = None

        # If a local db_path is explicitly passed without db_url, use SQLite
        if db_path and not db_url:
            self.is_postgres = False
            self.db_url = None
            self.db_path = db_path
        else:
            raw_url = db_url or os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL") or DEFAULT_SUPABASE_URL
            # Check if Postgres is configured
            if raw_url and (raw_url.startswith("postgresql://") or raw_url.startswith("postgres://")):
                if not PSYCOPG2_AVAILABLE:
                    print("⚠️ Warning: PostgreSQL URL provided but psycopg2 is not installed. Falling back to SQLite.")
                    self.is_postgres = False
                    self.db_url = None
                    self.db_path = db_path or DEFAULT_SQLITE_PATH
                else:
                    self.is_postgres = True
                    self.db_url = raw_url
                    self.db_path = None
                    self._init_pool()
            else:
                self.is_postgres = False
                self.db_url = None
                self.db_path = db_path or DEFAULT_SQLITE_PATH

        self.init_db()

    def _init_pool(self):
        """Initialize persistent thread-safe PostgreSQL connection pool."""
        if not self.is_postgres or not PSYCOPG2_AVAILABLE:
            return
        with self._pool_lock:
            if self._pool is None:
                try:
                    self._pool = pool.ThreadedConnectionPool(
                        minconn=1,
                        maxconn=10,
                        dsn=self.db_url,
                        sslmode="require",
                        connect_timeout=10,
                        keepalives=1,
                        keepalives_idle=30,
                        keepalives_interval=10,
                        keepalives_count=5
                    )
                except Exception as e:
                    print(f"⚠️ Warning: Failed to initialize ThreadedConnectionPool: {e}")
                    self._pool = None

    def get_direct_connection(self):
        """Create a direct unpooled connection with retry on transient drops."""
        if not self.is_postgres:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA foreign_keys = ON;")
            return conn

        max_retries = 3
        for attempt in range(max_retries):
            try:
                conn = psycopg2.connect(
                    self.db_url,
                    sslmode="require",
                    connect_timeout=10,
                    keepalives=1,
                    keepalives_idle=30,
                    keepalives_interval=10,
                    keepalives_count=5
                )
                return conn
            except Exception as e:
                err_msg = str(e).lower()
                if any(w in err_msg for w in ["eof", "closed", "ssl", "timeout", "connection", "address"]) and attempt < max_retries - 1:
                    time.sleep(0.3)
                    continue
                raise

    def get_connection(self):
        """Public connection getter (backwards compatible)."""
        conn, _ = self._get_connection_from_pool()
        return conn

    def _get_connection_from_pool(self):
        """Borrow a connection from the pool, testing health and reconnecting if stale."""
        if not self.is_postgres:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA foreign_keys = ON;")
            return conn, False

        if self._pool is None:
            self._init_pool()

        if self._pool is not None:
            try:
                conn = self._pool.getconn()
                # If connection closed or broken, discard & fetch fresh
                if conn.closed != 0:
                    try:
                        self._pool.putconn(conn, close=True)
                    except Exception:
                        pass
                    conn = self._pool.getconn()

                # Fast ping to ensure connection wasn't dropped by pooler idle timeout
                try:
                    with conn.cursor() as cur:
                        cur.execute("SELECT 1;")
                except Exception:
                    # Stale connection dropped by Supabase pooler, reconnect
                    try:
                        self._pool.putconn(conn, close=True)
                    except Exception:
                        pass
                    conn = self._pool.getconn()

                return conn, True
            except Exception:
                # If pool fails or is exhausted, fall back to direct connection
                pass

        return self.get_direct_connection(), False

    def _return_connection(self, conn, is_pooled, is_bad=False):
        """Return connection to pool or close if direct or broken."""
        if not conn:
            return
        if not self.is_postgres or not is_pooled:
            try:
                conn.close()
            except Exception:
                pass
            return

        if self._pool is not None:
            try:
                self._pool.putconn(conn, close=is_bad)
            except Exception:
                try:
                    conn.close()
                except Exception:
                    pass

    def invalidate_cache(self):
        """Invalidate in-memory read cache on data mutations."""
        with self._cache_lock:
            self._groups_cache = None

    def close_pool(self):
        """Cleanly close all connections in pool."""
        with self._pool_lock:
            if self._pool is not None:
                try:
                    self._pool.closeall()
                except Exception:
                    pass
                self._pool = None

    @contextmanager
    def cursor(self):
        """Context manager yielding a dictionary cursor with pooled connection reuse."""
        conn = None
        is_pooled = False
        is_bad = False
        try:
            conn, is_pooled = self._get_connection_from_pool()
            if self.is_postgres:
                cur = conn.cursor(cursor_factory=RealDictCursor)
                yield cur
                conn.commit()
                cur.close()
            else:
                cur = conn.cursor()
                yield cur
                conn.commit()
                cur.close()
        except Exception:
            is_bad = True
            if conn:
                try:
                    conn.rollback()
                except Exception:
                    pass
            raise
        finally:
            if conn:
                self._return_connection(conn, is_pooled, is_bad=is_bad)

    def _query(self, sql):
        """Helper to convert SQL placeholders: %s for Postgres, ? for SQLite."""
        if not self.is_postgres:
            return sql.replace("%s", "?")
        return sql

    def init_db(self):
        """Initialize tables, foreign key constraints, and performance indexes."""
        if self.is_postgres:
            # PostgreSQL schema is managed via migrate_supabase.py / migrations
            return
        else:
            with self.cursor() as cur:
                cur.execute("""
                CREATE TABLE IF NOT EXISTS groups (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                );
                """)
                cur.execute("""
                CREATE TABLE IF NOT EXISTS students (
                    id TEXT PRIMARY KEY,
                    group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
                    telegram_id INTEGER NOT NULL UNIQUE,
                    telegram_username TEXT,
                    display_name TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                );
                """)
                cur.execute("""
                CREATE TABLE IF NOT EXISTS test_results (
                    id TEXT PRIMARY KEY,
                    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                    group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
                    total_score INTEGER NOT NULL,
                    rw_score INTEGER NOT NULL,
                    math_score INTEGER NOT NULL,
                    completed_at TEXT NOT NULL DEFAULT (datetime('now'))
                );
                """)
                cur.execute("CREATE INDEX IF NOT EXISTS idx_students_group_id ON students(group_id);")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_students_telegram_id ON students(telegram_id);")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_test_results_student_id ON test_results(student_id);")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_test_results_group_id ON test_results(group_id);")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_test_results_completed_at ON test_results(completed_at DESC);")

    # --------------------------------------------------------------------------
    # GROUPS API METHODS
    # --------------------------------------------------------------------------

    def list_groups(self, bypass_cache=False):
        """Return all groups with their isolated student count."""
        now = time.time()
        if not bypass_cache:
            with self._cache_lock:
                if self._groups_cache and (now - self._groups_cache.get("ts", 0) < self._cache_ttl):
                    return self._groups_cache["data"]

        sql = self._query("""
            SELECT 
                g.id,
                g.name,
                g.created_at,
                COUNT(s.id) AS student_count
            FROM groups g
            LEFT JOIN students s ON g.id = s.group_id
            GROUP BY g.id, g.name, g.created_at
            ORDER BY g.created_at ASC
        """)
        with self.cursor() as cur:
            cur.execute(sql)
            rows = cur.fetchall()
            formatted = _format_rows(rows)
            with self._cache_lock:
                self._groups_cache = {"data": formatted, "ts": now}
            return formatted

    def get_group(self, group_id):
        """Fetch a single group by id or name."""
        sql = self._query("""
            SELECT 
                g.id,
                g.name,
                g.created_at,
                COUNT(s.id) AS student_count
            FROM groups g
            LEFT JOIN students s ON g.id = s.group_id
            WHERE CAST(g.id AS TEXT) = %s OR LOWER(g.name) = LOWER(%s)
            GROUP BY g.id, g.name, g.created_at
        """)
        with self.cursor() as cur:
            cur.execute(sql, (str(group_id), str(group_id)))
            row = cur.fetchone()
            return _format_row(row)

    def create_group(self, name):
        """Create a new group with UUID primary key."""
        clean_name = (name or "").strip()
        if not clean_name:
            raise ValueError("Group name cannot be empty")

        existing = self.get_group(clean_name)
        if existing:
            return existing

        self.invalidate_cache()
        if self.is_postgres:
            sql = "INSERT INTO groups (name) VALUES (%s) RETURNING id, name, created_at"
            with self.cursor() as cur:
                cur.execute(sql, (clean_name,))
                row = _format_row(cur.fetchone())
                row["student_count"] = 0
                return row
        else:
            group_id = str(uuid.uuid4())
            created_at = datetime.utcnow().isoformat()
            sql = "INSERT INTO groups (id, name, created_at) VALUES (?, ?, ?)"
            with self.cursor() as cur:
                cur.execute(sql, (group_id, clean_name, created_at))
            return {
                "id": group_id,
                "name": clean_name,
                "created_at": created_at,
                "student_count": 0
            }

    def delete_group(self, group_id):
        """
        Delete group by UUID or name.
        Triggers CASCADE delete for all students and test records under this group.
        """
        self.invalidate_cache()
        sel_sql = self._query("SELECT id, name FROM groups WHERE CAST(id AS TEXT) = %s OR LOWER(name) = LOWER(%s)")
        del_sql = self._query("DELETE FROM groups WHERE CAST(id AS TEXT) = %s")

        with self.cursor() as cur:
            cur.execute(sel_sql, (str(group_id), str(group_id)))
            target = cur.fetchone()
            if not target:
                return None

            actual_id = str(target["id"])
            cur.execute(del_sql, (actual_id,))
            return _format_row(target)

    # --------------------------------------------------------------------------
    # STUDENTS API METHODS
    # --------------------------------------------------------------------------

    def get_group_students(self, group_id):
        """Return all students isolated to this specific group."""
        grp_sql = self._query("SELECT id, name FROM groups WHERE CAST(id AS TEXT) = %s OR LOWER(name) = LOWER(%s)")
        stu_sql = self._query("""
            SELECT 
                id,
                group_id,
                telegram_id,
                telegram_username,
                display_name,
                created_at
            FROM students
            WHERE CAST(group_id AS TEXT) = %s
            ORDER BY created_at ASC
        """)
        with self.cursor() as cur:
            cur.execute(grp_sql, (str(group_id), str(group_id)))
            grp = cur.fetchone()
            if not grp:
                return None

            actual_id = str(grp["id"])
            cur.execute(stu_sql, (actual_id,))
            rows = cur.fetchall()
            return _format_rows(rows)

    def get_student(self, student_id):
        """Fetch a single student by UUID or telegram_id (with optional TG/STU prefix)."""
        if not student_id:
            return None
        raw_id = str(student_id).strip()
        num_id = raw_id
        if raw_id.upper().startswith("TG"):
            num_id = raw_id[2:].strip()
        elif raw_id.upper().startswith("STU"):
            num_id = raw_id[3:].strip()

        sql = self._query("""
            SELECT s.*, g.name AS group_name
            FROM students s
            JOIN groups g ON s.group_id = g.id
            WHERE CAST(s.id AS TEXT) = %s 
               OR CAST(s.telegram_id AS TEXT) = %s 
               OR CAST(s.telegram_id AS TEXT) = %s
        """)
        with self.cursor() as cur:
            cur.execute(sql, (raw_id, raw_id, num_id))
            row = cur.fetchone()
            return _format_row(row)

    def upsert_student(self, telegram_id, display_name, group_id, telegram_username=None):
        """Register or update student in relational database linked to group_id."""
        self.invalidate_cache()
        clean_name = (display_name or "Student").strip()
        clean_username = (telegram_username or "").strip().lstrip("@") if telegram_username else None
        tg_id = int(telegram_id)

        if self.is_postgres:
            sql = """
                INSERT INTO students (group_id, telegram_id, telegram_username, display_name)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (telegram_id)
                DO UPDATE SET
                    display_name = EXCLUDED.display_name,
                    group_id = EXCLUDED.group_id,
                    telegram_username = EXCLUDED.telegram_username
                RETURNING id;
            """
            with self.cursor() as cur:
                cur.execute(sql, (str(group_id), tg_id, clean_username, clean_name))
                row = cur.fetchone()
                student_id = str(row["id"])
            return self.get_student(student_id)
        else:
            with self.cursor() as cur:
                cur.execute("SELECT id FROM students WHERE telegram_id = ?", (tg_id,))
                existing = cur.fetchone()
                if existing:
                    student_id = str(existing["id"])
                    cur.execute("""
                        UPDATE students
                        SET display_name = ?, group_id = ?, telegram_username = ?
                        WHERE id = ?
                    """, (clean_name, str(group_id), clean_username, student_id))
                else:
                    student_id = str(uuid.uuid4())
                    cur.execute("""
                        INSERT INTO students (id, group_id, telegram_id, telegram_username, display_name)
                        VALUES (?, ?, ?, ?, ?)
                    """, (student_id, str(group_id), tg_id, clean_username, clean_name))

            return self.get_student(student_id)

    def update_student_name(self, telegram_id, display_name):
        """Update display_name for an existing student by telegram_id, preserving group and telegram_username."""
        clean_name = (display_name or "").strip()
        if not clean_name:
            raise ValueError("Display name cannot be empty")

        sel_sql = self._query("SELECT id FROM students WHERE telegram_id = %s OR CAST(telegram_id AS TEXT) = %s")
        upd_sql = self._query("UPDATE students SET display_name = %s WHERE CAST(id AS TEXT) = %s")

        with self.cursor() as cur:
            cur.execute(sel_sql, (int(telegram_id), str(telegram_id)))
            row = cur.fetchone()
            if not row:
                return None

            actual_id = str(row["id"])
            cur.execute(upd_sql, (clean_name, actual_id))

        return self.get_student(actual_id)

    def delete_student(self, student_id):
        """
        Hard-delete student by UUID or telegram_id.
        Triggers CASCADE delete for all test_results under this student.
        """
        self.invalidate_cache()
        sel_sql = self._query("SELECT id, display_name, group_id, telegram_id FROM students WHERE CAST(id AS TEXT) = %s OR CAST(telegram_id AS TEXT) = %s")
        del_sql = self._query("DELETE FROM students WHERE CAST(id AS TEXT) = %s")

        with self.cursor() as cur:
            cur.execute(sel_sql, (str(student_id), str(student_id)))
            target = cur.fetchone()
            if not target:
                return None

            actual_id = str(target["id"])
            cur.execute(del_sql, (actual_id,))
            return _format_row(target)

    # --------------------------------------------------------------------------
    # TEST RESULTS API METHODS
    # --------------------------------------------------------------------------

    def record_test_result(self, student_id, group_id, total_score, rw_score=0, math_score=0):
        """Record a student test submission linked to student_id and group_id."""
        self.invalidate_cache()
        if self.is_postgres:
            sql = """
                INSERT INTO test_results (student_id, group_id, total_score, rw_score, math_score)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, student_id, group_id, total_score, rw_score, math_score, completed_at
            """
            with self.cursor() as cur:
                cur.execute(sql, (str(student_id), str(group_id), int(total_score), int(rw_score), int(math_score)))
                return _format_row(cur.fetchone())
        else:
            res_id = str(uuid.uuid4())
            completed_at = datetime.utcnow().isoformat()
            sql = """
                INSERT INTO test_results (id, student_id, group_id, total_score, rw_score, math_score, completed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """
            with self.cursor() as cur:
                cur.execute(sql, (res_id, str(student_id), str(group_id), int(total_score), int(rw_score), int(math_score), completed_at))
            return {
                "id": res_id,
                "student_id": str(student_id),
                "group_id": str(group_id),
                "total_score": int(total_score),
                "rw_score": int(rw_score),
                "math_score": int(math_score),
                "completed_at": completed_at
            }

    def get_student_history(self, student_id):
        """Return all past test attempts and unit scores for a specific student."""
        chk_sql = self._query("SELECT id FROM students WHERE CAST(id AS TEXT) = %s OR CAST(telegram_id AS TEXT) = %s")
        his_sql = self._query("""
            SELECT 
                id,
                student_id,
                group_id,
                total_score,
                rw_score,
                math_score,
                completed_at
            FROM test_results
            WHERE CAST(student_id AS TEXT) = %s
            ORDER BY completed_at DESC
        """)
        with self.cursor() as cur:
            cur.execute(chk_sql, (str(student_id), str(student_id)))
            student = cur.fetchone()
            if not student:
                return None

            actual_id = str(student["id"])
            cur.execute(his_sql, (actual_id,))
            rows = cur.fetchall()
            return _format_rows(rows)

    def sync_from_json_db(self, students_db_data):
        """Seed/sync groups from legacy JSON into relational structure."""
        groups = students_db_data.get("groups", [])
        for g in groups:
            g_name = g.get("name", "").strip()
            if not g_name:
                continue
            existing = self.get_group(g_name)
            if not existing:
                self.create_group(g_name)


# Global singleton database instance connected to Supabase PostgreSQL (via .env)
db = RelationalDB()
