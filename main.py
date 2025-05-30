import os
import json
from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import uvicorn
from typing import List, Dict, Any, Optional

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("python-dotenv not installed. Using system environment variables only.")

from database import get_db, engine
from models import (
    Base, User, UserRole, Course, Enrollment, EnrollmentStatus,
    CourseMaterial, Lesson, Assignment, AssignmentSubmission,
    Quiz, QuizQuestion, StudentQuizAttempt, StudentQuizAnswer,
    Message, Notification, Department, Program
)
from auth import AuthManager, get_current_user
from services.gemini_service import GeminiService
from services.whisper_service import WhisperService

from services.quiz_service import QuizService
from services.pdf_service import PDFService

# MasterLMS Services
from services.academic_service import AcademicService
from services.user_management_service import UserManagementService
from services.discussion_service import DiscussionService
from services.communication_service import CommunicationService
from services.realtime_service import realtime_service, connection_manager

# Import logger
from logger import setup_logger, get_logger

# Setup logging
setup_logger()
logger = get_logger(__name__)

# Validate environment variables
def validate_environment():
    required_vars = ["GEMINI_API_KEY", "DATABASE_URL", "JWT_SECRET_KEY", "STRIPE_API_KEY", "STRIPE_WEBHOOK_SECRET"]
    missing = [var for var in required_vars if not os.getenv(var)]
    if missing:
        logger.error(f"Missing required environment variables: {', '.join(missing)}")
        raise EnvironmentError(f"Missing required environment variables: {', '.join(missing)}")

# Call before app initialization
validate_environment()

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="EduFlow API", version="1.0.0", description="AI-Powered Learning Management System")

# Configure CORS with environment-based origins
origins = os.getenv("CORS_ORIGINS", "http://localhost:5000,http://127.0.0.1:5000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
auth_manager = AuthManager()
gemini_service = GeminiService()
whisper_service = WhisperService()

quiz_service = QuizService()
pdf_service = PDFService()

# Initialize MasterLMS services
academic_service = AcademicService()
user_management_service = UserManagementService()
discussion_service = DiscussionService()
communication_service = CommunicationService()

# Pydantic models for request/response
from pydantic import BaseModel

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class AskRequest(BaseModel):
    question: str

class QuizAnswers(BaseModel):
    answers: List[Dict[str, Any]]

class CheckoutRequest(BaseModel):
    plan_id: str

class PaginationParams(BaseModel):
    page: int = 1
    limit: int = 20

# Authentication endpoints
@app.post("/api/register")
async def register(request: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    try:
        user = auth_manager.create_user(db, request.name, request.email, request.password)
        token = auth_manager.create_access_token(user.id)  # type: ignore

        # Set HTTP-only cookie
        response.set_cookie(
            key="access_token",
            value=token,
            httponly=True,
            secure=False,  # Set to True in production with HTTPS
            samesite="lax",
            max_age=86400 * 7  # 7 days
        )

        return {
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role.value,
                "created_at": user.created_at.isoformat()
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/login")
async def login(request: LoginRequest, response: Response, db: Session = Depends(get_db)):
    try:
        user = auth_manager.authenticate_user(db, request.email, request.password)
        token = auth_manager.create_access_token(user.id)  # type: ignore

        # Set HTTP-only cookie
        response.set_cookie(
            key="access_token",
            value=token,
            httponly=True,
            secure=False,  # Set to True in production with HTTPS
            samesite="lax",
            max_age=86400 * 7  # 7 days
        )

        return {
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role.value,
                "created_at": user.created_at.isoformat()
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

@app.post("/api/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token")
    return {"message": "Logged out successfully"}

@app.get("/api/user")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return {
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "role": current_user.role.value,
            "created_at": current_user.created_at.isoformat()
        }
    }

@app.post("/api/refresh-token")
async def refresh_token(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    user_id, token_type = auth_manager.verify_token(refresh_token)

    if not user_id or token_type != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = auth_manager.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Generate new tokens
    new_access_token = auth_manager.create_access_token(user.id)  # type: ignore
    new_refresh_token = auth_manager.create_refresh_token(user.id)  # type: ignore

    # Set new cookies
    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=True,
        secure=os.getenv("ENVIRONMENT") == "production",
        samesite="lax",
        max_age=86400 * 7  # 7 days
    )

    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=os.getenv("ENVIRONMENT") == "production",
        samesite="lax",
        max_age=86400 * 30  # 30 days
    )

    return {"message": "Token refreshed successfully"}

# AI and learning endpoints
@app.post("/api/ask")
async def ask_question(request: AskRequest, _current_user: User = Depends(get_current_user)):
    try:
        response = await gemini_service.get_response(request.question)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get AI response: {str(e)}")

@app.post("/api/voice")
async def transcribe_voice(audio: UploadFile = File(...), _current_user: User = Depends(get_current_user)):
    try:
        # Read audio file
        audio_content = await audio.read()

        # Transcribe using Whisper
        text = await whisper_service.transcribe_audio(audio_content)

        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to transcribe audio: {str(e)}")

# PDF endpoints
@app.post("/api/upload-pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Read file content
        file_content = await file.read()

        # Process PDF
        result = await pdf_service.process_pdf_upload(
            db, current_user.id, file.filename or "document.pdf", file_content  # type: ignore
        )

        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["errors"])

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload PDF: {str(e)}")

@app.post("/api/chat-pdf")
async def chat_about_pdf(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        chat_session_id = request.get("chat_session_id")
        message = request.get("message", "")

        if not chat_session_id or not message:
            raise HTTPException(status_code=400, detail="chat_session_id and message are required")

        result = await pdf_service.chat_about_pdf(
            db, current_user.id, chat_session_id, message  # type: ignore
        )

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to chat about PDF: {str(e)}")

@app.get("/api/user-pdfs")
async def get_user_pdfs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        pdfs = pdf_service.get_user_pdfs(db, current_user.id)  # type: ignore
        return {"pdfs": pdfs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get PDFs: {str(e)}")

@app.get("/api/chat-sessions")
async def get_chat_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        sessions = pdf_service.get_chat_sessions(db, current_user.id)  # type: ignore
        return {"sessions": sessions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get chat sessions: {str(e)}")

# Quiz endpoints
@app.get("/api/quiz")
async def get_quiz(
    chat_session_id: Optional[int] = None,
    difficulty: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Check if PDF-based quiz is requested
        if chat_session_id:
            questions = await quiz_service.generate_pdf_based_quiz(db, current_user.id, chat_session_id)  # type: ignore
        else:
            questions = quiz_service.generate_adaptive_quiz(db, current_user.id, difficulty)  # type: ignore
        return {"questions": questions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {str(e)}")

@app.post("/api/submit-quiz")
async def submit_quiz(request: QuizAnswers, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        quiz_service.submit_quiz_results(db, current_user.id, request.answers)  # type: ignore
        return {"message": "Quiz submitted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit quiz: {str(e)}")

# Dashboard endpoint
@app.get("/api/dashboard")
async def get_dashboard_data(
    range: str = "week",
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        data = quiz_service.get_dashboard_data(
            db,
            current_user.id,  # type: ignore
            range,
            page=pagination.page,
            limit=pagination.limit
        )
        return data
    except Exception as e:
        logger.error(f"Dashboard data error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard data: {str(e)}")



# ============================================================================
# MasterLMS Endpoints
# ============================================================================

# Academic Management Endpoints
@app.get("/api/academic/departments")
async def get_departments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        departments = academic_service.get_departments(db)
        return {"departments": departments}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get departments: {str(e)}")

@app.post("/api/academic/departments")
async def create_department(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Access denied")

        department = academic_service.create_department(db, request)
        return {"message": "Department created successfully", "department": department}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create department: {str(e)}")

@app.put("/api/academic/departments/{department_id}")
async def update_department(
    department_id: int,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Access denied")

        department = academic_service.update_department(db, department_id, request)
        return {"message": "Department updated successfully", "department": department}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update department: {str(e)}")

@app.get("/api/academic/departments/{department_id}/can-delete")
async def check_department_deletion(
    department_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Access denied")

        result = academic_service.can_delete_department(db, department_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check department deletion: {str(e)}")

@app.delete("/api/academic/departments/{department_id}")
async def delete_department(
    department_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Access denied")

        academic_service.delete_department(db, department_id)
        return {"message": "Department deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete department: {str(e)}")

@app.get("/api/academic/programs")
async def get_programs(
    department_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        programs = academic_service.get_programs(db, department_id)
        return {"programs": programs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get programs: {str(e)}")

@app.post("/api/academic/programs")
async def create_program(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Access denied")

        program = academic_service.create_program(db, request)
        return {"message": "Program created successfully", "program": program}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create program: {str(e)}")

@app.put("/api/academic/programs/{program_id}")
async def update_program(
    program_id: int,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Access denied")

        program = academic_service.update_program(db, program_id, request)
        return {"message": "Program updated successfully", "program": program}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update program: {str(e)}")

@app.delete("/api/academic/programs/{program_id}")
async def delete_program(
    program_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Access denied")

        academic_service.delete_program(db, program_id)
        return {"message": "Program deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete program: {str(e)}")

@app.get("/api/academic/courses")
async def get_courses(
    semester_id: Optional[int] = None,
    department_id: Optional[int] = None,
    lecturer_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        courses = academic_service.get_courses(db, semester_id, department_id, lecturer_id)
        return {"courses": courses}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get courses: {str(e)}")

@app.get("/api/academic/semesters")
async def get_semesters(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        semesters = academic_service.get_semesters(db)
        current_semester = academic_service.get_current_semester(db)
        return {"semesters": semesters, "current_semester": current_semester}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get semesters: {str(e)}")

@app.get("/api/academic/overview")
async def get_academic_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Only allow admins to view system overview
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Access denied")

        overview = academic_service.get_academic_overview(db)
        return overview
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get academic overview: {str(e)}")

# User Management Endpoints
@app.get("/api/users/profile")
async def get_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        profile = user_management_service.get_user_profile(db, current_user.id)
        return profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user profile: {str(e)}")

@app.put("/api/users/profile")
async def update_user_profile(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Users can only update their own profile
        updated_profile = user_management_service.update_user(db, current_user.id, request)
        return updated_profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")

@app.post("/api/users/change-password")
async def change_password(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        current_password = request.get("current_password")
        new_password = request.get("new_password")

        if not current_password or not new_password:
            raise HTTPException(status_code=400, detail="Current password and new password are required")

        # Verify current password
        if not auth_manager.verify_password(current_password, current_user.password_hash):
            raise HTTPException(status_code=400, detail="Current password is incorrect")

        # Update password
        new_password_hash = auth_manager.hash_password(new_password)
        current_user.password_hash = new_password_hash
        db.commit()

        return {"message": "Password changed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to change password: {str(e)}")

@app.put("/api/users/notification-preferences")
async def update_notification_preferences(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # For now, just return success - in a real app, you'd store these preferences
        return {"message": "Notification preferences updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update notification preferences: {str(e)}")

@app.put("/api/users/privacy-settings")
async def update_privacy_settings(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # For now, just return success - in a real app, you'd store these settings
        return {"message": "Privacy settings updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update privacy settings: {str(e)}")

@app.get("/api/users/dashboard")
async def get_user_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role == UserRole.STUDENT:
            dashboard = user_management_service.get_student_dashboard(db, current_user.id)
        elif current_user.role == UserRole.LECTURER:
            dashboard = user_management_service.get_lecturer_dashboard(db, current_user.id)

        else:
            # Admin gets academic overview
            dashboard = academic_service.get_academic_overview(db)

        return dashboard
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard: {str(e)}")

@app.get("/api/users")
async def get_all_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Only allow admins to view user lists
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Access denied")

        users = user_management_service.get_all_users(db, active_only=True)
        return {"users": users}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get users: {str(e)}")

@app.get("/api/users/by-role/{role}")
async def get_users_by_role(
    role: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Only allow admins to view user lists
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Access denied")

        try:
            user_role = UserRole(role.lower())
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid role")

        users = user_management_service.get_users_by_role(db, user_role)
        return {"users": users}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get users: {str(e)}")

@app.post("/api/users")
async def create_user(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Only allow admins to create users
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Access denied")

        name = request.get("name")
        email = request.get("email")
        password = request.get("password")
        role = request.get("role")

        if not all([name, email, password, role]):
            raise HTTPException(status_code=400, detail="Name, email, password, and role are required")

        try:
            user_role = UserRole(role.lower())
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid role")

        user = auth_manager.create_user(db, name, email, password, user_role)
        return {
            "message": "User created successfully",
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role.value,
                "created_at": user.created_at.isoformat()
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")

@app.put("/api/users/{user_id}")
async def update_user(
    user_id: int,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Only allow admins to update users
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Access denied")

        user = user_management_service.update_user(db, user_id, request)
        return {"message": "User updated successfully", "user": user}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update user: {str(e)}")

@app.delete("/api/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Only allow admins to delete users
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Access denied")

        user_management_service.delete_user(db, user_id)
        return {"message": "User deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")

# Student-specific endpoints
@app.get("/api/student/enrollments")
async def get_student_enrollments(
    semester_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role != UserRole.STUDENT:
            raise HTTPException(status_code=403, detail="Access denied")

        enrollments = academic_service.get_student_enrollments(db, current_user.id, semester_id)
        return {"enrollments": enrollments}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get enrollments: {str(e)}")

@app.post("/api/student/enroll")
async def enroll_in_course(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role != UserRole.STUDENT:
            raise HTTPException(status_code=403, detail="Access denied")

        course_id = request.get("course_id")
        program_id = request.get("program_id")

        if not course_id or not program_id:
            raise HTTPException(status_code=400, detail="course_id and program_id are required")

        result = academic_service.enroll_student(db, current_user.id, course_id, program_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to enroll: {str(e)}")

# Lecturer-specific endpoints
@app.get("/api/lecturer/courses")
async def get_lecturer_courses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role != UserRole.LECTURER:
            raise HTTPException(status_code=403, detail="Access denied")

        courses = academic_service.get_courses(db, lecturer_id=current_user.id)
        return {"courses": courses}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get lecturer courses: {str(e)}")

@app.get("/api/lecturer/students")
async def get_lecturer_students(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role != UserRole.LECTURER:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get all students enrolled in lecturer's courses
        students = user_management_service.get_lecturer_students(db, current_user.id)
        return {"users": students}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get lecturer students: {str(e)}")

@app.get("/api/academic/overview")
async def get_academic_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Only allow admins to view system overview
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Access denied")

        overview = academic_service.get_academic_overview(db)
        return overview
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get academic overview: {str(e)}")

# ============================================================================
# Course Management API Endpoints
# ============================================================================

@app.post("/api/courses")
async def create_course(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role not in [UserRole.ADMIN, UserRole.LECTURER]:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get current semester if not specified
        current_semester = academic_service.get_current_semester(db)

        course = Course(
            name=request.get("name"),
            code=request.get("code"),
            description=request.get("description", ""),
            credits=request.get("credits", 3),
            department_id=request.get("department_id"),
            semester_id=request.get("semester_id", current_semester["id"]),
            lecturer_id=current_user.id if current_user.role == UserRole.LECTURER else request.get("lecturer_id"),
            max_capacity=request.get("max_capacity", 30),
            prerequisites=request.get("prerequisites", ""),
            syllabus=request.get("syllabus", "")
        )

        db.add(course)
        db.commit()
        db.refresh(course)

        return {"message": "Course created successfully", "course_id": course.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create course: {str(e)}")

@app.put("/api/courses/{course_id}")
async def update_course(
    course_id: int,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

        # Check permissions
        if current_user.role == UserRole.LECTURER and course.lecturer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        elif current_user.role not in [UserRole.ADMIN, UserRole.LECTURER]:
            raise HTTPException(status_code=403, detail="Access denied")

        # Update course fields
        for field, value in request.items():
            if hasattr(course, field):
                setattr(course, field, value)

        db.commit()
        return {"message": "Course updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update course: {str(e)}")

@app.delete("/api/courses/{course_id}")
async def delete_course(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Access denied")

        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

        course.is_active = False
        db.commit()
        return {"message": "Course deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete course: {str(e)}")

# ============================================================================
# Assignment Management API Endpoints
# ============================================================================

@app.get("/api/assignments")
async def get_assignments(
    course_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        query = db.query(Assignment)

        if current_user.role == UserRole.LECTURER:
            # Get assignments for lecturer's courses
            lecturer_courses = db.query(Course).filter(Course.lecturer_id == current_user.id).all()
            course_ids = [course.id for course in lecturer_courses]
            query = query.filter(Assignment.course_id.in_(course_ids))
        elif current_user.role == UserRole.STUDENT:
            # Get assignments for student's enrolled courses
            enrollments = db.query(Enrollment).filter(Enrollment.student_id == current_user.id).all()
            course_ids = [enrollment.course_id for enrollment in enrollments]
            query = query.filter(Assignment.course_id.in_(course_ids))

        if course_id:
            query = query.filter(Assignment.course_id == course_id)

        assignments = query.order_by(Assignment.due_date.desc()).all()

        assignment_list = []
        for assignment in assignments:
            submission_count = db.query(AssignmentSubmission).filter(
                AssignmentSubmission.assignment_id == assignment.id
            ).count()

            graded_count = db.query(AssignmentSubmission).filter(
                AssignmentSubmission.assignment_id == assignment.id,
                AssignmentSubmission.grade.isnot(None)
            ).count()

            assignment_list.append({
                "id": assignment.id,
                "title": assignment.title,
                "description": assignment.description,
                "course_id": assignment.course_id,
                "course_name": assignment.course.name,
                "course_code": assignment.course.code,
                "due_date": assignment.due_date.isoformat(),
                "max_points": assignment.max_points,
                "assignment_type": assignment.assignment_type,
                "is_published": assignment.is_published,
                "submission_count": submission_count,
                "graded_count": graded_count
            })

        return {"assignments": assignment_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get assignments: {str(e)}")

@app.post("/api/assignments")
async def create_assignment(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role not in [UserRole.ADMIN, UserRole.LECTURER]:
            raise HTTPException(status_code=403, detail="Access denied")

        assignment = Assignment(
            title=request.get("title"),
            description=request.get("description", ""),
            course_id=request.get("course_id"),
            due_date=datetime.fromisoformat(request.get("due_date")),
            max_points=request.get("max_points", 100),
            assignment_type=request.get("assignment_type", "homework"),
            instructions=request.get("instructions", ""),
            is_published=request.get("is_published", True)
        )

        db.add(assignment)
        db.commit()
        db.refresh(assignment)

        return {"message": "Assignment created successfully", "assignment_id": assignment.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create assignment: {str(e)}")

@app.get("/api/assignments/{assignment_id}/submissions")
async def get_assignment_submissions(
    assignment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")

        # Check permissions
        if current_user.role == UserRole.LECTURER and assignment.course.lecturer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        elif current_user.role not in [UserRole.ADMIN, UserRole.LECTURER]:
            raise HTTPException(status_code=403, detail="Access denied")

        submissions = db.query(AssignmentSubmission).filter(
            AssignmentSubmission.assignment_id == assignment_id
        ).all()

        submission_list = []
        for submission in submissions:
            submission_list.append({
                "id": submission.id,
                "student_id": submission.student_id,
                "student_name": submission.student.name,
                "student_email": submission.student.email,
                "submitted_at": submission.submitted_at.isoformat(),
                "grade": submission.grade,
                "feedback": submission.feedback,
                "is_late": submission.is_late,
                "file_url": submission.file_url
            })

        return {"submissions": submission_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get submissions: {str(e)}")

@app.put("/api/submissions/{submission_id}/grade")
async def grade_submission(
    submission_id: int,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        submission = db.query(AssignmentSubmission).filter(AssignmentSubmission.id == submission_id).first()
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")

        # Check permissions
        if current_user.role == UserRole.LECTURER and submission.assignment.course.lecturer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        elif current_user.role not in [UserRole.ADMIN, UserRole.LECTURER]:
            raise HTTPException(status_code=403, detail="Access denied")

        submission.grade = request.get("grade")
        submission.feedback = request.get("feedback", "")
        submission.graded_at = datetime.now(timezone.utc)
        submission.graded_by_id = current_user.id

        db.commit()
        return {"message": "Submission graded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to grade submission: {str(e)}")

# ============================================================================
# File Upload System for Course Materials
# ============================================================================

@app.post("/api/courses/{course_id}/materials")
async def upload_course_material(
    course_id: int,
    file: UploadFile = File(...),
    title: str = "",
    description: str = "",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Check permissions
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

        if current_user.role == UserRole.LECTURER and course.lecturer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        elif current_user.role not in [UserRole.ADMIN, UserRole.LECTURER]:
            raise HTTPException(status_code=403, detail="Access denied")

        # Create uploads directory if it doesn't exist
        upload_dir = "uploads/course_materials"
        os.makedirs(upload_dir, exist_ok=True)

        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{course_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
        file_path = os.path.join(upload_dir, unique_filename)

        # Save file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # Create database record
        material = CourseMaterial(
            course_id=course_id,
            title=title or file.filename,
            description=description,
            file_name=file.filename,
            file_path=file_path,
            file_size=len(content),
            file_type=file.content_type,
            uploaded_by_id=current_user.id
        )

        db.add(material)
        db.commit()
        db.refresh(material)

        return {
            "message": "Course material uploaded successfully",
            "material_id": material.id,
            "file_name": material.file_name,
            "file_size": material.file_size
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload course material: {str(e)}")

@app.get("/api/courses/{course_id}/materials")
async def get_course_materials(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Check if user has access to course
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

        # Check enrollment or teaching access
        has_access = False
        if current_user.role == UserRole.ADMIN:
            has_access = True
        elif current_user.role == UserRole.LECTURER and course.lecturer_id == current_user.id:
            has_access = True
        elif current_user.role == UserRole.STUDENT:
            enrollment = db.query(Enrollment).filter(
                Enrollment.student_id == current_user.id,
                Enrollment.course_id == course_id,
                Enrollment.status == EnrollmentStatus.ENROLLED
            ).first()
            has_access = enrollment is not None

        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied")

        materials = db.query(CourseMaterial).filter(
            CourseMaterial.course_id == course_id,
            CourseMaterial.is_active == True
        ).order_by(CourseMaterial.created_at.desc()).all()

        material_list = []
        for material in materials:
            material_list.append({
                "id": material.id,
                "title": material.title,
                "description": material.description,
                "file_name": material.file_name,
                "file_size": material.file_size,
                "file_type": material.file_type,
                "uploaded_at": material.created_at.isoformat(),
                "uploaded_by": material.uploaded_by.name if material.uploaded_by else "Unknown"
            })

        return {"materials": material_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get course materials: {str(e)}")

@app.get("/api/materials/{material_id}/download")
async def download_course_material(
    material_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        material = db.query(CourseMaterial).filter(CourseMaterial.id == material_id).first()
        if not material:
            raise HTTPException(status_code=404, detail="Material not found")

        # Check access permissions (same as get_course_materials)
        course = material.course
        has_access = False
        if current_user.role == UserRole.ADMIN:
            has_access = True
        elif current_user.role == UserRole.LECTURER and course.lecturer_id == current_user.id:
            has_access = True
        elif current_user.role == UserRole.STUDENT:
            enrollment = db.query(Enrollment).filter(
                Enrollment.student_id == current_user.id,
                Enrollment.course_id == course.id,
                Enrollment.status == EnrollmentStatus.ENROLLED
            ).first()
            has_access = enrollment is not None

        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied")

        # Return file download response
        from fastapi.responses import FileResponse
        return FileResponse(
            path=material.file_path,
            filename=material.file_name,
            media_type=material.file_type
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download material: {str(e)}")

@app.delete("/api/materials/{material_id}")
async def delete_course_material(
    material_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        material = db.query(CourseMaterial).filter(CourseMaterial.id == material_id).first()
        if not material:
            raise HTTPException(status_code=404, detail="Material not found")

        # Check permissions
        course = material.course
        if current_user.role == UserRole.LECTURER and course.lecturer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        elif current_user.role not in [UserRole.ADMIN, UserRole.LECTURER]:
            raise HTTPException(status_code=403, detail="Access denied")

        # Delete file from filesystem
        if material.file_path and os.path.exists(material.file_path):
            os.remove(material.file_path)

        # Delete from database
        db.delete(material)
        db.commit()

        return {"message": "Material deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete material: {str(e)}")

@app.get("/api/courses/{course_id}/students")
async def get_course_students(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Check permissions
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

        if current_user.role == UserRole.LECTURER and course.lecturer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        elif current_user.role not in [UserRole.ADMIN, UserRole.LECTURER]:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get enrolled students
        enrollments = db.query(Enrollment).filter(
            Enrollment.course_id == course_id,
            Enrollment.status == "enrolled"
        ).all()

        students = []
        for enrollment in enrollments:
            student = enrollment.student
            students.append({
                "id": student.id,
                "student_id": student.student_id,
                "name": f"{student.first_name} {student.last_name}",
                "email": student.email,
                "enrollment_date": enrollment.enrollment_date.isoformat() if enrollment.enrollment_date else None,
                "current_grade": enrollment.current_grade,
                "attendance_rate": 85.5,  # Mock data
                "last_activity": "2024-01-15T10:30:00"  # Mock data
            })

        return {"students": students}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get course students: {str(e)}")

@app.get("/api/courses/{course_id}/analytics")
async def get_course_analytics(
    course_id: int,
    timeRange: str = "month",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Check permissions
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

        if current_user.role == UserRole.LECTURER and course.lecturer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        elif current_user.role not in [UserRole.ADMIN, UserRole.LECTURER]:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get course statistics
        enrollments = db.query(Enrollment).filter(
            Enrollment.course_id == course_id,
            Enrollment.status == "enrolled"
        ).count()

        assignments = db.query(Assignment).filter(Assignment.course_id == course_id).all()
        quizzes = db.query(Quiz).filter(Quiz.course_id == course_id).all()

        # Calculate average grade (mock calculation)
        avg_grade = 82.5
        completion_rate = 78.5

        # Mock analytics data
        analytics_data = {
            "course_performance": [{
                "course_id": course_id,
                "course_name": course.name,
                "course_code": course.code,
                "total_students": enrollments,
                "average_grade": avg_grade,
                "completion_rate": completion_rate,
                "assignment_count": len(assignments),
                "quiz_count": len(quizzes)
            }],
            "student_engagement": [
                {"date": "2024-01-01", "active_students": 35, "submissions": 28, "quiz_attempts": 42},
                {"date": "2024-01-02", "active_students": 38, "submissions": 31, "quiz_attempts": 45},
                {"date": "2024-01-03", "active_students": 42, "submissions": 35, "quiz_attempts": 48},
                {"date": "2024-01-04", "active_students": 40, "submissions": 33, "quiz_attempts": 46},
                {"date": "2024-01-05", "active_students": 44, "submissions": 37, "quiz_attempts": 50}
            ],
            "grade_distribution": [
                {"grade_range": "A (90-100)", "count": 12},
                {"grade_range": "B (80-89)", "count": 18},
                {"grade_range": "C (70-79)", "count": 10},
                {"grade_range": "D (60-69)", "count": 4},
                {"grade_range": "F (0-59)", "count": 1}
            ],
            "assignment_performance": [
                {"assignment_name": assignment.title, "average_score": 85.2, "submission_rate": 95.5}
                for assignment in assignments[:4]  # Show first 4 assignments
            ]
        }

        return analytics_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get course analytics: {str(e)}")

# ============================================================================
# Lesson Management Endpoints
# ============================================================================

@app.post("/api/courses/{course_id}/lessons")
async def create_lesson(
    course_id: int,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Check permissions
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

        if current_user.role == UserRole.LECTURER and course.lecturer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        elif current_user.role not in [UserRole.ADMIN, UserRole.LECTURER]:
            raise HTTPException(status_code=403, detail="Access denied")

        # Parse lesson_date if provided
        lesson_date = None
        if request.get("lesson_date"):
            from datetime import datetime
            lesson_date = datetime.fromisoformat(request["lesson_date"])

        # Create lesson
        lesson = Lesson(
            course_id=course_id,
            title=request["title"],
            description=request["description"],
            lesson_date=lesson_date,
            lesson_time=request.get("lesson_time"),
            duration_minutes=request.get("duration_minutes", 60),
            lesson_type=request.get("lesson_type", "lecture"),
            created_by_id=current_user.id
        )

        db.add(lesson)
        db.commit()
        db.refresh(lesson)

        return {
            "message": "Lesson created successfully",
            "lesson_id": lesson.id,
            "title": lesson.title
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create lesson: {str(e)}")

@app.get("/api/courses/{course_id}/lessons")
async def get_course_lessons(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Check if user has access to course
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

        # Check enrollment or teaching access
        has_access = False
        if current_user.role == UserRole.ADMIN:
            has_access = True
        elif current_user.role == UserRole.LECTURER and course.lecturer_id == current_user.id:
            has_access = True
        elif current_user.role == UserRole.STUDENT:
            enrollment = db.query(Enrollment).filter(
                Enrollment.student_id == current_user.id,
                Enrollment.course_id == course_id,
                Enrollment.status == EnrollmentStatus.ENROLLED
            ).first()
            has_access = enrollment is not None

        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied")

        lessons = db.query(Lesson).filter(
            Lesson.course_id == course_id
        ).order_by(Lesson.lesson_order, Lesson.created_at).all()

        lesson_list = []
        for lesson in lessons:
            # Get lesson materials
            materials = db.query(CourseMaterial).filter(
                CourseMaterial.lesson_id == lesson.id,
                CourseMaterial.is_active == True
            ).all()

            material_list = []
            for material in materials:
                material_list.append({
                    "id": material.id,
                    "title": material.title,
                    "file_name": material.file_name,
                    "file_type": material.file_type,
                    "file_size": material.file_size
                })

            lesson_list.append({
                "id": lesson.id,
                "title": lesson.title,
                "description": lesson.description,
                "lesson_date": lesson.lesson_date.isoformat() if lesson.lesson_date else None,
                "lesson_time": lesson.lesson_time,
                "duration_minutes": lesson.duration_minutes,
                "lesson_type": lesson.lesson_type,
                "is_published": lesson.is_published,
                "materials": material_list
            })

        return {"lessons": lesson_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get course lessons: {str(e)}")

@app.put("/api/lessons/{lesson_id}")
async def update_lesson(
    lesson_id: int,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")

        # Check permissions
        if current_user.role == UserRole.LECTURER and lesson.course.lecturer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        elif current_user.role not in [UserRole.ADMIN, UserRole.LECTURER]:
            raise HTTPException(status_code=403, detail="Access denied")

        # Update lesson fields
        for field, value in request.items():
            if field == "lesson_date" and value:
                from datetime import datetime
                lesson.lesson_date = datetime.fromisoformat(value)
            elif hasattr(lesson, field):
                setattr(lesson, field, value)

        db.commit()
        return {"message": "Lesson updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update lesson: {str(e)}")

@app.delete("/api/lessons/{lesson_id}")
async def delete_lesson(
    lesson_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")

        # Check permissions
        if current_user.role == UserRole.LECTURER and lesson.course.lecturer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        elif current_user.role not in [UserRole.ADMIN, UserRole.LECTURER]:
            raise HTTPException(status_code=403, detail="Access denied")

        db.delete(lesson)
        db.commit()
        return {"message": "Lesson deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete lesson: {str(e)}")

@app.post("/api/lessons/{lesson_id}/complete")
async def mark_lesson_complete(
    lesson_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role != UserRole.STUDENT:
            raise HTTPException(status_code=403, detail="Access denied")

        lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")

        # Check if student is enrolled in the course
        enrollment = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id,
            Enrollment.course_id == lesson.course_id,
            Enrollment.status == EnrollmentStatus.ENROLLED
        ).first()

        if not enrollment:
            raise HTTPException(status_code=403, detail="Not enrolled in this course")

        # For now, just return success - in a full implementation,
        # you'd track lesson completion in a separate table
        return {"message": "Lesson marked as complete"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark lesson complete: {str(e)}")

# ============================================================================
# Assignment Submission File Upload
# ============================================================================

@app.post("/api/assignments/{assignment_id}/submit")
async def submit_assignment(
    assignment_id: int,
    file: UploadFile = File(...),
    comments: str = "",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role != UserRole.STUDENT:
            raise HTTPException(status_code=403, detail="Only students can submit assignments")

        assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")

        # Check if student is enrolled in the course
        enrollment = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id,
            Enrollment.course_id == assignment.course_id,
            Enrollment.status == EnrollmentStatus.ENROLLED
        ).first()

        if not enrollment:
            raise HTTPException(status_code=403, detail="Not enrolled in this course")

        # Check if assignment is still accepting submissions
        if not assignment.is_published:
            raise HTTPException(status_code=400, detail="Assignment is not published")

        # Create uploads directory
        upload_dir = "uploads/assignments"
        os.makedirs(upload_dir, exist_ok=True)

        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{assignment_id}_{current_user.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
        file_path = os.path.join(upload_dir, unique_filename)

        # Save file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # Check if submission already exists
        existing_submission = db.query(AssignmentSubmission).filter(
            AssignmentSubmission.assignment_id == assignment_id,
            AssignmentSubmission.student_id == current_user.id
        ).first()

        if existing_submission:
            # Update existing submission
            existing_submission.file_path = file_path
            existing_submission.file_name = file.filename
            existing_submission.comments = comments
            existing_submission.submitted_at = datetime.now(timezone.utc)
            existing_submission.is_late = datetime.now(timezone.utc) > assignment.due_date
            submission = existing_submission
        else:
            # Create new submission
            submission = AssignmentSubmission(
                assignment_id=assignment_id,
                student_id=current_user.id,
                file_path=file_path,
                file_name=file.filename,
                comments=comments,
                is_late=datetime.now(timezone.utc) > assignment.due_date
            )
            db.add(submission)

        db.commit()
        db.refresh(submission)

        return {
            "message": "Assignment submitted successfully",
            "submission_id": submission.id,
            "is_late": submission.is_late,
            "submitted_at": submission.submitted_at.isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit assignment: {str(e)}")

@app.get("/api/submissions/{submission_id}/download")
async def download_submission(
    submission_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        submission = db.query(AssignmentSubmission).filter(AssignmentSubmission.id == submission_id).first()
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")

        # Check permissions
        has_access = False
        if current_user.role == UserRole.ADMIN:
            has_access = True
        elif current_user.role == UserRole.LECTURER and submission.assignment.course.lecturer_id == current_user.id:
            has_access = True
        elif current_user.role == UserRole.STUDENT and submission.student_id == current_user.id:
            has_access = True

        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied")

        from fastapi.responses import FileResponse
        return FileResponse(
            path=submission.file_path,
            filename=submission.file_name,
            media_type="application/octet-stream"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download submission: {str(e)}")

# ============================================================================
# Discussion Forums API Endpoints
# ============================================================================

@app.get("/api/courses/{course_id}/forums")
async def get_course_forums(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        forums = discussion_service.get_course_forums(db, course_id, current_user.id)
        return {"forums": forums}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get forums: {str(e)}")

@app.post("/api/courses/{course_id}/forums")
async def create_forum(
    course_id: int,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        title = request.get("title")
        description = request.get("description", "")

        if not title:
            raise HTTPException(status_code=400, detail="Title is required")

        result = discussion_service.create_forum(db, course_id, title, description, current_user.id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create forum: {str(e)}")

@app.get("/api/forums/{forum_id}/threads")
async def get_forum_threads(
    forum_id: int,
    page: int = 1,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        result = discussion_service.get_forum_threads(db, forum_id, current_user.id, page, limit)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get threads: {str(e)}")

@app.post("/api/forums/{forum_id}/threads")
async def create_thread(
    forum_id: int,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        title = request.get("title")
        content = request.get("content")

        if not title or not content:
            raise HTTPException(status_code=400, detail="Title and content are required")

        result = discussion_service.create_thread(db, forum_id, title, content, current_user.id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create thread: {str(e)}")

@app.get("/api/threads/{thread_id}/posts")
async def get_thread_posts(
    thread_id: int,
    page: int = 1,
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        result = discussion_service.get_thread_posts(db, thread_id, current_user.id, page, limit)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get posts: {str(e)}")

@app.post("/api/threads/{thread_id}/posts")
async def create_post(
    thread_id: int,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        content = request.get("content")
        parent_post_id = request.get("parent_post_id")

        if not content:
            raise HTTPException(status_code=400, detail="Content is required")

        result = discussion_service.create_post(db, thread_id, content, current_user.id, parent_post_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create post: {str(e)}")

@app.put("/api/threads/{thread_id}/pin")
async def pin_thread(
    thread_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        result = discussion_service.pin_thread(db, thread_id, current_user.id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to pin thread: {str(e)}")

@app.put("/api/threads/{thread_id}/lock")
async def lock_thread(
    thread_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        result = discussion_service.lock_thread(db, thread_id, current_user.id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to lock thread: {str(e)}")

# ============================================================================
# Quiz Management Endpoints
# ============================================================================

@app.get("/api/lecturer/quizzes")
async def get_lecturer_quizzes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role != UserRole.LECTURER:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get all quizzes created by this lecturer
        quizzes = db.query(Quiz).filter(
            Quiz.created_by_id == current_user.id,
            Quiz.is_active == True
        ).all()

        quiz_list = []
        for quiz in quizzes:
            # Count questions
            questions_count = db.query(QuizQuestion).filter(
                QuizQuestion.quiz_id == quiz.id
            ).count()

            # Count attempts
            attempts_count = db.query(StudentQuizAttempt).filter(
                StudentQuizAttempt.quiz_id == quiz.id
            ).count()

            quiz_list.append({
                "id": quiz.id,
                "title": quiz.title,
                "description": quiz.description,
                "course_id": quiz.course_id,
                "course_name": quiz.course.name,
                "questions_count": questions_count,
                "time_limit": quiz.time_limit,
                "max_attempts": quiz.max_attempts,
                "is_published": quiz.is_published,
                "created_at": quiz.created_at.isoformat(),
                "attempts_count": attempts_count
            })

        return {"quizzes": quiz_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get quizzes: {str(e)}")

@app.post("/api/quizzes")
async def create_quiz(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role not in [UserRole.ADMIN, UserRole.LECTURER]:
            raise HTTPException(status_code=403, detail="Access denied")

        quiz = Quiz(
            title=request.get("title"),
            description=request.get("description", ""),
            course_id=request.get("course_id"),
            created_by_id=current_user.id,
            time_limit=request.get("time_limit", 30),
            max_attempts=request.get("max_attempts", 3),
            is_published=request.get("is_published", False)
        )

        db.add(quiz)
        db.commit()
        db.refresh(quiz)

        return {
            "message": "Quiz created successfully",
            "quiz": {
                "id": quiz.id,
                "title": quiz.title,
                "course_id": quiz.course_id
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create quiz: {str(e)}")

@app.get("/api/lecturer/assignments")
async def get_lecturer_assignments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role != UserRole.LECTURER:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get all assignments for courses taught by this lecturer
        assignments = db.query(Assignment).join(Course).filter(
            Course.lecturer_id == current_user.id,
            Assignment.course_id == Course.id
        ).all()

        assignment_list = []
        for assignment in assignments:
            # Count submissions
            submission_count = db.query(AssignmentSubmission).filter(
                AssignmentSubmission.assignment_id == assignment.id
            ).count()

            graded_count = db.query(AssignmentSubmission).filter(
                AssignmentSubmission.assignment_id == assignment.id,
                AssignmentSubmission.grade.isnot(None)
            ).count()

            assignment_list.append({
                "id": assignment.id,
                "title": assignment.title,
                "description": assignment.description,
                "course_id": assignment.course_id,
                "course_name": assignment.course.name,
                "course_code": assignment.course.code,
                "due_date": assignment.due_date.isoformat(),
                "max_points": assignment.max_points,
                "assignment_type": assignment.assignment_type,
                "is_published": assignment.is_published,
                "submission_count": submission_count,
                "graded_count": graded_count
            })

        return {"assignments": assignment_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get assignments: {str(e)}")

# ============================================================================
# Communication System API Endpoints
# ============================================================================

@app.post("/api/announcements")
async def create_announcement(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        title = request.get("title")
        content = request.get("content")
        target_audience = request.get("target_audience", "all")
        course_id = request.get("course_id")
        is_urgent = request.get("is_urgent", False)

        if not title or not content:
            raise HTTPException(status_code=400, detail="Title and content are required")

        result = communication_service.create_announcement(
            db, title, content, current_user.id, target_audience, course_id, is_urgent
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create announcement: {str(e)}")

@app.get("/api/events")
async def get_events(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Get real events from database using communication service
        events = communication_service.get_events(db, current_user.id)
        return {"events": events}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get events: {str(e)}")

@app.post("/api/events")
async def create_event(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Allow Admin, Lecturer, and Staff to create events
        if current_user.role not in [UserRole.ADMIN, UserRole.LECTURER]:
            raise HTTPException(status_code=403, detail="Access denied")

        title = request.get("title")
        description = request.get("description")
        event_date = request.get("event_date")
        location = request.get("location")
        event_type = request.get("type", "general")

        if not all([title, description, event_date, location]):
            raise HTTPException(status_code=400, detail="Title, description, event_date, and location are required")

        # Create real event in database using communication service
        result = communication_service.create_event(
            db, title, description, event_date, location, current_user.id, event_type
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create event: {str(e)}")

@app.get("/api/announcements")
async def get_announcements(
    course_id: Optional[int] = None,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        announcements = communication_service.get_announcements(db, current_user.id, course_id, limit)
        return {"announcements": announcements}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get announcements: {str(e)}")

@app.post("/api/messages")
async def send_message(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        recipient_id = request.get("recipient_id")
        subject = request.get("subject")
        content = request.get("content")
        parent_message_id = request.get("parent_message_id")

        if not recipient_id or not subject or not content:
            raise HTTPException(status_code=400, detail="Recipient, subject, and content are required")

        result = communication_service.send_message(
            db, current_user.id, recipient_id, subject, content, parent_message_id
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")

@app.get("/api/messages")
async def get_messages(
    message_type: str = "inbox",
    page: int = 1,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        result = communication_service.get_user_messages(db, current_user.id, message_type, page, limit)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get messages: {str(e)}")

@app.get("/api/messages/{message_id}/thread")
async def get_message_thread(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        result = communication_service.get_message_thread(db, message_id, current_user.id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get message thread: {str(e)}")

@app.get("/api/notifications")
async def get_notifications(
    unread_only: bool = False,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        notifications = communication_service.get_user_notifications(db, current_user.id, unread_only, limit)
        return {"notifications": notifications}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get notifications: {str(e)}")

@app.put("/api/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        result = communication_service.mark_notification_read(db, notification_id, current_user.id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark notification as read: {str(e)}")

@app.get("/api/notifications/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        result = communication_service.get_unread_count(db, current_user.id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get unread count: {str(e)}")

# ============================================================================
# Real-time WebSocket Endpoints
# ============================================================================

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int, db: Session = Depends(get_db)):
    """WebSocket endpoint for real-time communication"""
    try:
        # Get user information
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            await websocket.close(code=4004, reason="User not found")
            return

        # Connect user to WebSocket
        await connection_manager.connect(websocket, user_id, user.role.value)

        # Send connection confirmation
        await websocket.send_text(json.dumps({
            "type": "connection_established",
            "user_id": user_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }))

        # Send initial unread count
        unread_count = communication_service.get_unread_count(db, user_id)
        await websocket.send_text(json.dumps({
            "type": "unread_count",
            "data": unread_count,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }))

        try:
            while True:
                # Wait for messages from client
                data = await websocket.receive_text()
                await realtime_service.handle_websocket_message(websocket, user_id, data)

        except WebSocketDisconnect:
            connection_manager.disconnect(websocket, user_id)
            print(f"User {user_id} disconnected")

    except Exception as e:
        print(f"WebSocket error for user {user_id}: {e}")
        connection_manager.disconnect(websocket, user_id)

@app.get("/api/realtime/stats")
async def get_realtime_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get real-time connection statistics (admin only)"""
    try:
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Access denied")

        stats = realtime_service.get_connection_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get realtime stats: {str(e)}")

# ============================================================================
# Student Assessment Endpoints
# ============================================================================

@app.get("/api/student/courses")
async def get_student_courses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role != UserRole.STUDENT:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get courses the student is enrolled in
        enrollments = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id
        ).all()

        courses = []
        for enrollment in enrollments:
            courses.append({
                "id": enrollment.course.id,
                "name": enrollment.course.name,
                "code": enrollment.course.code
            })

        return {"courses": courses}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get student courses: {str(e)}")

@app.get("/api/student/enrolled-courses")
async def get_student_enrolled_courses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role != UserRole.STUDENT:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get courses the student is enrolled in with more details
        enrollments = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id,
            Enrollment.status == EnrollmentStatus.ENROLLED
        ).all()

        courses = []
        for enrollment in enrollments:
            course = enrollment.course
            courses.append({
                "id": course.id,
                "name": course.name,
                "code": course.code,
                "description": course.description,
                "credits": course.credits,
                "lecturer_name": course.lecturer.name if course.lecturer else "TBA",
                "enrollment_date": enrollment.enrollment_date.isoformat() if enrollment.enrollment_date else None,
                "current_grade": enrollment.current_grade
            })

        return {"courses": courses}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get enrolled courses: {str(e)}")

@app.get("/api/student/academic-record")
async def get_student_academic_record(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role != UserRole.STUDENT:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get student's academic record
        enrollments = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id
        ).all()

        total_credits = sum(enrollment.course.credits for enrollment in enrollments if enrollment.course)
        completed_courses = len([e for e in enrollments if e.status == EnrollmentStatus.COMPLETED])

        # Calculate GPA (mock calculation)
        grades = [e.current_grade for e in enrollments if e.current_grade]
        gpa = sum(grades) / len(grades) if grades else 0.0

        record = {
            "student_id": current_user.student_id,
            "name": current_user.name,
            "email": current_user.email,
            "total_credits": total_credits,
            "completed_courses": completed_courses,
            "current_gpa": round(gpa, 2),
            "academic_standing": "Good Standing" if gpa >= 2.0 else "Academic Probation",
            "enrollment_date": current_user.created_at.isoformat(),
            "expected_graduation": "2025-05-15"  # Mock data
        }

        return {"record": record}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get academic record: {str(e)}")

@app.get("/api/student/transcript")
async def get_student_transcript(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role != UserRole.STUDENT:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get student's transcript
        enrollments = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id
        ).all()

        transcript_courses = []
        for enrollment in enrollments:
            course = enrollment.course
            transcript_courses.append({
                "course_code": course.code,
                "course_name": course.name,
                "credits": course.credits,
                "grade": enrollment.current_grade or "IP",  # IP = In Progress
                "semester": course.semester.name if course.semester else "N/A",
                "year": course.semester.year if course.semester else 2024
            })

        # Calculate totals
        total_credits = sum(course["credits"] for course in transcript_courses)
        grades = [course["grade"] for course in transcript_courses if isinstance(course["grade"], (int, float))]
        gpa = sum(grades) / len(grades) if grades else 0.0

        transcript = {
            "student_info": {
                "student_id": current_user.student_id,
                "name": current_user.name,
                "email": current_user.email
            },
            "courses": transcript_courses,
            "summary": {
                "total_credits": total_credits,
                "cumulative_gpa": round(gpa, 2),
                "academic_standing": "Good Standing" if gpa >= 2.0 else "Academic Probation"
            }
        }

        return {"transcript": transcript}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get transcript: {str(e)}")

@app.get("/api/student/quizzes")
async def get_student_quizzes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role != UserRole.STUDENT:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get quizzes for courses the student is enrolled in
        enrollments = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id
        ).all()

        course_ids = [enrollment.course_id for enrollment in enrollments]

        quizzes = db.query(Quiz).filter(
            Quiz.course_id.in_(course_ids),
            Quiz.is_published == True,
            Quiz.is_active == True
        ).all()

        quiz_list = []
        for quiz in quizzes:
            # Count questions
            questions_count = db.query(QuizQuestion).filter(
                QuizQuestion.quiz_id == quiz.id
            ).count()

            # Get student's attempts
            attempts = db.query(StudentQuizAttempt).filter(
                StudentQuizAttempt.quiz_id == quiz.id,
                StudentQuizAttempt.user_id == current_user.id
            ).all()

            my_attempts = len(attempts)
            best_score = max([attempt.score for attempt in attempts]) if attempts else None
            last_attempt_date = max([attempt.completed_at for attempt in attempts]) if attempts else None

            # Determine status
            status = 'available'
            if my_attempts >= quiz.max_attempts:
                status = 'completed'
            elif best_score is not None:
                status = 'completed'

            quiz_list.append({
                "id": quiz.id,
                "title": quiz.title,
                "description": quiz.description,
                "course_id": quiz.course_id,
                "course_name": quiz.course.name,
                "course_code": quiz.course.code,
                "time_limit": quiz.time_limit,
                "max_attempts": quiz.max_attempts,
                "is_published": quiz.is_published,
                "created_at": quiz.created_at.isoformat(),
                "questions_count": questions_count,
                "my_attempts": my_attempts,
                "best_score": best_score,
                "last_attempt_date": last_attempt_date.isoformat() if last_attempt_date else None,
                "status": status
            })

        return {"quizzes": quiz_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get student quizzes: {str(e)}")

@app.get("/api/student/assignments")
async def get_student_assignments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role != UserRole.STUDENT:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get assignments for courses the student is enrolled in
        enrollments = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id
        ).all()

        course_ids = [enrollment.course_id for enrollment in enrollments]

        assignments = db.query(Assignment).filter(
            Assignment.course_id.in_(course_ids),
            Assignment.is_published == True
        ).order_by(Assignment.due_date.asc()).all()

        assignment_list = []
        for assignment in assignments:
            # Get student's submission
            submission = db.query(AssignmentSubmission).filter(
                AssignmentSubmission.assignment_id == assignment.id,
                AssignmentSubmission.student_id == current_user.id
            ).first()

            # Determine status
            status = 'pending'
            if submission:
                if submission.grade is not None:
                    status = 'graded'
                else:
                    status = 'submitted'
            elif assignment.due_date and datetime.now() > assignment.due_date:
                status = 'overdue'

            my_submission = None
            if submission:
                my_submission = {
                    "id": submission.id,
                    "submitted_at": submission.submitted_at.isoformat(),
                    "grade": submission.grade,
                    "feedback": submission.feedback,
                    "file_path": submission.file_url
                }

            assignment_list.append({
                "id": assignment.id,
                "title": assignment.title,
                "description": assignment.description,
                "course_id": assignment.course_id,
                "course_name": assignment.course.name,
                "course_code": assignment.course.code,
                "due_date": assignment.due_date.isoformat(),
                "max_points": assignment.max_points,
                "assignment_type": assignment.assignment_type,
                "instructions": assignment.instructions,
                "is_published": assignment.is_published,
                "created_at": assignment.created_at.isoformat(),
                "my_submission": my_submission,
                "status": status
            })

        return {"assignments": assignment_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get student assignments: {str(e)}")

@app.get("/api/quizzes/{quiz_id}/my-attempts")
async def get_quiz_attempts(
    quiz_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Get student's attempts for this quiz
        attempts = db.query(StudentQuizAttempt).filter(
            StudentQuizAttempt.quiz_id == quiz_id,
            StudentQuizAttempt.user_id == current_user.id
        ).order_by(StudentQuizAttempt.completed_at.desc()).all()

        attempt_list = []
        for i, attempt in enumerate(attempts):
            attempt_list.append({
                "id": attempt.id,
                "attempt_number": i + 1,
                "score": attempt.score,
                "total_points": attempt.total_points,
                "completed_at": attempt.completed_at.isoformat(),
                "time_taken": attempt.time_taken
            })

        return {"attempts": attempt_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get quiz attempts: {str(e)}")

@app.post("/api/quizzes/{quiz_id}/start")
async def start_quiz(
    quiz_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
        if not quiz:
            raise HTTPException(status_code=404, detail="Quiz not found")

        # Check if student can take the quiz
        attempts = db.query(StudentQuizAttempt).filter(
            StudentQuizAttempt.quiz_id == quiz_id,
            StudentQuizAttempt.user_id == current_user.id
        ).count()

        if attempts >= quiz.max_attempts:
            raise HTTPException(status_code=400, detail="Maximum attempts reached")

        # Create new attempt
        attempt = StudentQuizAttempt(
            quiz_id=quiz_id,
            user_id=current_user.id,
            started_at=datetime.now(),
            score=0,
            total_points=0,
            time_taken=0
        )

        db.add(attempt)
        db.commit()
        db.refresh(attempt)

        return {"attempt_id": attempt.id, "message": "Quiz started successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start quiz: {str(e)}")

# ============================================================================
# Additional Student Endpoints
# ============================================================================

@app.get("/api/student/grades")
async def get_student_grades(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role != UserRole.STUDENT:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get all grades for the student
        enrollments = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id
        ).all()

        grades = []
        for enrollment in enrollments:
            course = enrollment.course

            # Get assignment grades
            submissions = db.query(AssignmentSubmission).filter(
                AssignmentSubmission.student_id == current_user.id,
                AssignmentSubmission.assignment_id.in_(
                    db.query(Assignment.id).filter(Assignment.course_id == course.id)
                )
            ).all()

            # Get quiz grades
            quiz_attempts = db.query(StudentQuizAttempt).filter(
                StudentQuizAttempt.user_id == current_user.id,
                StudentQuizAttempt.quiz_id.in_(
                    db.query(Quiz.id).filter(Quiz.course_id == course.id)
                )
            ).all()

            course_grades = {
                "course_id": course.id,
                "course_name": course.name,
                "course_code": course.code,
                "current_grade": enrollment.current_grade,
                "assignments": [
                    {
                        "title": submission.assignment.title,
                        "grade": submission.grade,
                        "max_points": submission.assignment.max_points,
                        "submitted_date": submission.submitted_at.isoformat() if submission.submitted_at else None
                    }
                    for submission in submissions if submission.grade is not None
                ],
                "quizzes": [
                    {
                        "title": attempt.quiz.title,
                        "score": attempt.score,
                        "total_points": attempt.total_points,
                        "completed_date": attempt.completed_at.isoformat() if attempt.completed_at else None
                    }
                    for attempt in quiz_attempts if attempt.score is not None
                ]
            }
            grades.append(course_grades)

        return {"grades": grades}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get student grades: {str(e)}")

@app.get("/api/student/submissions")
async def get_student_submissions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role != UserRole.STUDENT:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get all submissions by the student
        submissions = db.query(AssignmentSubmission).filter(
            AssignmentSubmission.student_id == current_user.id
        ).all()

        submission_list = []
        for submission in submissions:
            assignment = submission.assignment
            submission_list.append({
                "id": submission.id,
                "assignment_title": assignment.title,
                "course_name": assignment.course.name,
                "submitted_at": submission.submitted_at.isoformat() if submission.submitted_at else None,
                "grade": submission.grade,
                "max_points": assignment.max_points,
                "feedback": submission.feedback,
                "file_path": submission.file_url,
                "status": "Graded" if submission.grade is not None else "Submitted"
            })

        return {"submissions": submission_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get student submissions: {str(e)}")

@app.get("/api/student/quiz-attempts")
async def get_student_quiz_attempts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role != UserRole.STUDENT:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get all quiz attempts by the student
        attempts = db.query(StudentQuizAttempt).filter(
            StudentQuizAttempt.user_id == current_user.id
        ).all()

        attempt_list = []
        for attempt in attempts:
            quiz = attempt.quiz
            attempt_list.append({
                "id": attempt.id,
                "quiz_title": quiz.title,
                "course_name": quiz.course.name,
                "started_at": attempt.started_at.isoformat() if attempt.started_at else None,
                "completed_at": attempt.completed_at.isoformat() if attempt.completed_at else None,
                "score": attempt.score,
                "total_points": attempt.total_points,
                "time_taken": attempt.time_taken,
                "status": "Completed" if attempt.completed_at else "In Progress"
            })

        return {"attempts": attempt_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get quiz attempts: {str(e)}")

# ============================================================================


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

if __name__ == "__main__":
    # Import and run EduFlow seed data
    try:
        from masterlms_seed import seed_eduflow_data
        seed_eduflow_data()
    except Exception as e:
        logger.warning(f"Failed to seed EduFlow data: {e}")
        # Fallback to original seed data
        try:
            from seed_data import seed_database
            seed_database()
        except Exception as e2:
            logger.error(f"Failed to seed any data: {e2}")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )







