# RyzeCanvas

**AI-Powered Canvas Platform** - A full-stack application with FastAPI backend and React frontend for creating intelligent, dynamic canvas experiences.

## 🏗️ Project Structure

```
RyzeCanvas/
├── backend/              # FastAPI Backend
│   ├── app/             # Application code
│   │   ├── api/        # API routes
│   │   ├── core/       # Configuration & security
│   │   ├── db/         # Database session
│   │   ├── models/     # SQLAlchemy models
│   │   ├── schemas/    # Pydantic schemas
│   │   └── agent/      # LangGraph AI agent
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/            # React + Vite Frontend
│   ├── src/            # Source code
│   ├── public/         # Static assets
│   ├── package.json
│   └── Dockerfile
├── .github/
│   └── workflows/      # CI/CD pipelines
├── docker-compose.yml  # Development setup
└── docker-compose.prod.yml  # Production setup
```

## 🚀 Tech Stack

### Backend
- **Framework**: FastAPI 0.109+
- **Database**: PostgreSQL with SQLAlchemy (Async)
- **Authentication**: JWT (python-jose) + Bcrypt
- **AI/LLM**: LangChain, LangGraph, OpenAI, Anthropic
- **RAG**: FAISS vector store with tiktoken
- **Validation**: Pydantic v2

### Frontend
- **Framework**: React 18 + Vite
- **UI Library**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod
- **HTTP Client**: TanStack Query

## 📋 Prerequisites

- **Docker & Docker Compose** (recommended)
- **OR Manual Setup**:
  - Python 3.11+
  - Node.js 18+ (npm 9+)
  - PostgreSQL 16+

## 🐳 Quick Start with Docker (Recommended)

### 1. Clone and Setup Environment

```bash
git clone <repository-url>
cd RyzeCanvas
cp .env.example .env
```

### 2. Start All Services

```bash
# Development mode (with hot-reload)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Services will be available at:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- pgAdmin: http://localhost:5050

### 3. Default Credentials

**Admin User:**
- Email: `admin@ryze.ai`
- Password: `admin123`

**pgAdmin:**
- Email: `admin@ryze.ai`
- Password: `admin`

⚠️ **Change these credentials immediately in production!**

## 🛠️ Manual Setup (Without Docker)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate
# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp ../.env.example .env
# Edit .env with your configuration

# Run server
python -m app.main
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
echo "VITE_API_URL=http://localhost:8000" > .env

# Start dev server
npm run dev
```

## 🧪 Running Tests

### Backend Tests

```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install test dependencies
pip install pytest pytest-asyncio pytest-cov

# Run tests
pytest test_*.py -v

# Run with coverage
pytest test_*.py --cov=app --cov-report=html
```

### Frontend Tests

```bash
cd frontend

# Run tests
npm test

# Run with watch mode
npm run test:watch
```

## 🚢 Production Deployment

### Using Docker Compose

```bash
# Build and start production services
docker-compose -f docker-compose.prod.yml up -d --build

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Manual Deployment

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

**Frontend:**
```bash
cd frontend
npm ci
npm run build
# Serve the dist/ folder with Nginx or similar
```

## 🔄 CI/CD

The project includes comprehensive GitHub Actions workflows:

- **Backend CI**: Linting (Black, Ruff, Flake8), type checking (MyPy), testing, security scanning
- **Frontend CI**: ESLint, TypeScript checking, testing, building, Lighthouse CI
- **Integration Tests**: Full stack testing with PostgreSQL
- **Docker Build**: Automated Docker image building and pushing

### Setup CI/CD Secrets

Add these secrets to your GitHub repository:

```
DOCKER_USERNAME
DOCKER_PASSWORD
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
SNYK_TOKEN
LHCI_GITHUB_APP_TOKEN
```

## 📚 API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

```
POST   /api/v1/auth/register    - Register new user
POST   /api/v1/auth/login       - Login (get JWT token)
GET    /api/v1/auth/me          - Get current user
GET    /api/v1/projects         - List user projects
POST   /api/v1/projects         - Create project
GET    /api/v1/admin/users      - Admin: List all users
```

## 🔐 Environment Variables

See `.env.example` for all available configuration options.

**Critical Variables:**
- `SECRET_KEY`: JWT signing key (generate with `python -c "import secrets; print(secrets.token_urlsafe(32))"`)
- `DATABASE_URL`: PostgreSQL connection string
- `BACKEND_CORS_ORIGINS`: Allowed frontend origins

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Architecture Overview

### Phase 4: AI Agent with RAG

The backend implements a sophisticated AI orchestration system:

1. **Component Library**: Fixed schema of 50+ UI components
2. **RAG System**: FAISS vector store for context-aware component retrieval
3. **LangGraph Orchestration**: Multi-step workflow for deterministic UI generation
4. **Validation Layer**: Strict schema validation to prevent AI hallucinations

See `backend/PHASE4_SUCCESS.md` for detailed documentation.

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose ps db

# View database logs
docker-compose logs db
```

### Port Already in Use

```bash
# Kill process on port 8000 (backend)
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8000 | xargs kill -9
```

### Frontend Not Loading

```bash
# Clear node_modules and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Check existing documentation in `/backend` and `/frontend` folders

## 📄 License

[Your License Here]

---

**Built with ❤️ by the RyzeCanvas Team**
