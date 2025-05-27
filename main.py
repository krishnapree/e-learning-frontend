import os
from fastapi import FastAPI, Depends, HTTPException, Form, File, UploadFile, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uvicorn
from typing import Optional, List
import json

from database import get_db, engine
from models import Base, User, Question, QuizAttempt, Subscription
from auth import AuthManager, get_current_user
from services.gemini_service import GeminiService
from services.whisper_service import WhisperService
from services.stripe_service import StripeService
from services.quiz_service import QuizService

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Tutor API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://127.0.0.1:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
auth_manager = AuthManager()
gemini_service = GeminiService()
whisper_service = WhisperService()
stripe_service = StripeService()
quiz_service = QuizService()

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
    answers: List[dict]

class CheckoutRequest(BaseModel):
    plan_id: str

# Authentication endpoints
@app.post("/api/register")
async def register(request: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    try:
        user = auth_manager.create_user(db, request.name, request.email, request.password)
        token = auth_manager.create_access_token(user.id)
        
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
                "subscription_status": user.subscription_status
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/login")
async def login(request: LoginRequest, response: Response, db: Session = Depends(get_db)):
    try:
        user = auth_manager.authenticate_user(db, request.email, request.password)
        token = auth_manager.create_access_token(user.id)
        
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
                "subscription_status": user.subscription_status
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
            "subscription_status": current_user.subscription_status
        }
    }

# AI and learning endpoints
@app.post("/api/ask")
async def ask_question(request: AskRequest, current_user: User = Depends(get_current_user)):
    try:
        response = await gemini_service.get_response(request.question)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get AI response: {str(e)}")

@app.post("/api/voice")
async def transcribe_voice(audio: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    try:
        # Read audio file
        audio_content = await audio.read()
        
        # Transcribe using Whisper
        text = await whisper_service.transcribe_audio(audio_content)
        
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to transcribe audio: {str(e)}")

# Quiz endpoints
@app.get("/api/quiz")
async def get_quiz(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        questions = quiz_service.generate_adaptive_quiz(db, current_user.id)
        return {"questions": questions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {str(e)}")

@app.post("/api/submit-quiz")
async def submit_quiz(request: QuizAnswers, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        quiz_service.submit_quiz_results(db, current_user.id, request.answers)
        return {"message": "Quiz submitted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit quiz: {str(e)}")

# Dashboard endpoint
@app.get("/api/dashboard")
async def get_dashboard_data(range: str = "week", current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        data = quiz_service.get_dashboard_data(db, current_user.id, range)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard data: {str(e)}")

# Subscription endpoints
@app.get("/api/subscription/plans")
async def get_subscription_plans():
    try:
        plans = stripe_service.get_subscription_plans()
        return {"plans": plans}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get subscription plans: {str(e)}")

@app.get("/api/subscription/status")
async def get_subscription_status(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        subscription = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
        if subscription:
            return {
                "active": subscription.active_status,
                "plan_name": subscription.plan_name,
                "status": subscription.status,
                "next_billing_date": subscription.next_billing_date.isoformat() if subscription.next_billing_date else None
            }
        return {"active": False}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get subscription status: {str(e)}")

@app.post("/api/create-checkout-session")
async def create_checkout_session(request: CheckoutRequest, current_user: User = Depends(get_current_user)):
    try:
        checkout_url = await stripe_service.create_checkout_session(current_user.email, request.plan_id)
        return {"checkout_url": checkout_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create checkout session: {str(e)}")

@app.post("/api/subscription/portal")
async def get_customer_portal(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        subscription = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
        if not subscription:
            raise HTTPException(status_code=404, detail="No subscription found")
        
        portal_url = await stripe_service.create_customer_portal_session(subscription.stripe_customer_id)
        return {"portal_url": portal_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get customer portal: {str(e)}")

@app.post("/api/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    try:
        body = await request.body()
        sig_header = request.headers.get("stripe-signature")
        
        event = stripe_service.verify_webhook(body, sig_header)
        stripe_service.handle_webhook_event(db, event)
        
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook error: {str(e)}")

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

if __name__ == "__main__":
    # Import and run seed data
    from seed_data import seed_database
    seed_database()
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
