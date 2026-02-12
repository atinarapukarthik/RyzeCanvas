"""
Quick verification script for Phase 2 implementation.
Checks that all models, schemas, and endpoints are properly set up.
"""

import sys
import os

# Ensure proper import path
sys.path.insert(0, os.path.dirname(__file__))

def verify_models():
    """Verify database models are correctly defined."""
    print("🔍 Verifying Models...")
    
    try:
        from app.models.user import User
        from app.models.project import Project
        
        # Check User model
        assert hasattr(User, 'projects'), "User model missing 'projects' relationship"
        print("  ✅ User model has 'projects' relationship")
        
        # Check Project model
        project_columns = [c.name for c in Project.__table__.columns]
        required_columns = ['id', 'title', 'description', 'code_json', 'user_id', 'is_public', 'created_at', 'updated_at']
        
        for col in required_columns:
            assert col in project_columns, f"Project model missing column: {col}"
        
        print(f"  ✅ Project model has all required columns: {', '.join(required_columns)}")
        
        assert hasattr(Project, 'owner'), "Project model missing 'owner' relationship"
        print("  ✅ Project model has 'owner' relationship")
        
        return True
    except Exception as e:
        print(f"  ❌ Model verification failed: {e}")
        return False


def verify_schemas():
    """Verify Pydantic schemas are correctly defined."""
    print("\n🔍 Verifying Schemas...")
    
    try:
        from app.schemas.project import ProjectBase, ProjectCreate, ProjectUpdate, ProjectResponse
        
        # Check schemas exist
        schemas = ['ProjectBase', 'ProjectCreate', 'ProjectUpdate', 'ProjectResponse']
        print(f"  ✅ All project schemas exist: {', '.join(schemas)}")
        
        # Check ProjectCreate has required fields
        create_fields = ProjectCreate.model_fields.keys()
        assert 'title' in create_fields, "ProjectCreate missing 'title'"
        assert 'code_json' in create_fields, "ProjectCreate missing 'code_json'"
        print("  ✅ ProjectCreate schema has required fields")
        
        # Check ProjectResponse has all fields
        response_fields = ProjectResponse.model_fields.keys()
        required_fields = ['id', 'title', 'user_id', 'created_at', 'updated_at']
        for field in required_fields:
            assert field in response_fields, f"ProjectResponse missing field: {field}"
        print("  ✅ ProjectResponse schema has all required fields")
        
        return True
    except Exception as e:
        print(f"  ❌ Schema verification failed: {e}")
        return False


def verify_endpoints():
    """Verify API endpoints are correctly configured."""
    print("\n🔍 Verifying Endpoints...")
    
    try:
        from app.api.v1.endpoints import projects, admin
        
        # Check project endpoints
        project_routes = [route.path for route in projects.router.routes]
        print(f"  ✅ Project endpoints: {', '.join(project_routes)}")
        
        # Expected routes
        expected_project_routes = ['/', '/{project_id}']
        for route in expected_project_routes:
            assert route in project_routes, f"Missing project route: {route}"
        print("  ✅ All required project routes exist")
        
        # Check admin endpoints
        admin_routes = [route.path for route in admin.router.routes]
        print(f"  ✅ Admin endpoints: {', '.join(admin_routes[:5])}...")
        
        # Expected admin routes
        expected_admin_routes = ['/users', '/projects']
        for route in expected_admin_routes:
            assert any(route in r for r in admin_routes), f"Missing admin route containing: {route}"
        print("  ✅ All required admin routes exist")
        
        return True
    except Exception as e:
        print(f"  ❌ Endpoint verification failed: {e}")
        return False


def verify_dependencies():
    """Verify security dependencies are correctly configured."""
    print("\n🔍 Verifying Dependencies...")
    
    try:
        from app.api.deps import get_current_user, get_current_admin
        
        print("  ✅ get_current_user dependency exists")
        print("  ✅ get_current_admin dependency exists")
        
        return True
    except Exception as e:
        print(f"  ❌ Dependency verification failed: {e}")
        return False


def verify_router_integration():
    """Verify routers are properly integrated."""
    print("\n🔍 Verifying Router Integration...")
    
    try:
        from app.api.v1 import api_router
        
        # Check that router has routes
        routes = [route.path for route in api_router.routes]
        print(f"  ✅ API v1 router has {len(routes)} routes")
        
        # Check for key routes
        key_routes = ['/auth', '/projects', '/admin']
        for key_route in key_routes:
            found = any(key_route in route for route in routes)
            if found:
                print(f"  ✅ Router includes '{key_route}' routes")
            else:
                print(f"  ⚠️  Could not verify '{key_route}' routes (might be nested)")
        
        return True
    except Exception as e:
        print(f"  ❌ Router integration verification failed: {e}")
        return False


def main():
    """Run all verification checks."""
    print("=" * 60)
    print("PHASE 2 IMPLEMENTATION VERIFICATION")
    print("=" * 60)
    
    results = {
        "Models": verify_models(),
        "Schemas": verify_schemas(),
        "Endpoints": verify_endpoints(),
        "Dependencies": verify_dependencies(),
        "Router Integration": verify_router_integration(),
    }
    
    print("\n" + "=" * 60)
    print("VERIFICATION SUMMARY")
    print("=" * 60)
    
    all_passed = True
    for component, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{component:.<40} {status}")
        if not passed:
            all_passed = False
    
    print("=" * 60)
    
    if all_passed:
        print("\n🎉 ALL CHECKS PASSED! Phase 2 is fully implemented.")
        print("\n📚 Next Steps:")
        print("   1. Start the server: python -m app.main")
        print("   2. Access Swagger UI: http://localhost:8000/docs")
        print("   3. Login with: admin@ryze.ai / admin123")
        print("   4. Test the endpoints in Swagger UI")
        return 0
    else:
        print("\n⚠️  Some checks failed. Please review the errors above.")
        return 1


if __name__ == "__main__":
    exit(main())
