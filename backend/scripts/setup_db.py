"""
Script para inicializar o banco de dados com as tabelas necessárias.
Execute: python scripts/setup_db.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


async def main():
    from app.db.database import create_tables
    from app.config import settings

    print(f"Conectando em: {settings.DATABASE_URL}")
    await create_tables()
    print("Tabelas criadas/verificadas com sucesso!")


if __name__ == "__main__":
    asyncio.run(main())
