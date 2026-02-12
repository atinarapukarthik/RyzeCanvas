# RyzeCanvas Backend API

Production-grade REST API with custom JWT authentication for RyzeCanvas.

## 🚀 Tech Stack

- **Framework**: FastAPI 0.109+
- **Database**: SQLAlchemy (Async) with SQLite (easily switch to PostgreSQL)
- **Authentication**: JWT with Python-JOSE + Bcrypt password hashing
- **Validation**: Pydantic v2

## 📁 Project Structure

```
backend/
├── app/
│   ├── core/           # Config, Security (JWT/Hashing), DB Init
│   ├── api/            # Route handlers (v1)
│   ├── db/             # Database session & Base
│   ├── models/         # SQLAlchemy Models
│   ├── schemas/        # Pydantic Schemas
│   └── main.py         # App entry point
├── .env                # Environment variables
└── requirements.txt
```

## 🛠️ Setup Instructions

### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv

# Activate on Windows
venv\Scripts\activate

# Activate on macOS/Linux
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

The `.env` file is already created. **Important**: Change the `SECRET_KEY` before production:

```env
SECRET_KEY=your-secret-key-here-change-in-production-min-32-chars
```

Generate a secure key:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 4. Run the Application

```bash
# From backend/ directory
python -m app.main
```

Or using uvicorn directly:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API**: http://localhost:8000
- **Docs**: http://localhost:8000/docs (Swagger UI)
- **ReDoc**: http://localhost:8000/redoc

## 🔑 Default Admin Credentials

On first run, a default admin user is automatically created:

- **Email**: `admin@ryze.ai`
- **Password**: `admin123`

⚠️ **Please change the password immediately after first login!**

## 📡 API Endpoints

### Authentication (`/api/v1/auth`)

#### 1. Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "full_name": "John Doe",
  "role": "user"
}
```

#### 2. Login
```http
POST /api/v1/auth/login
Content-Type: application/x-www-form-urlencoded

username=user@example.com&password=securepassword
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

#### 3. Get Current User
```http
GET /api/v1/auth/me
Authorization: Bearer <your_access_token>
```

## 🔐 Role-Based Access Control

The system supports two roles:
- **user**: Regular user access
- **admin**: Full administrative access

### Using Admin Dependency

```python
from app.api.deps import get_current_admin

@router.get("/admin-only")
async def admin_route(admin: User = Depends(get_current_admin)):
    # Only accessible by users with role="admin"
    return {"message": "Admin access granted"}
```

## 🌐 CORS Configuration

CORS is pre-configured for:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (Alternative frontend)

Modify `BACKEND_CORS_ORIGINS` in `.env` to add more origins.

## 🗄️ Database

### Current: SQLite (Development)

The app uses SQLite with async support (`aiosqlite`) for easy local development.

### Migrating to PostgreSQL (Production)

1. Install asyncpg:
```bash
pip install asyncpg
```

2. Update `.env`:
```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost/ryzecanvas
```

## 🧪 Testing with Swagger UI

1. Navigate to http://localhost:8000/docs
2. Click **"POST /api/v1/auth/login"**
3. Click **"Try it out"**
4. Enter credentials (use default admin or create a user)
5. Copy the `access_token` from the response
6. Click the **"Authorize"** button (top right)
7. Enter: `Bearer <your_access_token>`
8. Now you can test protected endpoints!

## 🔧 Development Tips

### Auto-reload on Changes
The server runs with `--reload` flag by default, so code changes trigger automatic restarts.

### Database Inspection
SQLite database is stored as `ryzecanvas.db` in the backend root. Use DB Browser for SQLite or similar tools to inspect.

### Logging
Set `echo=False` in `app/db/session.py` to reduce SQL query logs.

## 📝 Next Steps

- [ ] Add password reset functionality
- [ ] Implement refresh tokens
- [ ] Add rate limiting
- [ ] Create user management endpoints (admin only)
- [ ] Add email verification
- [ ] Implement audit logging

## 🤝 Integration with Frontend

Your frontend at `http://localhost:5173` can now:

1. **Register users** via `/api/v1/auth/register`
2. **Login** via `/api/v1/auth/login` to get JWT token
3. **Store token** in localStorage or sessionStorage
4. **Send token** with requests: `Authorization: Bearer <token>`
5. **Fetch user data** via `/api/v1/auth/me`

Example fetch:
```javascript
const response = await fetch('http://localhost:8000/api/v1/auth/me', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
const user = await response.json();
```

---

**Built with ❤️ for RyzeCanvas Internship Requirements**
