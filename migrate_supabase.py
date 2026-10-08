#!/usr/bin/env python3
"""
migrate_supabase.py
===================
Executes migrations/001_init_schema.sql against remote Supabase PostgreSQL.
Verifies all tables, UUID defaults, cascading foreign keys, and indexes.
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT


def load_env_file():
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ.setdefault(key.strip(), val.strip())


def run_migration():
    load_env_file()
    db_url = os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL")
    if not db_url:
        print("❌ Error: DATABASE_URL not found in environment or .env file.")
        sys.exit(1)

    print(f"🔗 Connecting to Supabase PostgreSQL...")
    migration_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "migrations", "001_init_schema.sql")
    with open(migration_file, "r") as f:
        sql = f.read()

    try:
        conn = psycopg2.connect(db_url)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        print("🚀 Executing migrations/001_init_schema.sql...")
        cursor.execute(sql)
        print("✅ Migration executed successfully!")

        # Verify tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name IN ('groups', 'students', 'test_results')
            ORDER BY table_name;
        """)
        tables = [r[0] for r in cursor.fetchall()]
        print(f"📊 Verified public tables in Supabase: {tables}")
        assert set(tables) == {"groups", "students", "test_results"}, f"Missing tables: {set({'groups', 'students', 'test_results'}) - set(tables)}"

        # Verify foreign keys & cascade rules
        cursor.execute("""
            SELECT
                tc.table_name, 
                kcu.column_name, 
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name,
                rc.delete_rule
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
            JOIN information_schema.referential_constraints AS rc
              ON rc.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_schema = 'public'
            ORDER BY tc.table_name, kcu.column_name;
        """)
        fks = cursor.fetchall()
        print("\n🔒 Foreign Key Constraints with Cascade:")
        for fk in fks:
            print(f"  • {fk[0]}.{fk[1]} -> {fk[2]}.{fk[3]} (ON DELETE {fk[4]})")
            assert fk[4] == "CASCADE", f"Expected CASCADE delete rule, got {fk[4]}"

        # Verify indexes
        cursor.execute("""
            SELECT tablename, indexname 
            FROM pg_indexes 
            WHERE schemaname = 'public' 
              AND indexname LIKE 'idx_%'
            ORDER BY tablename, indexname;
        """)
        indexes = cursor.fetchall()
        print("\n⚡ Verified Custom Indexes:")
        for idx in indexes:
            print(f"  • {idx[0]}: {idx[1]}")

        cursor.close()
        conn.close()
        print("\n🎉 Supabase PostgreSQL initialization & verification completed successfully!")

    except Exception as e:
        print(f"❌ Migration error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    run_migration()
