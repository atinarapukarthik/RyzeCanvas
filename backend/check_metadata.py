from app.db.base import Base
print(f"Registered tables: {Base.metadata.tables.keys()}")
