# RyzeCanvas Preview System Update

## Overview
This document details the recent improvements made to the **Studio Preview System** in `src/app/(dashboard)/studio/page.tsx`. The goal was to resolve critical issues where clicking links in the preview iframe would cause the entire RyzeCanvas application to recursively load inside itself, and to ensure runtime errors are caught immediately.

## Key Improvements

### 1. Navigation Interception (Recursive Rendering Fix)
**Problem:**
The preview iframe uses `srcdoc` to render generated code. Browsers treat `srcdoc` iframes as having the same origin as the parent. Consequently, clicking a relative link like `<a href="/about">` would trigger a standard browser navigation event on the top-level window or within the iframe, causing the main RyzeCanvas app (which lives at `/`) to reload inside the preview pane.

**Solution:**
We injected a robust **Navigation Interceptor Script** directly into the `<head>` of the generated preview HTML.

**Mechanism:**
- **Global Event Listener:** A `click` listener is attached to the `window` object with `capture: true`.
- **Link Detection:** It intercepts all clicks on `<a>` tags.
- **Filtration:** It ignores hash links (`#`), empty links, and `javascript:` links.
- **Intervention:** For valid local links, it calls `e.preventDefault()` to stop the browser's native navigation.
- **Communication:** It sends a `postMessage` of type `preview-navigation` to the parent window with the requested path.

```javascript
// Simplifed Logic
window.addEventListener('click', function(e) {
    const link = e.target.closest('a');
    if (link && isLocalLink(link)) {
        e.preventDefault(); // Stop the app from reloading
        window.parent.postMessage({
            type: 'preview-navigation',
            path: link.pathname
        }, '*');
    }
}, true);
```

### 2. Simulated Client-Side Routing
**Problem:**
The AI-generated code often assumes a router is present (e.g., `react-router`), but the preview is a static HTML render. It doesn't have a real router setup.

**Solution:**
The parent component (`StudioContent`) now acts as a "Virtual Router" for the preview.

**Mechanism:**
- **Listener:** The main React component listens for `preview-navigation` messages.
- **Path Resolution:** When a request for `/about` comes in, it searches the `allGeneratedFiles` map.
- **Fuzzy Matching:** It intelligently maps routes to files:
    - `/about` -> matches `src/pages/About.tsx`
    - `/contact` -> matches `src/components/Contact.tsx`
- **State Update:** If a match is found, it updates the `previewRoute` state, forcing the iframe to re-render with the content of the target file.

### 3. Early Error Detection
**Problem:**
Runtime errors occurring during the initial React render (e.g., "Dependency not found" or syntax errors in the generated code) were often missed because the error listeners were initializing too late (at the end of `<body>`).

**Solution:**
The error handling scripts were moved to the **`<head>`** section.

**Mechanism:**
- **Priority Execution:** By placing the script in `<head>`, we guarantee it runs before any body content or React scripts.
- **Global Handlers:**
    - `window.addEventListener('error', ...)`: Catches synchronous script errors and resource loading failures.
    - `window.addEventListener('unhandledrejection', ...)`: Catches async promise rejections.
- **Feedback Loop:** Errors are immediately posted to the parent, which displays a subtle error indicator or a "Fix with AI" modal to the user.

## Current Architecture

1.  **Generator:** `buildPreviewHtml` constructs a standalone HTML string.
2.  **Head Injection:**
    *   Tailwind CSS (CDN)
    *   React & ReactDOM (CDN)
    *   Babel Standalone (CDN)
    *   **Interceptor & Error Scripts (New)**
3.  **Body Injection:**
    *   `<div id="root"></div>`
    *   User's Generated Code (transpiled on-the-fly by Babel)
4.  **Sandbox:** The iframe runs with `sandbox="allow-scripts allow-same-origin"`.
    *   `allow-scripts`: Required for React.
    *   `allow-same-origin`: Required for the interceptor to safely access location properties and communicate via `postMessage`.

## Result
The preview now behaves like a **Single Page Application (SPA)**. Users can navigate between generated pages seamlessly without breaking the studio interface or triggering recursive loads.
