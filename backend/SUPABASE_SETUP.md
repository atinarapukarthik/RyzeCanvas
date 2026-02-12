
# ⚡ Setting up Supabase Database

To switch your RyzeCanvas backend to use Supabase instead of the local SQLite database, follow these steps:

## 1. Get Your Supabase Connection String

1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Create a new project or select an existing one.
3. Go to **Project Settings** (gear icon) -> **Database**.
4. Under **Connection string**, make sure **URI** is selected.
5. Copy the connection string. It will look like this:
   `postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres`

## 2. Update .env File

1. Open `backend/.env`.
2. Locate the `DATABASE_URL` variable.
3. Update it to use the `postgresql+asyncpg` scheme.
   
   **Important**: You must change `postgresql://` to `postgresql+asyncpg://` to use the async driver.

   ```env
   DATABASE_URL=postgresql+asyncpg://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres
   ```
   *Replace `[YOUR-PASSWORD]` with your actual database password.*

## 3. Verify Dependencies

Everything is already installed!
- `asyncpg` (Async PostgreSQL driver)
- `psycopg2-binary` (Standard driver)

## 4. Run the Backend

Start the server as usual. The application will automatically create the necessary tables in your Supabase database on the first run.

```bash
# Windows
python -m app.main
```

## 5. Verify Setup

Check the logs for:
```
🚀 Starting RyzeCanvas Backend...
✅ Database initialized successfully!
🔑 Default admin user created...
```

If you see this, your Supabase integration is complete!
