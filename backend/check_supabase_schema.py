import asyncio
import os
import sys

# Add the backend directory to sys.path
sys.path.append(os.getcwd())

async def list_schema():
    try:
        from app.core.supabase import supabase
        
        print(f"Checking Supabase Schema...")
        
        # Test users table
        print("Checking 'users' table...")
        users_resp = supabase.table("users").select("*").limit(1).execute()
        print(f"Users found: {len(users_resp.data)}")
        
        # Test projects table
        print("\nChecking 'projects' table...")
        projects_resp = supabase.table("projects").select("*").limit(1).execute()
        print(f"Projects found: {len(projects_resp.data)}")
        
    except Exception as e:
        print(f"\n❌ FAILED!")
        print(f"Error details: {e}")
        if hasattr(e, 'json'):
            print(f"JSON Error: {e.json()}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(list_schema())
