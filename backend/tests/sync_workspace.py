import asyncio
import os
import sys
import mimetypes

# Add the backend directory to sys.path
sys.path.append(os.getcwd())

async def sync_to_supabase():
    try:
        from app.core.config import settings
        from app.core.supabase import supabase
        
        STORAGE_BUCKET = "workspace"
        LOCAL_WORKSPACE = os.path.abspath(os.path.join(os.getcwd(), "..", "workspace"))
        
        print(f"Syncing local workspace to Supabase bucket: {STORAGE_BUCKET}")
        print(f"Local source: {LOCAL_WORKSPACE}")
        
        if not os.path.exists(LOCAL_WORKSPACE):
            print("Local workspace not found.")
            return

        # Ensure bucket exists
        try:
             supabase.storage.get_bucket(STORAGE_BUCKET)
             print("Bucket exists.")
        except:
             print("Creating bucket...")
             try:
                supabase.storage.create_bucket(STORAGE_BUCKET, {"public": False})
             except Exception as e:
                print(f"Bucket creation warning: {e}")

        # Walk and upload
        count = 0
        for root, dirs, files in os.walk(LOCAL_WORKSPACE):
            for file in files:
                local_path = os.path.join(root, file)
                rel_path = os.path.relpath(local_path, LOCAL_WORKSPACE).replace("\\", "/") # Key
                
                # Skip node_modules and .git
                if "node_modules" in rel_path or ".git" in rel_path:
                    continue
                
                # Guess mime type
                content_type, _ = mimetypes.guess_type(local_path)
                if not content_type:
                    content_type = "text/plain"
                    
                print(f"Uploading: {rel_path}...")
                with open(local_path, "rb") as f:
                    content = f.read()
                    
                supabase.storage.from_(STORAGE_BUCKET).upload(
                    rel_path,
                    content,
                    file_options={"upsert": "true", "contentType": content_type}
                )
                count += 1
                
        print(f"\n✅ Sync complete! {count} files uploaded to Supabase.")
        
    except Exception as e:
        print(f"\n❌ Sync failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(sync_to_supabase())
