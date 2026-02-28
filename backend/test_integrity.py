import os
import sys
from app.core import component_library

def test_project_structure():
    """Verify essential project files and directories exist."""
    base_dir = os.path.dirname(os.path.dirname(__file__))
    essential_paths = [
        'backend/app/main.py',
        'backend/app/core/config.py',
        'backend/app/models/user.py',
        'backend/app/models/project.py',
        'frontend/package.json',
        'docker-compose.yml',
        '.github/workflows/backend-ci.yml'
    ]
    
    for path in essential_paths:
        full_path = os.path.join(base_dir, path)
        assert os.path.exists(full_path), f"Essential file missing: {path}"
    
    print("✅ Project structure integrity check passed")

def test_component_library_integrity():
    """Verify component library is correctly configured."""
    assert len(component_library.ALLOWED_COMPONENTS) > 0
    assert 'Button' in component_library.ALLOWED_COMPONENTS
    assert 'Card' in component_library.ALLOWED_COMPONENTS
    
    # Check that each component has a template
    for comp_type in component_library.ALLOWED_COMPONENTS:
        # Some components might not have templates yet, but the core ones should
        if comp_type in ['Button', 'Card', 'Input']:
            template = component_library.get_component_template(comp_type)
            assert template is not None, f"Missing template for core component: {comp_type}"
            
    print("✅ Component library integrity check passed")

def test_database_models_integrity():
    """Verify database models are correctly defined."""
    from app.models.user import User
    from app.models.project import Project
    
    # Check User model has required attributes
    assert hasattr(User, 'email'), "User model missing 'email' column"
    assert hasattr(User, 'hashed_password'), "User model missing 'hashed_password' column"
    assert hasattr(User, 'projects'), "User model missing 'projects' relationship"
    
    # Check Project model has required attributes
    # Project uses 'name' column (title is mapped via API layer)
    assert hasattr(Project, 'name'), "Project model missing 'name' column"
    assert hasattr(Project, 'code_json'), "Project model missing 'code_json' column"
    assert hasattr(Project, 'owner'), "Project model missing 'owner' relationship"
    assert hasattr(Project, 'user_id'), "Project model missing 'user_id' foreign key"
    
    print("✅ Database models integrity check passed")
