import os

os.environ.setdefault("ANTHROPIC_API_KEY", "test")
os.environ.setdefault("OUTLOOK_TENANT_ID", "tenant")
os.environ.setdefault("OUTLOOK_CLIENT_ID", "client")
os.environ.setdefault("OUTLOOK_CLIENT_SECRET", "secret")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://u:p@localhost:5432/db")
