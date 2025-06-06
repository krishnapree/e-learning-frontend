# Backend Repository Setup Commands

## Step 1: Clone and prepare backend repo
```bash
# Clone current repo to new location
git clone https://github.com/krishnapree/E-Learning.git e-learning-backend
cd e-learning-backend

# Remove frontend files
rm -rf src/ public/ node_modules/
rm -rf package.json package-lock.json
rm -rf vite.config.js tsconfig.json tailwind.config.js postcss.config.js
rm -rf index.html netlify.toml
rm -rf dist/

# Keep only backend files
# main.py, requirements.txt, services/, etc. will remain
```

## Step 2: Create backend-specific .gitignore
```gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
pip-wheel-metadata/
share/python-wheels/
*.egg-info/
.installed.cfg
*.egg
MANIFEST

# PyInstaller
*.manifest
*.spec

# Installer logs
pip-log.txt
pip-delete-this-directory.txt

# Unit test / coverage reports
htmlcov/
.tox/
.nox/
.coverage
.coverage.*
.cache
nosetests.xml
coverage.xml
*.cover
*.py,cover
.hypothesis/
.pytest_cache/

# Translations
*.mo
*.pot

# Django stuff:
*.log
local_settings.py
db.sqlite3
db.sqlite3-journal

# Flask stuff:
instance/
.webassets-cache

# Scrapy stuff:
.scrapy

# Sphinx documentation
docs/_build/

# PyBuilder
target/

# Jupyter Notebook
.ipynb_checkpoints

# IPython
profile_default/
ipython_config.py

# pyenv
.python-version

# pipenv
Pipfile.lock

# PEP 582
__pypackages__/

# Celery stuff
celerybeat-schedule
celerybeat.pid

# SageMath parsed files
*.sage.py

# Environments
.env
.venv
env/
venv/
ENV/
env.bak/
venv.bak/

# Spyder project settings
.spyderproject
.spyproject

# Rope project settings
.ropeproject

# mkdocs documentation
/site

# mypy
.mypy_cache/
.dmypy.json
dmypy.json

# Pyre type checker
.pyre/

# Database files
*.db
*.sqlite
*.sqlite3

# Uploaded files
uploads/
static/uploads/

# IDE specific files
.vscode/
.idea/
*.sublime-project
*.sublime-workspace

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Local configuration
config.local.py
settings.local.py

# Backup files
*.bak
*.backup

# Test files
test_*.py
*_test.py

# Migration scripts (temporary)
migrate_*.py
```

## Step 3: Create backend README.md
```markdown
# EduFlow Backend

AI-Powered Learning Management System - Backend API

## 🚀 Tech Stack

- **FastAPI** - Modern Python web framework
- **PostgreSQL** - Database
- **SQLAlchemy** - ORM
- **Google Gemini AI** - AI Integration
- **OpenAI Whisper** - Voice transcription
- **Stripe** - Payment processing
- **JWT** - Authentication

## 🛠️ Development

### Prerequisites
- Python 3.11+
- PostgreSQL
- pip or poetry

### Installation
```bash
pip install -r requirements.txt
```

### Environment Variables
Create a `.env` file:
```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/eduflow

# JWT
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256

# AI Services
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key

# Payment
STRIPE_API_KEY=your-stripe-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret

# Frontend URL
FRONTEND_URL=https://your-frontend.netlify.app
```

### Run Development Server
```bash
uvicorn main:app --reload --port 8000
```

## 🚀 Deployment

This backend is deployed on **Render**.

### Environment Variables (Render)
Set all the above environment variables in Render dashboard.

## 📁 Project Structure

```
├── main.py              # FastAPI application
├── auth.py              # Authentication logic
├── database.py          # Database configuration
├── models.py            # SQLAlchemy models
├── services/            # Business logic services
│   ├── gemini_service.py
│   ├── whisper_service.py
│   └── stripe_service.py
├── requirements.txt     # Python dependencies
└── .env.example        # Environment variables template
```

## 🔗 API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔗 Related Repositories

- **Frontend**: [e-learning-frontend](https://github.com/krishnapree/e-learning-frontend)
```

## Step 4: Set up git remote
```bash
# Remove old origin
git remote remove origin

# Add new backend repository
git remote add origin https://github.com/krishnapree/e-learning-backend.git

# Push to new repository
git add .
git commit -m "Initial backend repository setup"
git push -u origin main
```

## Step 5: Update CORS in main.py
```python
# Update CORS origins to include your new frontend URL
origins = [
    "https://your-frontend-name.netlify.app",  # Your new frontend URL
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "*"  # Allow all origins as fallback
]
```
