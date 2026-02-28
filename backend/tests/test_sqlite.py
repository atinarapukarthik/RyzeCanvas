import sqlite3
import json

def check():
    conn = sqlite3.connect("ryzecanvas.db")
    c = conn.cursor()
    c.execute("SELECT id, name, updated_at, code_json FROM projects ORDER BY created_at DESC LIMIT 3")
    rows = c.fetchall()
    if not rows:
        print("No projects found in local ryzecanvas.db")
        return
        
    for row in rows:
        pid, name, updated, code = row
        print(f"Project ID: {pid}")
        print(f"Name: {name}")
        print(f"Updated: {updated}")
        if code:
            try:
                parsed = json.loads(code)
                if isinstance(parsed, dict):
                    print(f"✅ SUCCESS: Multiple files saved ({len(parsed)} files found)!")
                else:
                    print(f"Code size (JSON non-dict): {len(code)} characters")
            except Exception:
                if code.strip() == "// Generated code":
                    print("⚠️ Status: Only default '// Generated code' placeholder.")
                else:
                    print(f"Status: Legacy plain-text code stored ({len(code)} characters).")
        else:
            print("❌ Status: Empty Code JSON")
        print("-" * 40)
    conn.close()

if __name__ == "__main__":
    check()
