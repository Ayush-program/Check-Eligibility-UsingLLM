import os
import databases
import sqlalchemy
from sqlalchemy import Table, Column, Integer, String, Float, DateTime, JSON, Boolean
import datetime

# Use DATABASE_URL from environment — defaults to local SQLite for development.
# In production, set DATABASE_URL to a PostgreSQL connection string:
#   postgresql+asyncpg://user:password@host:5432/dbname
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./tender_eligibility.db")

# databases library needs aiosqlite for SQLite or asyncpg for PostgreSQL
# Adjust the sync engine URL for SQLAlchemy (strip +asyncpg if present for create_all)
_sync_db_url = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

database = databases.Database(DATABASE_URL)
metadata = sqlalchemy.MetaData()

extractions = Table(
    "extractions",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("filename", String(255)),
    Column("tender_data", JSON),
    Column("created_at", DateTime, default=datetime.datetime.utcnow),
)

eligibility_checks = Table(
    "eligibility_checks",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("tender_data", JSON),
    Column("company_data", JSON),
    Column("result", JSON),
    Column("created_at", DateTime, default=datetime.datetime.utcnow),
)

_engine_kwargs = {"connect_args": {"check_same_thread": False}} if "sqlite" in _sync_db_url else {}
engine = sqlalchemy.create_engine(_sync_db_url, **_engine_kwargs)
metadata.create_all(engine)

async def connect_db():
    await database.connect()

async def disconnect_db():
    await database.disconnect()