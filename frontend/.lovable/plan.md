
# RyzeCanvas — AI UI Generator & Admin SaaS

## 1. Foundation & Architecture
- **Theme**: Dark mode by default with Slate/Zinc palette and purple/indigo accents, glassmorphism effects on cards and panels
- **State**: Zustand for auth (`authStore`) and UI state (`uiStore`), React Query for all API/server state
- **API Layer** (`src/lib/api.ts`): Fully typed mock async functions with simulated delays — `login`, `fetchProjects`, `createProject`, `adminFetchUsers`, `adminDeleteUser`, `fetchHistory`. All exportable for easy backend swap later

## 2. Authentication & Routing
- **Login Page** (`/login`): Centered card with email/password fields and a "Simulate Role" toggle (Admin vs User) for demo purposes
- **Protected Layout**: Collapsible sidebar with links — Studio, History, Settings. "Admin Dashboard" link visible only for admin role users
- **Route Guard**: Redirects unauthenticated users to `/login`

## 3. The Studio (`/studio`)
- **Split-screen layout** inspired by Claude Artifacts, stacks vertically on mobile
- **Left Panel — Chat**: Scrollable chat history, "AI is planning UI..." thinking state indicator, input box with Attach icon and Send button
- **Right Panel — Preview/Code**: 
  - Tabs for Preview (placeholder canvas) and Code (prismjs syntax-highlighted, read-only)
  - Toolbar with Copy Code, Fork, and Deploy buttons
- Mock AI responses returned after simulated delay

## 4. History Page (`/history`)
- List of past AI generations pulled from mock data
- Search and filter functionality
- Clicking an item reopens it in the Studio view

## 5. Settings Page (`/settings`)
- User profile display (name, email, avatar)
- Dark/Light theme toggle using the `uiStore`

## 6. Admin Dashboard (`/admin`)
- **Stats Row**: 3 cards — Total Users, Active Projects, Server Status
- **User Management Table**: Avatar, Name, Email, Role, Status columns with Edit (pencil) and Delete (trash) actions. Delete triggers a confirmation dialog then calls the mock API
- **Project Oversight**: Grid of recent AI generations across all users, each with a Flag button

## 7. UX Polish
- Toast notifications via `sonner` for all API success/error feedback
- Responsive design: sidebar collapses on mobile, studio split-screen stacks vertically
- Smooth transitions and glassmorphism styling throughout
