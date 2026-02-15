import asyncio
import os
import sys

# Add the backend directory to sys.path
sys.path.append(os.getcwd())

async def test_supabase_api():
    try:
        from app.core.config import settings
        from app.core.supabase import supabase
        
        print(f"Testing Supabase API connection...")
        print(f"URL: {settings.SUPABASE_URL}")
        
        # Try to list users (or any table)
        response = supabase.table("users").select("count", count="exact").limit(1).execute()
        
        print("\n✅ SUPABASE API CONNECTION SUCCESSFUL!")
        print(f"User count in database: {response.count}")
        
    except Exception as e:
        print(f"\n❌ SUPABASE API CONNECTION FAILED!")
        print(f"Error details: {e}")
        # Print actual response error if it's from supabase-py
        if hasattr(e, 'message'):
            print(f"Message: {e.message}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(test_supabase_api())
