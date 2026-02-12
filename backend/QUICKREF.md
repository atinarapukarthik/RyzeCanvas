# 🚀 RyzeCanvas Backend - Quick Reference

## ⚡ One-Line Start

```bash
cd backend && python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt && python -m app.main
```

## 🔑 Default Admin
```
Email: admin@ryze.ai
Password: admin123
```

## 📡 Endpoints

### Register
```bash
POST /api/v1/auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "User Name",
  "role": "user"  # or "admin"
}
```

### Login
```bash
POST /api/v1/auth/login
Form data:
  username=user@example.com
  password=password123

Response:
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer"
}
```

### Get Current User
```bash
GET /api/v1/auth/me
Headers:
  Authorization: Bearer <token>
```

## 🔐 Using Dependencies

### Require Authentication
```python
from app.api.deps import get_current_user
from app.models.user import User

@router.get("/protected")
async def protected_route(user: User = Depends(get_current_user)):
    return {"user_id": user.id, "email": user.email}
```

### Require Admin
```python
from app.api.deps import get_current_admin

@router.post("/admin-action")
async def admin_route(admin: User = Depends(get_current_admin)):
    # Only accessible by role="admin"
    return {"message": "Admin access granted"}
```

## 🗄️ Database Access

```python
from app.api.deps import get_db
from sqlalchemy.ext.asyncio import AsyncSession

@router.get("/users")
async def list_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User))
    users = result.scalars().all()
    return users
```

## 🔧 Environment Variables

```env
SECRET_KEY=your-secret-key-min-32-chars
DATABASE_URL=sqlite+aiosqlite:///./ryzecanvas.db
ACCESS_TOKEN_EXPIRE_MINUTES=30
BACKEND_CORS_ORIGINS=["http://localhost:5173"]
```

## 📦 Adding New Endpoints

1. Create endpoint file: `app/api/v1/endpoints/myendpoint.py`
2. Define router:
```python
from fastapi import APIRouter
router = APIRouter()

@router.get("/")
async def my_endpoint():
    return {"message": "Hello"}
```
3. Import in `app/api/v1/__init__.py`:
```python
from app.api.v1.endpoints import myendpoint
api_router.include_router(myendpoint.router, prefix="/myendpoint", tags=["MyEndpoint"])
```

## 🧪 Quick Test (Swagger UI)

1. Start server: `python -m app.main`
2. Open: http://localhost:8000/docs
3. Login → Copy token
4. Click "Authorize" → Paste `Bearer <token>`
5. Test endpoints!

## 🐛 Common Fixes

### "Could not validate credentials"
→ Check token in header: `Authorization: Bearer <token>`

### "Email already registered"
→ Delete `ryzecanvas.db` and restart

### CORS errors
→ Add frontend URL to `BACKEND_CORS_ORIGINS` in `.env`

### "Not enough permissions"
→ User role must be "admin" for admin endpoints

## 📚 Key Files

| File | Purpose |
|------|---------|
| `app/main.py` | FastAPI app + startup |
| `app/core/security.py` | JWT + bcrypt |
| `app/api/deps.py` | Auth dependencies |
| `app/models/user.py` | User model |
| `app/api/v1/endpoints/auth.py` | Auth routes |

## 🌐 URLs

- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

## 🔄 Switch to PostgreSQL

1. `pip install asyncpg`
2. Update `.env`:
   ```env
   DATABASE_URL=postgresql+asyncpg://user:pass@localhost/dbname
   ```
3. Restart - done! ✅

---

**Keep this card handy for quick reference! 📌**
