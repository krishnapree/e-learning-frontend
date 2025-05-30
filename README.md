<<<<<<< HEAD
# 🎓 EduFlow - Modern Learning Management System

A comprehensive full-stack Learning Management System built with React, TypeScript, FastAPI, and modern web technologies. Designed for educational institutions with multi-role support, course management, quiz systems, and administrative tools.

## ✨ Key Features

### 👥 Multi-Role System

- **Administrator**: Complete system oversight and management
- **Lecturer**: Course delivery, quiz creation, and student assessment
- **Student**: AI-enhanced learning experience with interactive features

### 📚 Course Management

- **Course Creation**: Comprehensive course setup with materials
- **Content Upload**: Support for various file types and media
- **Enrollment System**: Streamlined student enrollment process
- **Progress Tracking**: Real-time monitoring of student progress

### 📝 Assessment System

- **Quiz Management**: Create and manage interactive quizzes
- **Assignment Handling**: File upload and submission system
- **Grading Tools**: Efficient grading and feedback mechanisms
- **Performance Analytics**: Detailed insights into student performance

### 🤖 AI Integration

- **Smart Tutoring**: AI-powered assistance for students
- **Content Analysis**: Intelligent content processing and recommendations
- **Automated Insights**: AI-driven analytics and reporting

### 🏛️ Academic Structure

- **Department Management**: Organize courses by departments
- **Program Administration**: Manage degree programs and curricula
- **User Management**: Comprehensive user role and permission system
- **System Analytics**: Institution-wide performance metrics

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+** - Backend runtime
- **Node.js 18+** - Frontend development
- **SQLite** - Database (included)
- **Git** - Version control

### Installation

1. **Clone the Repository**

```bash
git clone <repository-url>
cd EduFlow-LMS
```

2. **Backend Setup**

```bash
# Create virtual environment (recommended)
python -m venv masterlms_env
source masterlms_env/bin/activate  # On Windows: masterlms_env\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Initialize database with sample data
python seed_data.py
```

3. **Frontend Setup**

```bash
# Install Node.js dependencies
npm install

# Build for development
npm run dev
```

### Running the Application

1. **Start Backend Server**

```bash
# Activate virtual environment if not already active
source masterlms_env/bin/activate  # On Windows: masterlms_env\Scripts\activate

# Start FastAPI server
python main.py
# 🚀 Backend runs on http://localhost:8000
# 📚 API Documentation: http://localhost:8000/docs
```

2. **Start Frontend Development Server**

```bash
# In a new terminal window
npm run dev
# 🌐 Frontend runs on http://localhost:5001
```

### Default Login Credentials

After running the seed script, you can log in with:

**Administrator:**

- Email: `admin@eduflow.com`
- Password: `admin123`

**Lecturer:**

- Email: `lecturer@eduflow.com`
- Password: `lecturer123`

**Student:**

- Email: `student@eduflow.com`
- Password: `student123`

## 🏗️ Project Structure

```
EduFlow-LMS/
├── 📁 Backend (Python/FastAPI)
│   ├── main.py                    # FastAPI application entry point
│   ├── models.py                  # SQLAlchemy database models
│   ├── database.py                # Database configuration
│   ├── auth.py                    # Authentication & JWT handling
│   ├── logger.py                  # Logging configuration
│   ├── seed_data.py               # Database seeding script
│   ├── masterlms.db               # SQLite database file
│   └── services/                  # Business logic services
│       ├── academic_service.py        # Academic structure management
│       ├── communication_service.py   # Messaging & notifications
│       ├── discussion_service.py      # Forum discussions
│       ├── gemini_service.py          # AI integration
│       ├── pdf_service.py             # PDF processing
│       ├── quiz_service.py            # Quiz management
│       ├── realtime_service.py        # Real-time features
│       ├── stripe_service.py          # Payment processing
│       ├── user_management_service.py # User administration
│       └── whisper_service.py         # Voice processing
│
├── 📁 Frontend (React/TypeScript)
│   ├── src/
│   │   ├── components/            # Reusable UI components
│   │   │   ├── Navbar.tsx             # Navigation component
│   │   │   ├── ProgressChart.tsx      # Analytics charts
│   │   │   ├── QuizCard.tsx           # Quiz display component
│   │   │   └── VoiceRecorder.tsx      # Voice input component
│   │   ├── pages/                 # Application pages
│   │   │   ├── AdminDashboard.tsx     # Admin management interface
│   │   │   ├── LecturerDashboard.tsx  # Lecturer interface
│   │   │   ├── StudentDashboard.tsx   # Student interface
│   │   │   ├── CourseManagement.tsx   # Course administration
│   │   │   ├── UserManagement.tsx     # User administration
│   │   │   ├── Quiz.tsx               # Quiz interface
│   │   │   └── Login.tsx              # Authentication
│   │   ├── hooks/                 # Custom React hooks
│   │   │   └── useAuth.tsx            # Authentication hook
│   │   ├── types/                 # TypeScript definitions
│   │   │   └── index.ts               # Type definitions
│   │   └── api/                   # API client
│   │       └── client.ts              # HTTP client configuration
│   ├── package.json               # Node.js dependencies
│   ├── vite.config.js             # Vite build configuration
│   └── tailwind.config.js         # Tailwind CSS configuration
│
├── 📁 Configuration Files
│   ├── requirements.txt           # Python dependencies
│   ├── tsconfig.json              # TypeScript configuration
│   ├── postcss.config.cjs         # PostCSS configuration
│   └── pyproject.toml             # Python project metadata
│
├── 📁 Static Assets
│   ├── index.html                 # HTML entry point
│   └── uploads/                   # File upload directory
│       └── course_materials/          # Course content files
│
└── 📁 Documentation
    └── README.md                  # Project documentation
```

## 🛠️ Technology Stack

### 🎨 Frontend Technologies

- **React 18** - Modern UI library with hooks
- **TypeScript** - Type-safe JavaScript development
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router DOM** - Client-side routing
- **Font Awesome** - Icon library

### ⚙️ Backend Technologies

- **FastAPI** - High-performance Python web framework
- **SQLAlchemy** - Python SQL toolkit and ORM
- **SQLite** - Lightweight relational database
- **JWT** - JSON Web Token authentication
- **Passlib** - Password hashing library
- **Uvicorn** - ASGI server implementation

### 🔐 Security & Authentication

- **JWT Tokens** - Stateless authentication
- **bcrypt** - Secure password hashing
- **CORS** - Cross-origin resource sharing
- **HTTP-only Cookies** - Secure token storage

### 📊 Additional Integrations

- **Google Gemini AI** - AI-powered features
- **Stripe** - Payment processing (optional)
- **PDF Processing** - Document analysis
- **Voice Recognition** - Speech-to-text features

## 🎯 User Roles & Capabilities

### 👨‍💼 Administrator

- **System Overview**: Complete dashboard with analytics
- **User Management**: Create, edit, and manage all users
- **Academic Structure**: Manage departments and programs
- **Course Oversight**: Monitor all courses and enrollments
- **System Analytics**: Institution-wide performance metrics
- **Settings Management**: Configure system parameters

### 👨‍🏫 Lecturer

- **Course Management**: Create and manage courses
- **Content Upload**: Add course materials and resources
- **Quiz Creation**: Design interactive assessments
- **Student Progress**: Track individual student performance
- **Grading Tools**: Efficient assignment and quiz grading
- **Communication**: Interact with students through forums

### 👨‍🎓 Student

- **Course Enrollment**: Browse and enroll in available courses
- **Learning Materials**: Access course content and resources
- **Interactive Quizzes**: Take assessments and receive feedback
- **Progress Tracking**: Monitor personal learning progress
- **AI Tutoring**: Get help from AI-powered assistance
- **Discussion Forums**: Participate in course discussions

## 📚 API Documentation

Once the backend server is running, explore the comprehensive API documentation:

- **🔗 Interactive API Docs**: http://localhost:8000/docs
- **📖 ReDoc Documentation**: http://localhost:8000/redoc
- **🔍 OpenAPI Schema**: http://localhost:8000/openapi.json

### Key API Endpoints

```
Authentication:
POST /auth/login          # User login
POST /auth/logout         # User logout
POST /auth/register       # User registration

Courses:
GET  /courses             # List all courses
POST /courses             # Create new course
GET  /courses/{id}        # Get course details
PUT  /courses/{id}        # Update course

Users:
GET  /users               # List users (admin only)
POST /users               # Create user (admin only)
GET  /users/profile       # Get current user profile

Academic:
GET  /academic/overview   # System statistics
GET  /departments         # List departments
GET  /programs            # List programs
```

## 🚀 Development Guide

### 📁 Adding New Features

1. **Backend Development**

   ```bash
   # Add new API endpoints in main.py
   # Create service files in services/ directory
   # Update models.py for database changes
   # Test with http://localhost:8000/docs
   ```

2. **Frontend Development**
   ```bash
   # Create components in src/components/
   # Add pages in src/pages/
   # Update routing in App.tsx
   # Style with Tailwind CSS classes
   ```

### 🔧 Database Management

```bash
# Reset database (WARNING: Deletes all data)
rm masterlms.db
python seed_data.py

# View database content
sqlite3 masterlms.db
.tables
.schema users
```

### 🧪 Testing

```bash
# Backend testing
python -m pytest

# Frontend testing
npm run test

# Type checking
npm run type-check
```

## 🔒 Security Features

- **🔐 JWT Authentication**: Secure token-based authentication
- **🛡️ Password Hashing**: bcrypt for secure password storage
- **🌐 CORS Protection**: Configured cross-origin resource sharing
- **✅ Input Validation**: Server-side request validation
- **🍪 Secure Cookies**: HTTP-only cookie configuration
- **🔒 Role-based Access**: Multi-level permission system

## 📈 Performance Features

- **⚡ Fast Loading**: Vite for optimized development and builds
- **📱 Responsive Design**: Mobile-first responsive interface
- **🎯 Lazy Loading**: Component-level code splitting
- **💾 Efficient Queries**: Optimized database operations
- **🗜️ Asset Optimization**: Compressed and minified assets

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the Repository**

   ```bash
   git fork <repository-url>
   git clone <your-fork-url>
   ```

2. **Create Feature Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**

   - Follow existing code style
   - Add comments for complex logic
   - Update documentation if needed

4. **Test Your Changes**

   ```bash
   # Test backend
   python -m pytest

   # Test frontend
   npm run test
   ```

5. **Submit Pull Request**
   - Provide clear description
   - Reference any related issues
   - Ensure all tests pass

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🆘 Support & Help

### 📞 Getting Help

- **📚 Documentation**: Check this README and API docs
- **🐛 Bug Reports**: Create an issue on GitHub
- **💡 Feature Requests**: Open a discussion on GitHub
- **❓ Questions**: Check existing issues or create new ones

### 🔗 Useful Links

- **API Documentation**: http://localhost:8000/docs
- **Frontend**: http://localhost:5001
- **Database Admin**: Use SQLite browser tools

---

## 🎉 Acknowledgments

**Built with ❤️ using modern web technologies**

- React & TypeScript for robust frontend development
- FastAPI & SQLAlchemy for powerful backend architecture
- Tailwind CSS for beautiful, responsive design
- Modern development tools for optimal developer experience

**EduFlow LMS - Empowering Education Through Technology** 🎓
=======
# E-Learning
>>>>>>> 67867239aff0a3fed685e8d4fec7c2da6d9db1c6
