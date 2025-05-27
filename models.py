from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, Text, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    subscription_status = Column(String(50), default="free")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    quiz_attempts = relationship("QuizAttempt", back_populates="user")
    subscriptions = relationship("Subscription", back_populates="user")

class Question(Base):
    __tablename__ = "questions"
    
    id = Column(Integer, primary_key=True, index=True)
    topic = Column(String(100), nullable=False, index=True)
    question_text = Column(Text, nullable=False)
    correct_answer = Column(String(500), nullable=False)
    options = Column(JSON, nullable=False)  # Array of options
    difficulty = Column(String(20), default="medium")  # easy, medium, hard
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    quiz_attempts = relationship("QuizAttempt", back_populates="question")

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    is_correct = Column(Boolean, nullable=False)
    answer_given = Column(String(500))
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    user = relationship("User", back_populates="quiz_attempts")
    question = relationship("Question", back_populates="quiz_attempts")

class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    stripe_customer_id = Column(String(255), unique=True, nullable=False)
    stripe_subscription_id = Column(String(255))
    plan_name = Column(String(100))
    status = Column(String(50))  # active, canceled, past_due, etc.
    active_status = Column(Boolean, default=False)
    current_period_start = Column(DateTime)
    current_period_end = Column(DateTime)
    next_billing_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="subscriptions")

class UserProgress(Base):
    __tablename__ = "user_progress"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    topic = Column(String(100), nullable=False)
    total_questions = Column(Integer, default=0)
    correct_answers = Column(Integer, default=0)
    last_activity = Column(DateTime, default=datetime.utcnow)
    streak_days = Column(Integer, default=0)
    best_streak = Column(Integer, default=0)
    
    # Indexes for efficient queries
    __table_args__ = (
        {'extend_existing': True}
    )

class Achievement(Base):
    __tablename__ = "achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    achievement_type = Column(String(100), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    icon = Column(String(50))
    earned_date = Column(DateTime, default=datetime.utcnow)
    
class AIInteraction(Base):
    __tablename__ = "ai_interactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    question = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    has_code = Column(Boolean, default=False)
    has_chart = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    rating = Column(Integer)  # User feedback on response quality
