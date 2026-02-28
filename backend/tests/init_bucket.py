import asyncio
import os
import sys

sys.path.append(os.getcwd())

async def init_bucket():
    from app.core.config import settings
    from app.core.supabase import supabase
    
    BUCKET = "workspace"
    print(f"Checking bucket '{BUCKET}'...")
    
    try:
        if not hasattr(supabase, 'storage'):
            print("Supabase client has no storage attribute?")
            return

        buckets = supabase.storage.list_buckets()
        exists = any(b.name == BUCKET for b in buckets)
        
        if exists:
            print(f"Bucket '{BUCKET}' exists.")
        else:
            print(f"Bucket '{BUCKET}' not found. Creating...")
            try:
                # Try with named options argument
                res = supabase.storage.create_bucket(BUCKET, options={"public": False})
                print(f"Created (Method 1): {res}")
            except Exception as e1:
                print(f"Method 1 failed: {e1}")
                try:
                    # Try with direct dict (just in case)
                    res = supabase.storage.create_bucket(BUCKET, {"public": False})
                    print(f"Created (Method 2): {res}")
                except Exception as e2:
                    print(f"Method 2 failed: {e2}")
                    # Try just name
                    res = supabase.storage.create_bucket(BUCKET)
                    print(f"Created (Method 3): {res}")
            
    except Exception as e:
        print(f"Error: {e}")
        if hasattr(e, 'message'):
             print(f"Message: {e.message}")
        if hasattr(e, 'response'):
             print(f"Response: {e.response}")

if __name__ == "__main__":
    asyncio.run(init_bucket())
