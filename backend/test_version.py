from app.core.config import settings
import json
import os

def test_version_consistency():
    """Verify backend version is consistent."""
    # Check version is defined in settings
    assert settings.VERSION is not None
    assert isinstance(settings.VERSION, str)
    
    # Check version format (simple semantic versioning check)
    parts = settings.VERSION.split('.')
    assert len(parts) >= 2, f"Version '{settings.VERSION}' should have at least major and minor parts"
    
    print(f"✅ Backend version: {settings.VERSION}")

def test_frontend_version_sync():
    """Verify backend and frontend versions are in sync if possible."""
    frontend_pkg_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'package.json')
    
    if os.path.exists(frontend_pkg_path):
        with open(frontend_pkg_path, 'r') as f:
            pkg_data = json.load(f)
            frontend_version = pkg_data.get('version')
            
            assert settings.VERSION == frontend_version, \
                f"Version mismatch: Backend is {settings.VERSION}, Frontend is {frontend_version}"
            print(f"✅ Versions are in sync: {settings.VERSION}")
    else:
        print("⚠️ Frontend package.json not found, skipping sync check")
