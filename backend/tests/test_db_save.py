import os
import sys
import json

# Add current directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.supabase import supabase_admin, supabase

def check():
    client = supabase_admin or supabase
    if not client:
        print("No supabase client configured.")
        return
        
    print("Fetching recent projects from Supabase...")
    res = client.table("projects").select("id, name, updated_at, code_json").order("created_at", desc=True).limit(3).execute()
    
    if not res.data:
        print("No projects found.")
        return
        
    for proj in res.data:
        print(f"Project ID: {proj.get('id')}")
        print(f"Name: {proj.get('name')}")
        print(f"Updated: {proj.get('updated_at')}")
        code = proj.get('code_json')
        if code:
            try:
                parsed = json.loads(code)
                if isinstance(parsed, dict):
                    print(f"✅ SUCCESS: Multiple files saved ({len(parsed)} files found)!")
                    for k in list(parsed.keys())[:5]:
                        print(f"  - {k}: {len(parsed[k])} chars")
                    if len(parsed) > 5:
                        print(f"  ... and {len(parsed) - 5} more files")
                else:
                    print(f"Code size (JSON non-dict): {len(code)} characters")
            except:
                if code.strip() == "// Generated code":
                    print("⚠️ Status: Only default '// Generated code' placeholder.")
                else:
                    print(f"Status: Legacy plain-text code stored ({len(code)} characters).")
        else:
            print("❌ Status: Empty Code JSON")
        print("-" * 40)

if __name__ == "__main__":
    check()
