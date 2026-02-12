# RyzeCanvas Backend Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React/Next.js)                  │
│                      http://localhost:5173                       │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/JSON + JWT Token
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      FastAPI Application                         │
│                     http://localhost:8000                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐     │
│  │              CORS Middleware                            │     │
│  │  - Allows: localhost:5173, localhost:3000              │     │
│  └────────────────────────────────────────────────────────┘     │
│                             │                                     │
│  ┌────────────────────────────────────────────────────────┐     │
│  │            API Router (/api/v1)                         │     │
│  │  ┌──────────────────────────────────────────────┐      │     │
│  │  │  Auth Endpoints (/auth)                      │      │     │
│  │  │  - POST /register  → Create user             │      │     │
│  │  │  - POST /login     → Get JWT token           │      │     │
│  │  │  - GET  /me        → Get current user        │      │     │
│  │  └──────────────────────────────────────────────┘      │     │
│  └────────────────────────────────────────────────────────┘     │
│                             │                                     │
│  ┌────────────────────────────────────────────────────────┐     │
│  │         Dependencies (deps.py)                          │     │
│  │  - get_db()             → Database session             │     │
│  │  - get_current_user()   → JWT validation + User        │     │
│  │  - get_current_admin()  → Admin role check (403)       │     │
│  └────────────────────────────────────────────────────────┘     │
│                             │                                     │
│  ┌────────────────────────────────────────────────────────┐     │
│  │         Security (core/security.py)                     │     │
│  │  - get_password_hash()   → Bcrypt hashing              │     │
│  │  - verify_password()     → Bcrypt verification         │     │
│  │  - create_access_token() → JWT encoding                │     │
│  └────────────────────────────────────────────────────────┘     │
│                             │                                     │
│  ┌────────────────────────────────────────────────────────┐     │
│  │         Database Layer (SQLAlchemy Async)               │     │
│  │  - AsyncEngine                                          │     │
│  │  - AsyncSession                                         │     │
│  │  - User Model (ORM)                                     │     │
│  └────────────────────────────────────────────────────────┘     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    SQLite Database                               │
│                   ryzecanvas.db                                  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────┐        │
│  │              users Table                             │        │
│  ├─────────────────────────────────────────────────────┤        │
│  │  id               INTEGER PRIMARY KEY                │        │
│  │  email            STRING UNIQUE NOT NULL             │        │
│  │  hashed_password  STRING NOT NULL                    │        │
│  │  full_name        STRING NOT NULL                    │        │
│  │  role             STRING DEFAULT 'user'              │        │
│  │  is_active        BOOLEAN DEFAULT TRUE               │        │
│  │  created_at       DATETIME DEFAULT NOW()             │        │
│  └─────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

## Authentication Flow

### 1. User Registration
```
Client → POST /api/v1/auth/register
        ↓
     Validate email uniqueness
        ↓
     Hash password (bcrypt)
        ↓
     Create User in DB
        ↓
     Return User (without password)
```

### 2. User Login
```
Client → POST /api/v1/auth/login (username, password)
        ↓
     Fetch User by email
        ↓
     Verify password (bcrypt)
        ↓
     Create JWT token (sub: user.id, exp: 30min)
        ↓
     Return access_token
```

### 3. Protected Endpoint Access
```
Client → GET /api/v1/auth/me
Headers: Authorization: Bearer <token>
        ↓
     Extract token from header
        ↓
     Decode JWT & validate signature
        ↓
     Extract user_id from 'sub' claim
        ↓
     Fetch User from DB by id
        ↓
     Check user.is_active
        ↓
     Return User
```

### 4. Admin-Only Access
```
Client → GET /admin-endpoint
Headers: Authorization: Bearer <token>
        ↓
     get_current_user() → User object
        ↓
     get_current_admin() → Check user.role == 'admin'
        ↓
     If not admin → 403 Forbidden
        ↓
     If admin → Allow access
```

## Directory Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app + CORS + startup
│   │
│   ├── core/                      # Core utilities
│   │   ├── __init__.py
│   │   ├── config.py              # Settings from .env
│   │   ├── security.py            # JWT + Password hashing
│   │   └── init_db.py             # DB initialization script
│   │
│   ├── db/                        # Database layer
│   │   ├── __init__.py
│   │   └── session.py             # AsyncEngine + SessionLocal
│   │
│   ├── models/                    # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   └── user.py                # User model
│   │
│   ├── schemas/                   # Pydantic schemas
│   │   ├── __init__.py
│   │   ├── user.py                # UserCreate, UserResponse, etc.
│   │   └── token.py               # Token, TokenPayload
│   │
│   └── api/                       # API routes
│       ├── __init__.py
│       ├── deps.py                # Shared dependencies
│       └── v1/                    # API version 1
│           ├── __init__.py        # API router aggregation
│           └── endpoints/
│               ├── __init__.py
│               └── auth.py        # /register, /login, /me
│
├── .env                           # Environment variables
├── .gitignore
├── requirements.txt
├── README.md
├── start.bat                      # Windows quick start
└── start.sh                       # Unix/Linux quick start
```

## Key Technologies

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Framework** | FastAPI 0.109 | Modern async web framework |
| **Database ORM** | SQLAlchemy 2.0 (Async) | Async database operations |
| **DB Driver** | aiosqlite | SQLite async driver |
| **Password Hashing** | Passlib + Bcrypt | Secure password storage |
| **JWT** | Python-JOSE | Token encoding/decoding |
| **Validation** | Pydantic v2 | Request/response validation |
| **Server** | Uvicorn | ASGI server |

## Security Features

### ✅ Password Security
- **Bcrypt** hashing with automatic salt generation
- Passwords **never** stored in plain text
- Verify with constant-time comparison

### ✅ JWT Authentication
- HS256 algorithm (HMAC with SHA-256)
- Configurable expiration (default: 30 minutes)
- Stateless authentication (no session storage)
- Token includes user ID in 'sub' claim

### ✅ Role-Based Access Control (RBAC)
- Two roles: `user` and `admin`
- `get_current_admin()` dependency enforces admin access
- Returns 403 Forbidden if not admin

### ✅ Input Validation
- Email validation via Pydantic
- Strong typing on all endpoints
- Automatic request validation

### ✅ CORS Protection
- Whitelist-based origin validation
- Credentials support
- Configurable via environment

## Configuration

All configuration is managed via `.env`:

```env
# Application
PROJECT_NAME=RyzeCanvas
API_V1_STR=/api/v1

# Security (CHANGE IN PRODUCTION!)
SECRET_KEY=your-secret-key-here-change-in-production-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database
DATABASE_URL=sqlite+aiosqlite:///./ryzecanvas.db

# CORS
BACKEND_CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]
```

## Database Schema

### users Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY | Auto-increment user ID |
| `email` | STRING | UNIQUE, NOT NULL, INDEX | User email (login) |
| `hashed_password` | STRING | NOT NULL | Bcrypt hashed password |
| `full_name` | STRING | NOT NULL | User's full name |
| `role` | STRING | NOT NULL, DEFAULT='user' | User role (user/admin) |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT=TRUE | Account status |
| `created_at` | DATETIME | NOT NULL, DEFAULT=NOW() | Registration timestamp |

## API Response Examples

### Success Responses

#### Register User (201 Created)
```json
{
  "id": 2,
  "email": "john@example.com",
  "full_name": "John Doe",
  "role": "user",
  "is_active": true,
  "created_at": "2026-02-12T14:20:00"
}
```

#### Login (200 OK)
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjIsImV4cCI6MTcwNzc0NDgzMH0.xyz",
  "token_type": "bearer"
}
```

#### Get Current User (200 OK)
```json
{
  "id": 2,
  "email": "john@example.com",
  "full_name": "John Doe",
  "role": "user",
  "is_active": true,
  "created_at": "2026-02-12T14:20:00"
}
```

### Error Responses

#### Email Already Exists (400 Bad Request)
```json
{
  "detail": "Email already registered"
}
```

#### Invalid Credentials (401 Unauthorized)
```json
{
  "detail": "Incorrect email or password"
}
```

#### Invalid Token (401 Unauthorized)
```json
{
  "detail": "Could not validate credentials"
}
```

#### Not Admin (403 Forbidden)
```json
{
  "detail": "Not enough permissions. Admin access required."
}
```

## Migration Path to PostgreSQL

When ready for production, switch to PostgreSQL:

1. **Install asyncpg**:
   ```bash
   pip install asyncpg
   ```

2. **Update .env**:
   ```env
   DATABASE_URL=postgresql+asyncpg://user:pass@localhost/ryzecanvas
   ```

3. **No code changes needed** - SQLAlchemy handles it!

## Next Phase Features

- [ ] Password reset with email verification
- [ ] Refresh token mechanism
- [ ] Rate limiting per user/IP
- [ ] User management endpoints (admin only)
- [ ] Email verification on registration
- [ ] Audit logging for admin actions
- [ ] OAuth2 social login integration
- [ ] Two-factor authentication (2FA)

---

**Architecture designed for scalability, security, and maintainability.**
