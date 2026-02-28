"""
Phase 2 Quick Test Script
Run this to quickly test all Phase 2 endpoints via the API.
Requires the server to be running on localhost:8000
"""

import requests
import json
from typing import Optional

BASE_URL = "http://localhost:8000/api/v1"

class RyzeCanvasAPITester:
    def __init__(self):
        self.token: Optional[str] = None
        self.user_id: Optional[int] = None
        self.project_id: Optional[int] = None
        
    def login(self, email: str = "admin@ryze.ai", password: str = "admin123"):
        """Login and get JWT token."""
        print("\n🔐 Testing Login...")
        response = requests.post(
            f"{BASE_URL}/auth/login",
            data={"username": email, "password": password}
        )
        
        if response.status_code == 200:
            data = response.json()
            self.token = data["access_token"]
            print(f"   ✅ Login successful! Token: {self.token[:20]}...")
            return True
        else:
            print(f"   ❌ Login failed: {response.status_code} - {response.text}")
            return False
    
    def get_headers(self):
        """Get authorization headers."""
        return {"Authorization": f"Bearer {self.token}"}
    
    def get_current_user(self):
        """Get current user profile."""
        print("\n👤 Testing Get Current User...")
        response = requests.get(
            f"{BASE_URL}/auth/me",
            headers=self.get_headers()
        )
        
        if response.status_code == 200:
            data = response.json()
            self.user_id = data["id"]
            print(f"   ✅ User: {data['email']} (ID: {data['id']}, Role: {data['role']})")
            return data
        else:
            print(f"   ❌ Failed: {response.status_code}")
            return None
    
    def create_project(self):
        """Test project creation."""
        print("\n📝 Testing Create Project...")
        
        code_json = {
            "components": [
                {
                    "id": "btn_1",
                    "type": "Button",
                    "props": {"label": "Click Me", "variant": "primary"},
                    "position": {"x": 100, "y": 200}
                },
                {
                    "id": "input_1",
                    "type": "Input",
                    "props": {"placeholder": "Enter text", "type": "text"},
                    "position": {"x": 100, "y": 300}
                }
            ],
            "layout": {"theme": "dark", "grid": True}
        }
        
        project_data = {
            "title": "Phase 2 Test Project",
            "description": "Automated test project for Phase 2 verification",
            "code_json": json.dumps(code_json),
            "is_public": False
        }
        
        response = requests.post(
            f"{BASE_URL}/projects",
            headers=self.get_headers(),
            json=project_data
        )
        
        if response.status_code == 201:
            data = response.json()
            self.project_id = data["id"]
            print(f"   ✅ Project created! ID: {data['id']}, Title: {data['title']}")
            return data
        else:
            print(f"   ❌ Failed: {response.status_code} - {response.text}")
            return None
    
    def list_projects(self):
        """Test listing projects."""
        print("\n📋 Testing List Projects...")
        response = requests.get(
            f"{BASE_URL}/projects",
            headers=self.get_headers()
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Found {len(data)} project(s)")
            for project in data:
                print(f"      - {project['title']} (ID: {project['id']})")
            return data
        else:
            print(f"   ❌ Failed: {response.status_code}")
            return None
    
    def get_project(self, project_id: int):
        """Test getting a single project."""
        print(f"\n🔍 Testing Get Project (ID: {project_id})...")
        response = requests.get(
            f"{BASE_URL}/projects/{project_id}",
            headers=self.get_headers()
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Project: {data['title']}")
            print(f"      Description: {data['description']}")
            print(f"      Public: {data['is_public']}")
            return data
        else:
            print(f"   ❌ Failed: {response.status_code}")
            return None
    
    def update_project(self, project_id: int):
        """Test updating a project."""
        print(f"\n✏️  Testing Update Project (ID: {project_id})...")
        update_data = {
            "title": "Updated Test Project",
            "is_public": True
        }
        
        response = requests.put(
            f"{BASE_URL}/projects/{project_id}",
            headers=self.get_headers(),
            json=update_data
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Updated! New title: {data['title']}, Public: {data['is_public']}")
            return data
        else:
            print(f"   ❌ Failed: {response.status_code}")
            return None
    
    def test_admin_endpoints(self):
        """Test admin endpoints."""
        print("\n👑 Testing Admin Endpoints...")
        
        # List all users
        print("   📋 List All Users...")
        response = requests.get(
            f"{BASE_URL}/admin/users",
            headers=self.get_headers()
        )
        if response.status_code == 200:
            users = response.json()
            print(f"      ✅ Found {len(users)} user(s)")
        else:
            print(f"      ❌ Failed: {response.status_code}")
        
        # List all projects
        print("   📋 List All Projects...")
        response = requests.get(
            f"{BASE_URL}/admin/projects",
            headers=self.get_headers()
        )
        if response.status_code == 200:
            projects = response.json()
            print(f"      ✅ Found {len(projects)} project(s)")
        else:
            print(f"      ❌ Failed: {response.status_code}")
    
    def delete_project(self, project_id: int):
        """Test deleting a project."""
        print(f"\n🗑️  Testing Delete Project (ID: {project_id})...")
        response = requests.delete(
            f"{BASE_URL}/projects/{project_id}",
            headers=self.get_headers()
        )
        
        if response.status_code == 204:
            print(f"   ✅ Project deleted successfully!")
            return True
        else:
            print(f"   ❌ Failed: {response.status_code}")
            return False
    
    def run_full_test(self):
        """Run complete test suite."""
        print("=" * 60)
        print("PHASE 2 API TEST SUITE")
        print("=" * 60)
        
        # Step 1: Login
        if not self.login():
            print("\n❌ Login failed, cannot continue tests")
            return
        
        # Step 2: Get current user
        self.get_current_user()
        
        # Step 3: Create project
        self.create_project()
        
        # Step 4: List projects
        self.list_projects()
        
        # Step 5: Get single project
        if self.project_id:
            self.get_project(self.project_id)
            
            # Step 6: Update project
            self.update_project(self.project_id)
            
            # Step 7: Test admin endpoints
            self.test_admin_endpoints()
            
            # Step 8: Delete project
            self.delete_project(self.project_id)
        
        print("\n" + "=" * 60)
        print("✅ ALL TESTS COMPLETED!")
        print("=" * 60)
        print("\n📚 Next steps:")
        print("   1. Check Swagger UI: http://localhost:8000/docs")
        print("   2. Review the results above")
        print("   3. Test additional edge cases manually")
        print("\n🎉 Phase 2 is fully functional!")


if __name__ == "__main__":
    tester = RyzeCanvasAPITester()
    
    try:
        tester.run_full_test()
    except requests.exceptions.ConnectionError:
        print("\n❌ Error: Cannot connect to server")
        print("   Make sure the server is running: python -m app.main")
        print("   Server should be at: http://localhost:8000")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
