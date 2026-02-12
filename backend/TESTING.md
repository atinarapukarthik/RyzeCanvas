# Testing Guide for RyzeCanvas Backend

This guide provides step-by-step instructions for testing all backend endpoints.

## 🚀 Quick Start

1. **Start the backend server**:
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate  # Windows
   # source venv/bin/activate  # Unix/Linux
   pip install -r requirements.txt
   python -m app.main
   ```

2. **Open Swagger UI**: http://localhost:8000/docs

## 📋 Test Scenarios

### Scenario 1: Register a New User

**Endpoint**: `POST /api/v1/auth/register`

1. In Swagger UI, click on **POST /api/v1/auth/register**
2. Click **"Try it out"**
3. Enter request body:
   ```json
   {
     "email": "test@example.com",
     "password": "testpass123",
     "full_name": "Test User",
     "role": "user"
   }
   ```
4. Click **"Execute"**

**Expected Response (201 Created)**:
```json
{
  "id": 2,
  "email": "test@example.com",
  "full_name": "Test User",
  "role": "user",
  "is_active": true,
  "created_at": "2026-02-12T14:30:00"
}
```

**Error Cases to Test**:
- **Duplicate email**: Try registering with same email → 400 Bad Request
- **Invalid email**: Use `not-an-email` → 422 Validation Error
- **Missing fields**: Omit password → 422 Validation Error

---

### Scenario 2: Login with Default Admin

**Endpoint**: `POST /api/v1/auth/login`

1. Click on **POST /api/v1/auth/login**
2. Click **"Try it out"**
3. Enter credentials:
   - **username**: `admin@ryze.ai`
   - **password**: `admin123`
4. Click **"Execute"**

**Expected Response (200 OK)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Copy the `access_token`** - you'll need it for protected endpoints!

**Error Cases to Test**:
- **Wrong password**: Use incorrect password → 401 Unauthorized
- **Non-existent user**: Use `fake@email.com` → 401 Unauthorized

---

### Scenario 3: Authenticate and Use Protected Endpoint

**Endpoint**: `GET /api/v1/auth/me`

1. **Authorize first**:
   - Click the **"Authorize"** button (lock icon, top right of Swagger UI)
   - In the popup, enter: `Bearer <your_access_token>`
     - Example: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Click **"Authorize"**
   - Click **"Close"**

2. **Test the endpoint**:
   - Click on **GET /api/v1/auth/me**
   - Click **"Try it out"**
   - Click **"Execute"**

**Expected Response (200 OK)**:
```json
{
  "id": 1,
  "email": "admin@ryze.ai",
  "full_name": "Admin User",
  "role": "admin",
  "is_active": true,
  "created_at": "2026-02-12T14:20:00"
}
```

**Error Cases to Test**:
- **No token**: Click "Logout" in Authorize popup → 401 Unauthorized
- **Invalid token**: Use `Bearer invalid_token` → 401 Unauthorized
- **Expired token**: Wait 30+ minutes → 401 Unauthorized

---

## 🔐 Testing Admin Access Control

To test the `get_current_admin()` dependency, create a test endpoint:

### Add Test Endpoint (Optional)

**File**: `backend/app/api/v1/endpoints/auth.py`

Add this to the auth router:

```python
@router.get("/admin-test")
async def admin_only_endpoint(
    admin: User = Depends(get_current_admin)
):
    """Test endpoint - Admin only."""
    return {
        "message": "Admin access granted!",
        "admin": {
            "id": admin.id,
            "email": admin.email,
            "role": admin.role
        }
    }
```

**Import at top of file**:
```python
from app.api.deps import get_db, get_current_user, get_current_admin
```

**Test Steps**:

1. **Login as admin** (`admin@ryze.ai` / `admin123`)
2. Authorize with the token
3. Access `GET /api/v1/auth/admin-test` → ✅ 200 OK

4. **Login as regular user** (create one first via `/register`)
5. Authorize with the user token
6. Access `GET /api/v1/auth/admin-test` → ❌ 403 Forbidden

**Expected Response for Regular User (403 Forbidden)**:
```json
{
  "detail": "Not enough permissions. Admin access required."
}
```

---

## 🧪 Testing with cURL

If you prefer command-line testing:

### 1. Register User
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "curl@example.com",
    "password": "curlpass123",
    "full_name": "cURL User",
    "role": "user"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=curl@example.com&password=curlpass123"
```

**Save the access_token from response**

### 3. Get Current User
```bash
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

---

## 🧪 Testing with Python Requests

```python
import requests

BASE_URL = "http://localhost:8000/api/v1"

# 1. Register
response = requests.post(
    f"{BASE_URL}/auth/register",
    json={
        "email": "python@example.com",
        "password": "pythonpass123",
        "full_name": "Python User",
        "role": "user"
    }
)
print("Register:", response.status_code, response.json())

# 2. Login
response = requests.post(
    f"{BASE_URL}/auth/login",
    data={
        "username": "python@example.com",
        "password": "pythonpass123"
    }
)
token_data = response.json()
access_token = token_data["access_token"]
print("Login:", response.status_code, access_token)

# 3. Get Current User
headers = {"Authorization": f"Bearer {access_token}"}
response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
print("Me:", response.status_code, response.json())
```

---

## 🧪 Testing with JavaScript/Fetch

```javascript
const BASE_URL = "http://localhost:8000/api/v1";
let accessToken = null;

// 1. Register
async function register() {
  const response = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "js@example.com",
      password: "jspass123",
      full_name: "JavaScript User",
      role: "user"
    })
  });
  const data = await response.json();
  console.log("Register:", response.status, data);
}

// 2. Login
async function login() {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      username: "js@example.com",
      password: "jspass123"
    })
  });
  const data = await response.json();
  accessToken = data.access_token;
  console.log("Login:", response.status, accessToken);
}

// 3. Get Current User
async function getCurrentUser() {
  const response = await fetch(`${BASE_URL}/auth/me`, {
    headers: {
      "Authorization": `Bearer ${accessToken}`
    }
  });
  const data = await response.json();
  console.log("Me:", response.status, data);
}

// Run tests
(async () => {
  await register();
  await login();
  await getCurrentUser();
})();
```

---

## 📊 Test Checklist

### ✅ Registration Tests
- [ ] Successful registration with valid data
- [ ] Email uniqueness validation (duplicate email)
- [ ] Email format validation (invalid email)
- [ ] Required field validation (missing password)
- [ ] Role assignment (default "user", explicit "admin")

### ✅ Login Tests
- [ ] Successful login with correct credentials
- [ ] Login failure with incorrect password
- [ ] Login failure with non-existent email
- [ ] Token generation and format
- [ ] Token expiration (30 minutes)

### ✅ Protected Endpoint Tests
- [ ] Access with valid token
- [ ] Rejection without token (401)
- [ ] Rejection with invalid token (401)
- [ ] Rejection with expired token (401)
- [ ] User data returned correctly

### ✅ Admin Access Tests
- [ ] Admin user can access admin endpoints
- [ ] Regular user gets 403 Forbidden on admin endpoints
- [ ] Admin role verification logic

### ✅ Database Tests
- [ ] User created in database
- [ ] Password hashed (not plain text)
- [ ] Email index working (fast lookups)
- [ ] Default admin user exists on first run

### ✅ CORS Tests (from Frontend)
- [ ] Requests from `http://localhost:5173` allowed
- [ ] Requests from `http://localhost:3000` allowed
- [ ] Credentials sent correctly
- [ ] Preflight OPTIONS requests handled

---

## 🐛 Common Issues & Solutions

### Issue: "Could not validate credentials"
**Solution**: Check that:
1. Token is included in `Authorization` header
2. Token format is `Bearer <token>` (note the space)
3. Token hasn't expired (30 min default)
4. SECRET_KEY in `.env` hasn't changed

### Issue: "Email already registered"
**Solution**: 
- Use a different email address
- Or delete `ryzecanvas.db` and restart to reset database

### Issue: CORS Error in Browser
**Solution**:
1. Check frontend URL is in `BACKEND_CORS_ORIGINS` in `.env`
2. Restart backend after changing `.env`
3. Check browser console for exact origin

### Issue: "Not enough permissions"
**Solution**:
- Ensure user role is "admin" in database
- Check you're using the admin token, not a regular user token

---

## 📈 Performance Testing

### Load Testing with ApacheBench
```bash
# Test login endpoint
ab -n 100 -c 10 -p login_data.txt -T application/x-www-form-urlencoded \
  http://localhost:8000/api/v1/auth/login
```

**login_data.txt**:
```
username=admin@ryze.ai&password=admin123
```

### Expected Performance
- **Login**: < 100ms per request
- **Register**: < 200ms per request
- **Get Current User**: < 50ms per request

---

## 🔍 Debugging Tips

1. **Check logs**: FastAPI outputs detailed logs with `echo=True` in SQLAlchemy
2. **Use Swagger UI**: Interactive testing is easier than cURL
3. **Inspect database**: Use DB Browser for SQLite to view `ryzecanvas.db`
4. **Token debugging**: Paste JWT token into [jwt.io](https://jwt.io) to decode

---

## ✅ All Tests Passing?

If all tests pass, your backend is ready for integration with the frontend!

**Next Steps**:
1. Integrate with React/Next.js frontend
2. Add user management endpoints
3. Implement password reset flow
4. Add email verification
5. Deploy to production

---

**Happy Testing! 🎉**
