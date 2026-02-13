"""
D-HDC Validator (Determinism via Hierarchical Dynamic Constraints)
Provides strict validation to ensure 0% hallucination in AI-generated UI code.

This validator is PURE PYTHON (no LLM) and implements a 3-layer validation approach:
- Layer 1 (Structure): JSON structure validation
- Layer 2 (Semantic): Component type validation
- Layer 3 (Property): Component property validation
"""
from typing import Dict, Any, List, Tuple

from app.core.component_library import ALLOWED_COMPONENTS, COMPONENT_TEMPLATES


def validate_dhdc(code_json: Dict[str, Any]) -> Tuple[bool, str]:
    """
    D-HDC Validator: Validates AI-generated UI code with strict constraints.
    
    This function implements a hierarchical validation approach:
    1. Structure validation (JSON structure)
    2. Semantic validation (component types)
    3. Property validation (component properties)
    
    Args:
        code_json: The generated JSON from the AI agent
    
    Returns:
        Tuple of (is_valid: bool, error_message: str)
        If valid, error_message is empty string.
        If invalid, error_message contains detailed feedback.
    
    Example:
        >>> code = {"components": [...], "layout": {...}}
        >>> is_valid, error = validate_dhdc(code)
        >>> if not is_valid:
        ...     print(f"Validation failed: {error}")
    """
    errors: List[str] = []
    
    # ============================================================================
    # LAYER 1: STRUCTURE VALIDATION
    # ============================================================================
    # Check if JSON has required top-level keys
    
    if not isinstance(code_json, dict):
        return False, "Invalid JSON structure: Root must be an object/dictionary"
    
    if "components" not in code_json:
        errors.append("Layer 1 Error: Missing 'components' key in JSON")
    
    if "layout" not in code_json:
        errors.append("Layer 1 Error: Missing 'layout' key in JSON")
    
    # If critical structure is missing, stop here
    if errors:
        return False, "\n".join(errors)
    
    components = code_json.get("components", [])
    
    if not isinstance(components, list):
        return False, "Layer 1 Error: 'components' must be an array/list"
    
    # ============================================================================
    # LAYER 2: SEMANTIC VALIDATION (Component Types)
    # ============================================================================
    # Check if each component type is in the ALLOWED_COMPONENTS list
    
    for i, component in enumerate(components):
        if not isinstance(component, dict):
            errors.append(f"Layer 2 Error: Component {i} is not an object")
            continue
        
        component_id = component.get("id", f"component_{i}")
        
        # Check required fields
        if "type" not in component:
            errors.append(
                f"Layer 2 Error: Component '{component_id}' is missing 'type' field"
            )
            continue
        
        component_type = component["type"]
        
        # STRICT CHECK: Component type must be in allowed list
        if component_type not in ALLOWED_COMPONENTS:
            errors.append(
                f"Layer 2 Error: Component '{component_id}' has invalid type '{component_type}'. "
                f"'{component_type}' is not allowed. "
                f"Allowed types are: {', '.join(ALLOWED_COMPONENTS)}. "
                f"Hint: If you need a hero section or header, use 'Card' or 'Container' instead."
            )
        
        # Check for required structural fields
        if "props" not in component:
            errors.append(
                f"Layer 2 Error: Component '{component_id}' is missing 'props' field"
            )
        
        if "position" not in component:
            errors.append(
                f"Layer 2 Error: Component '{component_id}' is missing 'position' field"
            )
        elif not isinstance(component["position"], dict):
            errors.append(
                f"Layer 2 Error: Component '{component_id}' has invalid 'position' (must be an object)"
            )
        else:
            position = component["position"]
            if "x" not in position:
                errors.append(
                    f"Layer 2 Error: Component '{component_id}' position is missing 'x' coordinate"
                )
            if "y" not in position:
                errors.append(
                    f"Layer 2 Error: Component '{component_id}' position is missing 'y' coordinate"
                )
    
    # ============================================================================
    # LAYER 3: PROPERTY VALIDATION
    # ============================================================================
    # Check if component props match the allowed properties for that component type
    
    for i, component in enumerate(components):
        if not isinstance(component, dict):
            continue  # Already reported in Layer 2
        
        component_id = component.get("id", f"component_{i}")
        component_type = component.get("type")
        
        # Skip if type is invalid (already reported in Layer 2)
        if not component_type or component_type not in ALLOWED_COMPONENTS:
            continue
        
        # Get the template for this component type
        template = COMPONENT_TEMPLATES.get(component_type)
        
        if not template:
            # This component doesn't have a strict template, skip property validation
            continue
        
        # Get allowed props
        required_props = template.get("required_props", [])
        optional_props = template.get("optional_props", [])
        allowed_props_set = set(required_props + optional_props)
        
        # Get actual props from component
        component_props = component.get("props", {})
        
        if not isinstance(component_props, dict):
            errors.append(
                f"Layer 3 Error: Component '{component_id}' has invalid 'props' (must be an object)"
            )
            continue
        
        # Check required props are present
        for required_prop in required_props:
            if required_prop not in component_props:
                errors.append(
                    f"Layer 3 Error: Component '{component_id}' ({component_type}) is missing required prop '{required_prop}'. "
                    f"Required props: {', '.join(required_props)}"
                )
        
        # Check for disallowed props (hallucinated properties)
        for prop_name in component_props.keys():
            if prop_name not in allowed_props_set:
                errors.append(
                    f"Layer 3 Error: Component '{component_id}' ({component_type}) has invalid prop '{prop_name}'. "
                    f"'{component_type}' does not accept '{prop_name}'. "
                    f"Allowed props: {', '.join(sorted(allowed_props_set))}. "
                    f"Hint: Check the component template for valid properties."
                )
    
    # ============================================================================
    # FINAL RESULT
    # ============================================================================
    
    if errors:
        error_report = "\n".join([f"  - {error}" for error in errors])
        return False, f"D-HDC Validation Failed:\n{error_report}"
    
    return True, ""


def validate_component_structure(component: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Validate a single component's structure.
    
    Args:
        component: Component dictionary
    
    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    errors = []
    
    required_fields = ["id", "type", "props", "position"]
    
    for field in required_fields:
        if field not in component:
            errors.append(f"Missing required field: {field}")
    
    # Validate position structure
    if "position" in component:
        position = component["position"]
        if not isinstance(position, dict):
            errors.append("Position must be an object")
        else:
            if "x" not in position:
                errors.append("Position missing 'x' coordinate")
            if "y" not in position:
                errors.append("Position missing 'y' coordinate")
            
            # Validate coordinate types
            if "x" in position and not isinstance(position["x"], (int, float)):
                errors.append("Position 'x' must be a number")
            if "y" in position and not isinstance(position["y"], (int, float)):
                errors.append("Position 'y' must be a number")
    
    return len(errors) == 0, errors


def get_validation_hints(component_type: str) -> str:
    """
    Get helpful hints for fixing validation errors.
    
    Args:
        component_type: The component type that failed validation
    
    Returns:
        Human-readable hint string
    """
    hints = {
        "HeroSection": "Use 'Card' or 'Container' instead of 'HeroSection'",
        "Header": "Use 'Navbar' for top navigation or 'Container' for header sections",
        "Footer": "Use 'Container' for footer sections",
        "Section": "Use 'Container' for generic sections",
        "Div": "Use 'Container' instead of 'Div'",
        "Span": "Use 'Text' instead of 'Span'",
        "H1": "Use 'Text' with variant='heading1' instead of 'H1'",
        "H2": "Use 'Text' with variant='heading2' instead of 'H2'",
        "H3": "Use 'Text' with variant='heading3' instead of 'H3'",
        "P": "Use 'Text' with variant='paragraph' instead of 'P'",
        "Img": "Use 'Image' instead of 'Img'",
        "Avatar": "Use 'Image' with rounded=true for avatars",
        "Modal": "Use 'Card' for modal dialogs",
        "Dialog": "Use 'Card' for dialogs",
        "Alert": "Use 'Card' with appropriate styling for alerts",
    }
    
    return hints.get(component_type, f"'{component_type}' is not in the allowed component library")


# Example usage and testing
if __name__ == "__main__":
    # Test Case 1: Valid JSON
    valid_json = {
        "components": [
            {
                "id": "btn_1",
                "type": "Button",
                "props": {"label": "Click Me", "variant": "primary"},
                "position": {"x": 100, "y": 200}
            }
        ],
        "layout": {
            "theme": "light",
            "grid": True,
            "gridSize": 20
        }
    }
    
    is_valid, error = validate_dhdc(valid_json)
    print(f"Test 1 - Valid JSON: {is_valid}")
    if not is_valid:
        print(error)
    
    # Test Case 2: Invalid component type (hallucination)
    invalid_type_json = {
        "components": [
            {
                "id": "hero_1",
                "type": "HeroSection",  # INVALID - not in allowed list
                "props": {"title": "Welcome"},
                "position": {"x": 0, "y": 0}
            }
        ],
        "layout": {}
    }
    
    is_valid, error = validate_dhdc(invalid_type_json)
    print(f"\nTest 2 - Invalid Type: {is_valid}")
    if not is_valid:
        print(error)
    
    # Test Case 3: Invalid property (hallucination)
    invalid_prop_json = {
        "components": [
            {
                "id": "btn_1",
                "type": "Button",
                "props": {
                    "label": "Click",
                    "color": "red"  # INVALID - Button doesn't accept 'color'
                },
                "position": {"x": 100, "y": 200}
            }
        ],
        "layout": {}
    }
    
    is_valid, error = validate_dhdc(invalid_prop_json)
    print(f"\nTest 3 - Invalid Property: {is_valid}")
    if not is_valid:
        print(error)
    
    # Test Case 4: Missing required prop
    missing_prop_json = {
        "components": [
            {
                "id": "btn_1",
                "type": "Button",
                "props": {},  # Missing required 'label'
                "position": {"x": 100, "y": 200}
            }
        ],
        "layout": {}
    }
    
    is_valid, error = validate_dhdc(missing_prop_json)
    print(f"\nTest 4 - Missing Required Prop: {is_valid}")
    if not is_valid:
        print(error)
