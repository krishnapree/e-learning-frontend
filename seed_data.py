import os
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Base, User, Question
from auth import AuthManager

def create_sample_questions():
    """Create sample questions for the quiz system."""
    return [
        # Mathematics
        {
            "topic": "mathematics",
            "question_text": "What is the derivative of x²?",
            "correct_answer": "2x",
            "options": ["2x", "x²", "2", "x"],
            "difficulty": "medium"
        },
        {
            "topic": "mathematics",
            "question_text": "What is the integral of 2x?",
            "correct_answer": "x² + C",
            "options": ["x² + C", "2x²", "x² + x", "2"],
            "difficulty": "medium"
        },
        {
            "topic": "mathematics",
            "question_text": "What is 15% of 200?",
            "correct_answer": "30",
            "options": ["30", "25", "35", "20"],
            "difficulty": "easy"
        },
        {
            "topic": "mathematics",
            "question_text": "In a right triangle, if one angle is 90°, what is the sum of the other two angles?",
            "correct_answer": "90°",
            "options": ["90°", "180°", "270°", "45°"],
            "difficulty": "easy"
        },
        
        # Programming
        {
            "topic": "programming",
            "question_text": "Which of the following is NOT a primitive data type in Python?",
            "correct_answer": "list",
            "options": ["int", "float", "str", "list"],
            "difficulty": "easy"
        },
        {
            "topic": "programming",
            "question_text": "What does 'API' stand for?",
            "correct_answer": "Application Programming Interface",
            "options": [
                "Application Programming Interface",
                "Advanced Programming Integration",
                "Automated Program Instruction",
                "Application Process Integration"
            ],
            "difficulty": "easy"
        },
        {
            "topic": "programming",
            "question_text": "Which sorting algorithm has the best average-case time complexity?",
            "correct_answer": "Quick Sort",
            "options": ["Bubble Sort", "Selection Sort", "Quick Sort", "Insertion Sort"],
            "difficulty": "hard"
        },
        {
            "topic": "programming",
            "question_text": "What is the time complexity of accessing an element in an array by index?",
            "correct_answer": "O(1)",
            "options": ["O(1)", "O(log n)", "O(n)", "O(n²)"],
            "difficulty": "medium"
        },
        
        # Science
        {
            "topic": "science",
            "question_text": "What is the chemical symbol for water?",
            "correct_answer": "H₂O",
            "options": ["H₂O", "CO₂", "O₂", "NaCl"],
            "difficulty": "easy"
        },
        {
            "topic": "science",
            "question_text": "What is the speed of light in vacuum?",
            "correct_answer": "299,792,458 m/s",
            "options": [
                "299,792,458 m/s",
                "300,000,000 m/s",
                "150,000,000 m/s",
                "299,792,458 km/h"
            ],
            "difficulty": "medium"
        },
        {
            "topic": "science",
            "question_text": "Which planet is known as the 'Red Planet'?",
            "correct_answer": "Mars",
            "options": ["Mars", "Venus", "Jupiter", "Saturn"],
            "difficulty": "easy"
        },
        {
            "topic": "science",
            "question_text": "What is the powerhouse of the cell?",
            "correct_answer": "Mitochondria",
            "options": ["Nucleus", "Mitochondria", "Ribosome", "Endoplasmic Reticulum"],
            "difficulty": "easy"
        },
        
        # History
        {
            "topic": "history",
            "question_text": "In which year did World War II end?",
            "correct_answer": "1945",
            "options": ["1945", "1944", "1946", "1943"],
            "difficulty": "easy"
        },
        {
            "topic": "history",
            "question_text": "Who was the first person to walk on the moon?",
            "correct_answer": "Neil Armstrong",
            "options": ["Neil Armstrong", "Buzz Aldrin", "John Glenn", "Alan Shepard"],
            "difficulty": "easy"
        },
        {
            "topic": "history",
            "question_text": "The Berlin Wall fell in which year?",
            "correct_answer": "1989",
            "options": ["1989", "1991", "1987", "1990"],
            "difficulty": "medium"
        },
        
        # General Knowledge
        {
            "topic": "general",
            "question_text": "What is the capital of Australia?",
            "correct_answer": "Canberra",
            "options": ["Sydney", "Melbourne", "Canberra", "Perth"],
            "difficulty": "medium"
        },
        {
            "topic": "general",
            "question_text": "Which is the largest ocean on Earth?",
            "correct_answer": "Pacific Ocean",
            "options": ["Atlantic Ocean", "Indian Ocean", "Pacific Ocean", "Arctic Ocean"],
            "difficulty": "easy"
        },
        {
            "topic": "general",
            "question_text": "How many continents are there?",
            "correct_answer": "7",
            "options": ["5", "6", "7", "8"],
            "difficulty": "easy"
        },
        
        # Physics
        {
            "topic": "physics",
            "question_text": "What is Newton's second law of motion?",
            "correct_answer": "F = ma",
            "options": ["F = ma", "E = mc²", "v = u + at", "PV = nRT"],
            "difficulty": "medium"
        },
        {
            "topic": "physics",
            "question_text": "What is the unit of electric current?",
            "correct_answer": "Ampere",
            "options": ["Volt", "Ohm", "Ampere", "Watt"],
            "difficulty": "easy"
        },
        {
            "topic": "physics",
            "question_text": "What is the acceleration due to gravity on Earth?",
            "correct_answer": "9.8 m/s²",
            "options": ["9.8 m/s²", "10 m/s²", "9.6 m/s²", "8.9 m/s²"],
            "difficulty": "medium"
        }
    ]

def create_sample_users():
    """Create sample users for testing."""
    auth_manager = AuthManager()
    
    return [
        {
            "name": "Demo User",
            "email": "demo@example.com",
            "password": "password123"
        },
        {
            "name": "Test Student",
            "email": "student@example.com", 
            "password": "student123"
        }
    ]

def seed_database():
    """Seed the database with sample data."""
    try:
        # Create tables
        Base.metadata.create_all(bind=engine)
        
        db = SessionLocal()
        
        print("Seeding database...")
        
        # Check if data already exists
        existing_questions = db.query(Question).count()
        existing_users = db.query(User).count()
        
        if existing_questions > 0:
            print(f"Database already has {existing_questions} questions. Skipping question seeding.")
        else:
            # Add sample questions
            questions_data = create_sample_questions()
            for q_data in questions_data:
                question = Question(
                    topic=q_data["topic"],
                    question_text=q_data["question_text"],
                    correct_answer=q_data["correct_answer"],
                    options=q_data["options"],
                    difficulty=q_data.get("difficulty", "medium")
                )
                db.add(question)
            
            print(f"Added {len(questions_data)} questions to the database.")
        
        if existing_users > 0:
            print(f"Database already has {existing_users} users. Skipping user seeding.")
        else:
            # Add sample users
            auth_manager = AuthManager()
            users_data = create_sample_users()
            
            for u_data in users_data:
                try:
                    user = auth_manager.create_user(
                        db, 
                        u_data["name"], 
                        u_data["email"], 
                        u_data["password"]
                    )
                    print(f"Created user: {user.email}")
                except ValueError as e:
                    print(f"Skipped user {u_data['email']}: {e}")
        
        db.commit()
        db.close()
        
        print("Database seeding completed successfully!")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        if 'db' in locals():
            db.rollback()
            db.close()

if __name__ == "__main__":
    seed_database()
