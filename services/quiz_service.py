import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Dict, Any

from models import User, Question, QuizAttempt, UserProgress, Achievement

class QuizService:
    def __init__(self):
        self.questions_per_quiz = 5
        self.difficulty_weights = {"easy": 0.3, "medium": 0.5, "hard": 0.2}
    
    def generate_adaptive_quiz(self, db: Session, user_id: int) -> List[Dict]:
        """
        Generate an adaptive quiz based on user's performance history.
        """
        try:
            # Get user's weak areas
            weak_topics = self._get_weak_topics(db, user_id)
            
            # If no history, get a general mix
            if not weak_topics:
                weak_topics = ['mathematics', 'science', 'programming', 'general']
            
            questions = []
            
            # Get questions from weak topics (70% of quiz)
            weak_questions_count = int(self.questions_per_quiz * 0.7)
            weak_questions = self._get_questions_by_topics(db, weak_topics, weak_questions_count)
            questions.extend(weak_questions)
            
            # Fill remaining with random questions
            remaining_count = self.questions_per_quiz - len(questions)
            if remaining_count > 0:
                random_questions = self._get_random_questions(db, remaining_count, exclude_ids=[q['id'] for q in questions])
                questions.extend(random_questions)
            
            # Shuffle the final list
            random.shuffle(questions)
            
            return questions[:self.questions_per_quiz]
            
        except Exception as e:
            print(f"Error generating adaptive quiz: {e}")
            # Fallback to random questions
            return self._get_random_questions(db, self.questions_per_quiz)
    
    def _get_weak_topics(self, db: Session, user_id: int, limit: int = 3) -> List[str]:
        """
        Identify user's weak topics based on performance.
        """
        try:
            # Get topics with low accuracy rates
            topic_stats = db.query(
                Question.topic,
                func.count(QuizAttempt.id).label('total'),
                func.sum(func.cast(QuizAttempt.is_correct, db.bind.dialect.INTEGER)).label('correct')
            ).join(
                QuizAttempt, Question.id == QuizAttempt.question_id
            ).filter(
                QuizAttempt.user_id == user_id
            ).group_by(
                Question.topic
            ).having(
                func.count(QuizAttempt.id) >= 3  # At least 3 attempts
            ).all()
            
            # Calculate accuracy and sort by worst performance
            weak_topics = []
            for topic, total, correct in topic_stats:
                accuracy = (correct or 0) / total if total > 0 else 0
                if accuracy < 0.7:  # Less than 70% accuracy
                    weak_topics.append((topic, accuracy))
            
            # Sort by accuracy (worst first) and return topic names
            weak_topics.sort(key=lambda x: x[1])
            return [topic for topic, _ in weak_topics[:limit]]
            
        except Exception as e:
            print(f"Error getting weak topics: {e}")
            return []
    
    def _get_questions_by_topics(self, db: Session, topics: List[str], count: int) -> List[Dict]:
        """
        Get questions from specific topics.
        """
        try:
            questions = db.query(Question).filter(
                Question.topic.in_(topics)
            ).order_by(func.random()).limit(count).all()
            
            return [self._format_question(q) for q in questions]
            
        except Exception as e:
            print(f"Error getting questions by topics: {e}")
            return []
    
    def _get_random_questions(self, db: Session, count: int, exclude_ids: List[int] = None) -> List[Dict]:
        """
        Get random questions from the database.
        """
        try:
            query = db.query(Question)
            
            if exclude_ids:
                query = query.filter(~Question.id.in_(exclude_ids))
            
            questions = query.order_by(func.random()).limit(count).all()
            
            return [self._format_question(q) for q in questions]
            
        except Exception as e:
            print(f"Error getting random questions: {e}")
            return []
    
    def _format_question(self, question: Question) -> Dict:
        """
        Format a question for the frontend.
        """
        return {
            "id": question.id,
            "topic": question.topic,
            "question_text": question.question_text,
            "correct_answer": question.correct_answer,
            "options": question.options
        }
    
    def submit_quiz_results(self, db: Session, user_id: int, answers: List[Dict]):
        """
        Submit quiz results and update user progress.
        """
        try:
            correct_count = 0
            
            for answer in answers:
                question_id = answer.get('questionId')
                is_correct = answer.get('isCorrect', False)
                
                if is_correct:
                    correct_count += 1
                
                # Record the attempt
                attempt = QuizAttempt(
                    user_id=user_id,
                    question_id=question_id,
                    is_correct=is_correct,
                    timestamp=datetime.utcnow()
                )
                db.add(attempt)
            
            # Update user progress
            self._update_user_progress(db, user_id, answers)
            
            # Check for achievements
            self._check_achievements(db, user_id, correct_count, len(answers))
            
            db.commit()
            
        except Exception as e:
            print(f"Error submitting quiz results: {e}")
            db.rollback()
            raise
    
    def _update_user_progress(self, db: Session, user_id: int, answers: List[Dict]):
        """
        Update user progress statistics.
        """
        try:
            # Group answers by topic
            topic_stats = {}
            
            for answer in answers:
                question = db.query(Question).filter(Question.id == answer.get('questionId')).first()
                if not question:
                    continue
                
                topic = question.topic
                if topic not in topic_stats:
                    topic_stats[topic] = {'total': 0, 'correct': 0}
                
                topic_stats[topic]['total'] += 1
                if answer.get('isCorrect', False):
                    topic_stats[topic]['correct'] += 1
            
            # Update progress for each topic
            for topic, stats in topic_stats.items():
                progress = db.query(UserProgress).filter(
                    UserProgress.user_id == user_id,
                    UserProgress.topic == topic
                ).first()
                
                if not progress:
                    progress = UserProgress(
                        user_id=user_id,
                        topic=topic,
                        total_questions=stats['total'],
                        correct_answers=stats['correct'],
                        last_activity=datetime.utcnow()
                    )
                    db.add(progress)
                else:
                    progress.total_questions += stats['total']
                    progress.correct_answers += stats['correct']
                    progress.last_activity = datetime.utcnow()
            
            # Update streak
            self._update_streak(db, user_id)
            
        except Exception as e:
            print(f"Error updating user progress: {e}")
    
    def _update_streak(self, db: Session, user_id: int):
        """
        Update user's learning streak.
        """
        try:
            today = datetime.utcnow().date()
            yesterday = today - timedelta(days=1)
            
            # Check if user had activity yesterday
            yesterday_activity = db.query(QuizAttempt).filter(
                QuizAttempt.user_id == user_id,
                func.date(QuizAttempt.timestamp) == yesterday
            ).first()
            
            # Get user's progress record (or create one)
            progress = db.query(UserProgress).filter(
                UserProgress.user_id == user_id
            ).first()
            
            if not progress:
                progress = UserProgress(
                    user_id=user_id,
                    topic='general',
                    streak_days=1,
                    best_streak=1
                )
                db.add(progress)
            else:
                if yesterday_activity:
                    # Continue streak
                    progress.streak_days += 1
                else:
                    # Reset streak
                    progress.streak_days = 1
                
                # Update best streak
                if progress.streak_days > progress.best_streak:
                    progress.best_streak = progress.streak_days
            
        except Exception as e:
            print(f"Error updating streak: {e}")
    
    def _check_achievements(self, db: Session, user_id: int, correct_count: int, total_count: int):
        """
        Check and award achievements based on performance.
        """
        try:
            achievements_to_award = []
            
            # Perfect score achievement
            if correct_count == total_count and total_count >= 5:
                achievements_to_award.append({
                    'type': 'perfect_score',
                    'title': 'Perfect Score!',
                    'description': f'Got all {total_count} questions correct in a quiz',
                    'icon': 'fa-star'
                })
            
            # First quiz achievement
            previous_attempts = db.query(QuizAttempt).filter(
                QuizAttempt.user_id == user_id
            ).count()
            
            if previous_attempts <= total_count:  # This is likely their first quiz
                achievements_to_award.append({
                    'type': 'first_quiz',
                    'title': 'Quiz Beginner',
                    'description': 'Completed your first quiz',
                    'icon': 'fa-graduation-cap'
                })
            
            # Award achievements
            for achievement_data in achievements_to_award:
                # Check if already awarded
                existing = db.query(Achievement).filter(
                    Achievement.user_id == user_id,
                    Achievement.achievement_type == achievement_data['type']
                ).first()
                
                if not existing:
                    achievement = Achievement(
                        user_id=user_id,
                        achievement_type=achievement_data['type'],
                        title=achievement_data['title'],
                        description=achievement_data['description'],
                        icon=achievement_data['icon'],
                        earned_date=datetime.utcnow()
                    )
                    db.add(achievement)
            
        except Exception as e:
            print(f"Error checking achievements: {e}")
    
    def get_dashboard_data(self, db: Session, user_id: int, time_range: str = "week") -> Dict[str, Any]:
        """
        Get comprehensive dashboard data for a user.
        """
        try:
            # Calculate date range
            end_date = datetime.utcnow()
            if time_range == "week":
                start_date = end_date - timedelta(days=7)
            elif time_range == "month":
                start_date = end_date - timedelta(days=30)
            else:  # all time
                start_date = datetime(2020, 1, 1)  # Far back date
            
            # Get overall statistics
            total_attempts = db.query(QuizAttempt).filter(
                QuizAttempt.user_id == user_id,
                QuizAttempt.timestamp >= start_date
            ).count()
            
            correct_attempts = db.query(QuizAttempt).filter(
                QuizAttempt.user_id == user_id,
                QuizAttempt.timestamp >= start_date,
                QuizAttempt.is_correct == True
            ).count()
            
            overall_score = int((correct_attempts / total_attempts * 100)) if total_attempts > 0 else 0
            
            # Get recent activity
            recent_activity = self._get_recent_activity(db, user_id, start_date)
            
            # Get topic performance
            topic_performance = self._get_topic_performance(db, user_id, start_date)
            
            # Get streak information
            streak = self._get_current_streak(db, user_id)
            
            # Get achievements
            achievements = self._get_user_achievements(db, user_id)
            
            return {
                "overall_score": overall_score,
                "total_questions": total_attempts,
                "correct_answers": correct_attempts,
                "recent_activity": recent_activity,
                "topic_performance": topic_performance,
                "streak": streak,
                "achievements": achievements
            }
            
        except Exception as e:
            print(f"Error getting dashboard data: {e}")
            return {
                "overall_score": 0,
                "total_questions": 0,
                "correct_answers": 0,
                "recent_activity": [],
                "topic_performance": [],
                "streak": 0,
                "achievements": []
            }
    
    def _get_recent_activity(self, db: Session, user_id: int, start_date: datetime) -> List[Dict]:
        """
        Get recent quiz activity for charts.
        """
        try:
            # Group attempts by date and calculate daily scores
            daily_stats = db.query(
                func.date(QuizAttempt.timestamp).label('date'),
                func.count(QuizAttempt.id).label('total'),
                func.sum(func.cast(QuizAttempt.is_correct, db.bind.dialect.INTEGER)).label('correct')
            ).filter(
                QuizAttempt.user_id == user_id,
                QuizAttempt.timestamp >= start_date
            ).group_by(
                func.date(QuizAttempt.timestamp)
            ).order_by('date').all()
            
            activity = []
            for date, total, correct in daily_stats:
                score = int((correct or 0) / total * 100) if total > 0 else 0
                activity.append({
                    "date": date.isoformat(),
                    "score": score,
                    "topic": "Mixed"  # Could be enhanced to show dominant topic
                })
            
            return activity
            
        except Exception as e:
            print(f"Error getting recent activity: {e}")
            return []
    
    def _get_topic_performance(self, db: Session, user_id: int, start_date: datetime) -> List[Dict]:
        """
        Get performance breakdown by topic.
        """
        try:
            topic_stats = db.query(
                Question.topic,
                func.count(QuizAttempt.id).label('total'),
                func.sum(func.cast(QuizAttempt.is_correct, db.bind.dialect.INTEGER)).label('correct')
            ).join(
                QuizAttempt, Question.id == QuizAttempt.question_id
            ).filter(
                QuizAttempt.user_id == user_id,
                QuizAttempt.timestamp >= start_date
            ).group_by(
                Question.topic
            ).all()
            
            performance = []
            for topic, total, correct in topic_stats:
                percentage = int((correct or 0) / total * 100) if total > 0 else 0
                performance.append({
                    "topic": topic.title(),
                    "correct": correct or 0,
                    "total": total,
                    "percentage": percentage
                })
            
            return performance
            
        except Exception as e:
            print(f"Error getting topic performance: {e}")
            return []
    
    def _get_current_streak(self, db: Session, user_id: int) -> int:
        """
        Get user's current learning streak.
        """
        try:
            progress = db.query(UserProgress).filter(
                UserProgress.user_id == user_id
            ).first()
            
            return progress.streak_days if progress else 0
            
        except Exception as e:
            print(f"Error getting current streak: {e}")
            return 0
    
    def _get_user_achievements(self, db: Session, user_id: int) -> List[Dict]:
        """
        Get user's achievements.
        """
        try:
            achievements = db.query(Achievement).filter(
                Achievement.user_id == user_id
            ).order_by(desc(Achievement.earned_date)).all()
            
            return [{
                "id": str(achievement.id),
                "title": achievement.title,
                "description": achievement.description,
                "earned_date": achievement.earned_date.isoformat(),
                "icon": achievement.icon
            } for achievement in achievements]
            
        except Exception as e:
            print(f"Error getting user achievements: {e}")
            return []
