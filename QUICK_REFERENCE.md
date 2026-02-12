# RyzeCanvas - Quick Reference Guide

## 🚀 Quick Start Commands

### Docker Development (Recommended)
```bash
# Start all services
docker-compose up -d

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db

# Restart a service
docker-compose restart backend

# Stop all services
docker-compose down

# Stop and remove volumes (cleans database)
docker-compose down -v

# Rebuild after code changes
docker-compose up -d --build
```

### Manual Development

#### Backend
```bash
cd backend

# Setup (first time only)
python -m venv venv
venv\Scripts\activate     # Windows
source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt

# Run server
python -m app.main

# Run tests
pytest test_*.py -v

# Run with coverage
pytest test_*.py --cov=app --cov-report=html

# Format code
black app/

# Lint code
ruff check app/
flake8 app/
```

#### Frontend
```bash
cd frontend

# Setup (first time only)
npm install

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint
```

## 📦 Docker Commands

### Build Images
```bash
# Build backend image
docker build -t ryzecanvas-backend:latest ./backend

# Build frontend image
docker build -t ryzecanvas-frontend:latest ./frontend
```

### Production Deployment
```bash
# Start production stack
docker-compose -f docker-compose.prod.yml up -d --build

# View production logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop production stack
docker-compose -f docker-compose.prod.yml down
```

### Database Operations
```bash
# Access PostgreSQL shell
docker-compose exec db psql -U ryzecanvas -d ryzecanvas

# Backup database
docker-compose exec db pg_dump -U ryzecanvas ryzecanvas > backup.sql

# Restore database
docker-compose exec -T db psql -U ryzecanvas ryzecanvas < backup.sql

# View database logs
docker-compose logs -f db
```

## 🔧 Environment Setup

### First Time Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Windows: notepad .env
# Mac/Linux: nano .env or vim .env

# Generate secure SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Environment Variables
```bash
# Backend
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/ryzecanvas
SECRET_KEY=<generated-secret-key>
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Frontend
VITE_API_URL=http://localhost:8000
```

## 🧪 Testing

### Backend Tests
```bash
cd backend

# Run all tests
pytest test_*.py -v

# Run specific test file
pytest test_phase4.py -v

# Run with coverage
pytest test_*.py --cov=app --cov-report=term --cov-report=html

# View coverage report
# Windows: start htmlcov/index.html
# Mac: open htmlcov/index.html
# Linux: xdg-open htmlcov/index.html
```

### Frontend Tests
```bash
cd frontend

# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

## 🔍 Debugging

### View Service Status
```bash
# Check all services
docker-compose ps

# Check specific service health
docker-compose ps backend
```

### Access Container Shell
```bash
# Backend container
docker-compose exec backend sh

# Frontend container
docker-compose exec frontend sh

# Database container
docker-compose exec db bash
```

### View API Logs
```bash
# Real-time backend logs
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

## 🌐 Access URLs

### Development
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs (Swagger)**: http://localhost:8000/docs
- **API Docs (ReDoc)**: http://localhost:8000/redoc
- **pgAdmin**: http://localhost:5050

### Production (after deployment)
- **Frontend**: https://your-domain.com
- **Backend API**: https://api.your-domain.com
- **API Docs**: https://api.your-domain.com/docs

## 🔐 Default Credentials

### Admin User
```
Email: admin@ryze.ai
Password: admin123
```

### pgAdmin
```
Email: admin@ryze.ai
Password: admin
```

**⚠️ Change these immediately in production!**

## 📊 Common Tasks

### Add New Python Dependency
```bash
cd backend
pip install <package-name>
pip freeze | grep <package-name> >> requirements.txt
```

### Add New NPM Dependency
```bash
cd frontend
npm install <package-name>
```

### Database Migration (Example)
```bash
cd backend

# Create migration
alembic revision --autogenerate -m "description"

# Apply migration
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

### Clear All Docker Data (Fresh Start)
```bash
# Stop all containers
docker-compose down -v

# Remove all RyzeCanvas images
docker images | grep ryzecanvas | awk '{print $3}' | xargs docker rmi -f

# Rebuild and start
docker-compose up -d --build
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:8000 | xargs kill -9
```

### Database Connection Issues
```bash
# Check database is running
docker-compose ps db

# View database logs
docker-compose logs db

# Restart database
docker-compose restart db
```

### Frontend Build Errors
```bash
cd frontend

# Clear cache and rebuild
rm -rf node_modules .vite dist
npm install
npm run build
```

### Backend Import Errors
```bash
cd backend

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

## 📝 Git Workflow

### Feature Branch
```bash
# Create and switch to feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "Add my feature"

# Push to remote
git push origin feature/my-feature

# Create Pull Request on GitHub
```

### Update from Main
```bash
# Switch to main
git checkout main

# Pull latest changes
git pull origin main

# Switch back to feature branch
git checkout feature/my-feature

# Merge main into feature
git merge main
```

## 🚢 Deployment Checklist

- [ ] Update `.env` with production values
- [ ] Change `SECRET_KEY` to secure random string
- [ ] Update `DATABASE_URL` with production database
- [ ] Set `BACKEND_CORS_ORIGINS` to production frontend URL
- [ ] Change default admin password
- [ ] Enable HTTPS/SSL
- [ ] Setup database backups
- [ ] Configure monitoring/logging
- [ ] Setup error tracking (e.g., Sentry)
- [ ] Review security headers
- [ ] Test production build locally
- [ ] Run security scans
- [ ] Update documentation

## 📞 Getting Help

1. Check logs: `docker-compose logs -f`
2. Review README.md for detailed documentation
3. Check MIGRATION_SUMMARY.md for recent changes
4. Review backend/README.md for API details
5. Open GitHub issue for bugs

---

**Keep this guide bookmarked for quick reference! 📌**
