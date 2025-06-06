# Frontend Repository Setup Commands

## Step 1: Clone and prepare frontend repo
```bash
# Clone current repo to new location
git clone https://github.com/krishnapree/E-Learning.git e-learning-frontend
cd e-learning-frontend

# Remove backend files
rm -rf main.py requirements.txt pyproject.toml auth.py database.py models.py logger.py
rm -rf services/ uploads/ static/
rm -rf __pycache__/ *.py *.db
rm -rf .env.production

# Keep only frontend files
# src/, public/, package.json, vite.config.js, etc. will remain
```

## Step 2: Update package.json
```json
{
  "name": "eduflow-frontend",
  "version": "1.0.0",
  "description": "EduFlow - AI-Powered Learning Management System (Frontend)",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [
    "education",
    "lms",
    "ai",
    "learning",
    "management",
    "system",
    "frontend",
    "react",
    "typescript"
  ],
  "author": "EduFlow Team",
  "license": "ISC",
  "dependencies": {
    "@types/react": "^19.1.6",
    "@types/react-dom": "^19.1.5",
    "@vitejs/plugin-react": "^4.5.0",
    "autoprefixer": "^10.4.21",
    "lucide-react": "^0.511.0",
    "postcss": "^8.5.3",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router-dom": "^7.6.1",
    "recharts": "^2.15.3",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.8.3",
    "vite": "^6.3.5"
  }
}
```

## Step 3: Create frontend-specific .gitignore
```gitignore
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Build outputs
dist/
dist-ssr/
build/

# Environment variables
.env.local
.env.production
.env.development.local
.env.test.local
.env.production.local

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# TypeScript cache
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache
.cache
.parcel-cache

# Vite cache
.vite/

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Logs
logs
*.log

# Local env files
*.local
```

## Step 4: Create frontend README.md
```markdown
# EduFlow Frontend

AI-Powered Learning Management System - Frontend Application

## 🚀 Tech Stack

- **React 19** - UI Framework
- **TypeScript** - Type Safety
- **Vite** - Build Tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Recharts** - Data Visualization

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
npm install
```

### Environment Variables
Create a `.env` file:
```
VITE_API_URL=https://your-backend-url.onrender.com
```

### Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

## 🚀 Deployment

This frontend is deployed on **Netlify**.

### Environment Variables (Netlify)
- `VITE_API_URL`: Backend API URL

## 📁 Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Page components
├── api/           # API client
├── types/         # TypeScript types
└── styles/        # Global styles
```

## 🔗 Related Repositories

- **Backend**: [e-learning-backend](https://github.com/krishnapree/e-learning-backend)
```

## Step 5: Set up git remote
```bash
# Remove old origin
git remote remove origin

# Add new frontend repository
git remote add origin https://github.com/krishnapree/e-learning-frontend.git

# Push to new repository
git add .
git commit -m "Initial frontend repository setup"
git push -u origin main
```
