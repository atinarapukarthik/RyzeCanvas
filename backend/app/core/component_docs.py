"""
Component Documentation for RAG System.
This provides detailed text descriptions of each UI component for the vector store.
"""

COMPONENT_DOCS = [
    # Button Component
    {
        "component": "Button",
        "description": """
Button Component - Interactive clickable button element.

USAGE:
- Use for primary actions, form submissions, navigation triggers.
- Always include 'label' prop with the button text.
- Common variants: 'primary', 'secondary', 'outline', 'ghost'.
- Sizes: 'small', 'medium', 'large'.

REQUIRED PROPS:
- label: The text displayed on the button (string)

OPTIONAL PROPS:
- variant: Visual style ('primary' | 'secondary' | 'outline' | 'ghost')
- size: Size of the button ('small' | 'medium' | 'large')
- onClick: Handler function name (string)
- disabled: Whether button is disabled (boolean)
- icon: Icon name to display (string)

EXAMPLES:
1. Primary submit button: { "label": "Submit", "variant": "primary" }
2. Secondary cancel button: { "label": "Cancel", "variant": "secondary" }
3. Icon button: { "label": "Save", "icon": "save", "variant": "primary" }
"""
    },
    
    # Card Component
    {
        "component": "Card",
        "description": """
Card Component - Container for grouped content with optional header and footer.

USAGE:
- Use for grouping related information (profiles, stats, content blocks).
- Always include 'title' prop for the card header.
- Can contain text, images, or nested components via 'children'.
- Variants: 'flat', 'elevated', 'outlined'.

REQUIRED PROPS:
- title: Header title for the card (string)

OPTIONAL PROPS:
- content: Main text content (string)
- footer: Footer text (string)
- image: Image URL for card header/background (string)
- variant: Visual style ('flat' | 'elevated' | 'outlined')

EXAMPLES:
1. Profile card: { "title": "User Profile", "content": "Member since 2024" }
2. Stats card: { "title": "Total Sales", "content": "$10,234", "variant": "elevated" }
3. Info card with image: { "title": "Product", "content": "Description", "image": "/product.jpg" }
"""
    },
    
    # Input Component
    {
        "component": "Input",
        "description": """
Input Component - Text input field for user data entry.

USAGE:
- Use for collecting text, email, password, numbers, phone numbers.
- Always include 'placeholder' prop to guide users.
- Set 'type' prop based on data: 'text', 'email', 'password', 'number', 'tel'.
- Include 'label' for accessibility.

REQUIRED PROPS:
- placeholder: Placeholder text shown when empty (string)

OPTIONAL PROPS:
- type: Input type ('text' | 'email' | 'password' | 'number' | 'tel')
- label: Label text above input (string)
- value: Default/controlled value (string)
- onChange: Handler function name (string)
- disabled: Whether input is disabled (boolean)
- error: Error message to display (string)

EXAMPLES:
1. Email input: { "placeholder": "Enter email", "type": "email", "label": "Email" }
2. Password input: { "placeholder": "Password", "type": "password", "label": "Password" }
3. Name input: { "placeholder": "Full name", "type": "text", "label": "Name" }
"""
    },
    
    # Table Component
    {
        "component": "Table",
        "description": """
Table Component - Structured data display in rows and columns.

USAGE:
- Use for displaying tabular data (user lists, reports, inventory).
- 'columns' defines header labels.
- 'data' is array of arrays representing rows.
- Enable 'striped' for alternating row colors, 'hoverable' for hover effects.

REQUIRED PROPS:
- columns: Array of column header names (array of strings)
- data: 2D array of row data (array of arrays)

OPTIONAL PROPS:
- striped: Alternate row background colors (boolean)
- hoverable: Highlight row on hover (boolean)
- bordered: Show borders around cells (boolean)

EXAMPLES:
1. User table:
   {
     "columns": ["Name", "Email", "Role"],
     "data": [
       ["John Doe", "john@example.com", "Admin"],
       ["Jane Smith", "jane@example.com", "User"]
     ],
     "striped": true,
     "hoverable": true
   }
"""
    },
    
    # Navbar Component
    {
        "component": "Navbar",
        "description": """
Navbar Component - Top navigation bar for application navigation.

USAGE:
- Use at the top of the canvas (y: 0) for main navigation.
- 'title' shows the application/brand name.
- 'items' array contains navigation link labels.
- Optionally include 'logo' image URL.

REQUIRED PROPS:
- title: Application/brand title (string)

OPTIONAL PROPS:
- items: Array of navigation link labels (array of strings)
- logo: Logo image URL (string)
- actions: Additional action items (array)

EXAMPLES:
1. Simple navbar:
   { "title": "My App", "items": ["Home", "About", "Contact"] }
2. With logo:
   { "title": "Dashboard", "logo": "/logo.png", "items": ["Overview", "Analytics"] }
"""
    },
    
    # Sidebar Component
    {
        "component": "Sidebar",
        "description": """
Sidebar Component - Vertical side navigation panel.

USAGE:
- Use on the left side of the canvas (x: 0) for dashboard navigation.
- 'items' array contains navigation items with labels, icons, and links.
- Set 'width' to control sidebar size (default 250px).
- Can be 'collapsed' for icon-only mode.

REQUIRED PROPS:
- items: Array of navigation items with label, icon, link (array of objects)

OPTIONAL PROPS:
- title: Sidebar header title (string)
- collapsed: Whether sidebar is collapsed to icons only (boolean)
- width: Width in pixels (number)

EXAMPLES:
1. Dashboard sidebar:
   {
     "items": [
       { "label": "Dashboard", "icon": "home", "link": "/dashboard" },
       { "label": "Projects", "icon": "folder", "link": "/projects" },
       { "label": "Settings", "icon": "settings", "link": "/settings" }
     ],
     "width": 250
   }
"""
    },
    
    # Chart Component
    {
        "component": "Chart",
        "description": """
Chart Component - Data visualization with various chart types.

USAGE:
- Use for displaying metrics, analytics, trends.
- 'type' determines chart visualization: 'bar', 'line', 'pie', 'donut', 'area'.
- 'data' contains data points with labels and values.
- Include 'title' for chart heading, 'xAxis'/'yAxis' for labels.

REQUIRED PROPS:
- type: Chart type ('bar' | 'line' | 'pie' | 'donut' | 'area')
- data: Array of data points with label and value (array of objects)

OPTIONAL PROPS:
- title: Chart title (string)
- xAxis: X-axis label (string)
- yAxis: Y-axis label (string)
- colors: Custom color array (array of strings)

EXAMPLES:
1. Bar chart:
   {
     "type": "bar",
     "data": [
       { "label": "Jan", "value": 30 },
       { "label": "Feb", "value": 45 },
       { "label": "Mar", "value": 60 }
     ],
     "title": "Monthly Sales",
     "xAxis": "Month",
     "yAxis": "Sales"
   }
2. Pie chart:
   {
     "type": "pie",
     "data": [
       { "label": "Product A", "value": 40 },
       { "label": "Product B", "value": 30 },
       { "label": "Product C", "value": 30 }
     ],
     "title": "Market Share"
   }
"""
    },
    
    # Text Component
    {
        "component": "Text",
        "description": """
Text Component - Typography element for headings and paragraphs.

USAGE:
- Use for all text content (headings, paragraphs, labels, captions).
- 'content' contains the actual text.
- 'variant' determines text style: 'heading1', 'heading2', 'heading3', 'paragraph', 'caption'.
- Set 'weight' for emphasis: 'normal', 'bold', 'light'.

REQUIRED PROPS:
- content: The text content to display (string)

OPTIONAL PROPS:
- variant: Text style ('heading1' | 'heading2' | 'heading3' | 'paragraph' | 'caption')
- size: Font size ('small' | 'medium' | 'large')
- weight: Font weight ('normal' | 'bold' | 'light')
- color: Text color (string)

EXAMPLES:
1. Page heading: { "content": "Welcome to Dashboard", "variant": "heading1", "weight": "bold" }
2. Body text: { "content": "This is a description.", "variant": "paragraph" }
3. Caption: { "content": "Last updated: 2024", "variant": "caption", "size": "small" }
"""
    },
    
    # Container Component
    {
        "component": "Container",
        "description": """
Container Component - Layout wrapper for grouping components.

USAGE:
- Use as a parent element to group and organize other components.
- Acts as a flex or grid container for layout.
- Use for sections, panels, or layout divisions.
- Contains nested components via 'children' property.

REQUIRED PROPS:
None - Container is flexible

OPTIONAL PROPS:
- layout: Layout type ('flex' | 'grid')
- direction: Flex direction ('row' | 'column')
- gap: Spacing between children (number)
- padding: Internal padding (string)
- background: Background color (string)

EXAMPLES:
1. Flex container:
   { "layout": "flex", "direction": "row", "gap": 20 }
2. Section container:
   { "padding": "24px", "background": "#f5f5f5" }
"""
    },
    
    # Form Component
    {
        "component": "Form",
        "description": """
Form Component - Complete form with multiple input fields and validation.

USAGE:
- Use for multi-field data collection (login, signup, contact, settings).
- 'fields' array defines all form inputs with name, type, label, required flag.
- 'submitLabel' customizes submit button text.
- Include 'title' for form heading.

REQUIRED PROPS:
- fields: Array of field objects with name, type, label, required (array of objects)

OPTIONAL PROPS:
- title: Form heading (string)
- submitLabel: Submit button text (string, default "Submit")
- onSubmit: Submit handler function name (string)

EXAMPLES:
1. Contact form:
   {
     "title": "Contact Us",
     "fields": [
       { "name": "name", "type": "text", "label": "Name", "required": true },
       { "name": "email", "type": "email", "label": "Email", "required": true },
       { "name": "message", "type": "textarea", "label": "Message", "required": false }
     ],
     "submitLabel": "Send Message"
   }
2. Login form:
   {
     "title": "Login",
     "fields": [
       { "name": "email", "type": "email", "label": "Email", "required": true },
       { "name": "password", "type": "password", "label": "Password", "required": true }
     ],
     "submitLabel": "Sign In"
   }
"""
    },
    
    # Select Component
    {
        "component": "Select",
        "description": """
Select Component - Dropdown selection input.

USAGE:
- Use for selecting from predefined options.
- 'options' array contains selectable values.
- Include 'label' for accessibility.
- Set 'multiple' to true for multi-select.

REQUIRED PROPS:
- options: Array of option values (array of strings)

OPTIONAL PROPS:
- label: Label text (string)
- placeholder: Placeholder when no selection (string)
- value: Default selected value (string or array)
- onChange: Change handler function (string)
- multiple: Allow multiple selections (boolean)

EXAMPLES:
1. Country select:
   {
     "label": "Select Country",
     "placeholder": "Choose...",
     "options": ["USA", "Canada", "UK", "Australia"]
   }
2. Multi-select:
   {
     "label": "Skills",
     "options": ["JavaScript", "Python", "React", "Node.js"],
     "multiple": true
   }
"""
    },
    
    # Image Component
    {
        "component": "Image",
        "description": """
Image Component - Display images with optional styling.

USAGE:
- Use for logos, avatars, illustrations, decorative images.
- 'src' is the image URL or path.
- 'alt' text for accessibility.
- Set 'width' and 'height' to control dimensions.

REQUIRED PROPS:
- src: Image source URL (string)
- alt: Alternative text description (string)

OPTIONAL PROPS:
- width: Image width in pixels (number)
- height: Image height in pixels (number)
- rounded: Apply rounded corners (boolean)
- objectFit: How image fits container ('cover' | 'contain' | 'fill')

EXAMPLES:
1. Logo: { "src": "/logo.png", "alt": "Logo", "width": 200, "height": 60 }
2. Avatar: { "src": "/avatar.jpg", "alt": "User", "width": 48, "height": 48, "rounded": true }
"""
    },
    
    # Checkbox Component
    {
        "component": "Checkbox",
        "description": """
Checkbox Component - Boolean selection input.

USAGE:
- Use for yes/no, on/off, true/false selections.
- Include 'label' to describe what the checkbox controls.
- Set 'checked' to pre-select the checkbox.

REQUIRED PROPS:
- label: Checkbox label text (string)

OPTIONAL PROPS:
- checked: Initial checked state (boolean)
- onChange: Change handler function (string)
- disabled: Whether checkbox is disabled (boolean)

EXAMPLES:
1. Accept terms: { "label": "I agree to terms and conditions", "checked": false }
2. Newsletter: { "label": "Subscribe to newsletter", "checked": true }
"""
    },
    
    # Radio Component
    {
        "component": "Radio",
        "description": """
Radio Component - Single selection from multiple options.

USAGE:
- Use when user must choose ONE option from a group.
- 'options' array contains the selectable choices.
- 'name' groups radio buttons together.
- 'label' describes the radio group.

REQUIRED PROPS:
- name: Group name for radio buttons (string)
- options: Array of option labels (array of strings)

OPTIONAL PROPS:
- label: Group label (string)
- value: Currently selected value (string)
- onChange: Change handler function (string)

EXAMPLES:
1. Payment method:
   {
     "name": "payment",
     "label": "Payment Method",
     "options": ["Credit Card", "PayPal", "Bank Transfer"],
     "value": "Credit Card"
   }
2. Theme selector:
   {
     "name": "theme",
     "label": "Choose Theme",
     "options": ["Light", "Dark", "Auto"]
   }
"""
    }
]


def get_all_docs() -> str:
    """Get all component documentation as a single concatenated string."""
    return "\n\n".join([doc["description"] for doc in COMPONENT_DOCS])


def get_doc_by_component(component_name: str) -> str:
    """Get documentation for a specific component."""
    for doc in COMPONENT_DOCS:
        if doc["component"] == component_name:
            return doc["description"]
    return f"No documentation found for component: {component_name}"


def get_docs_for_embedding():
    """Get component docs in a format suitable for embeddings (list of texts with metadata)."""
    return [
        {
            "text": doc["description"],
            "metadata": {"component": doc["component"]}
        }
        for doc in COMPONENT_DOCS
    ]
