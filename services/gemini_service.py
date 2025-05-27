import os
import google.generativeai as genai
from typing import Dict, Any, Optional
import json
import re

class GeminiService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "default_key")
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel('gemini-pro')
    
    async def get_response(self, question: str) -> Dict[str, Any]:
        """
        Get AI response for a question with potential code snippets and charts.
        """
        try:
            # Enhanced prompt to encourage structured responses
            enhanced_prompt = f"""
            You are an expert AI tutor. Please provide a comprehensive answer to this question: "{question}"

            Guidelines:
            1. Give clear, educational explanations
            2. If relevant, include a code example wrapped in ```language markers
            3. If the topic would benefit from visualization, mention "CHART_SUGGESTED" and briefly describe what kind of chart would help
            4. Break down complex topics into digestible parts
            5. Use examples and analogies when helpful
            6. Be encouraging and supportive in your tone

            Please provide your response:
            """
            
            response = self.model.generate_content(enhanced_prompt)
            response_text = response.text
            
            # Parse response for code snippets and chart suggestions
            result = {
                "text": response_text,
                "hasCode": False,
                "codeSnippet": None,
                "language": None,
                "hasChart": False,
                "chartData": None
            }
            
            # Extract code snippets
            code_pattern = r'```(\w+)?\n(.*?)\n```'
            code_matches = re.findall(code_pattern, response_text, re.DOTALL)
            
            if code_matches:
                language, code = code_matches[0]
                result["hasCode"] = True
                result["codeSnippet"] = code.strip()
                result["language"] = language or "text"
                
                # Clean the response text to remove code blocks for better formatting
                result["text"] = re.sub(code_pattern, "[Code example provided below]", response_text, flags=re.DOTALL)
            
            # Check for chart suggestions
            if "CHART_SUGGESTED" in response_text.upper() or any(keyword in question.lower() for keyword in ["graph", "chart", "plot", "visualize", "data", "statistics"]):
                result["hasChart"] = True
                result["chartData"] = self._generate_sample_chart_data(question)
            
            return result
            
        except Exception as e:
            # Fallback response
            return {
                "text": f"I apologize, but I'm having trouble processing your question right now. Error: {str(e)}. Please try rephrasing your question or try again later.",
                "hasCode": False,
                "hasChart": False
            }
    
    def _generate_sample_chart_data(self, question: str) -> Optional[list]:
        """
        Generate sample data structure for charts based on question context.
        This is a placeholder - in a real implementation, you might use the AI
        to generate actual data or connect to real data sources.
        """
        # Determine chart type based on question keywords
        question_lower = question.lower()
        
        if any(keyword in question_lower for keyword in ["trend", "time", "over time", "progress"]):
            # Time series data
            return [
                {"date": "2024-01-01", "value": 65},
                {"date": "2024-01-02", "value": 72},
                {"date": "2024-01-03", "value": 68},
                {"date": "2024-01-04", "value": 75},
                {"date": "2024-01-05", "value": 78}
            ]
        elif any(keyword in question_lower for keyword in ["compare", "comparison", "vs", "versus"]):
            # Comparison data
            return [
                {"category": "Option A", "value": 85},
                {"category": "Option B", "value": 72},
                {"category": "Option C", "value": 91},
                {"category": "Option D", "value": 68}
            ]
        else:
            # Generic data
            return [
                {"label": "Category 1", "value": 30},
                {"label": "Category 2", "value": 45},
                {"label": "Category 3", "value": 25}
            ]
    
    async def generate_explanation_with_examples(self, topic: str) -> str:
        """
        Generate a detailed explanation with examples for a given topic.
        """
        try:
            prompt = f"""
            Provide a comprehensive educational explanation of "{topic}" that includes:
            1. A clear definition
            2. Key concepts and principles
            3. Real-world examples
            4. Common misconceptions to avoid
            5. How it relates to other concepts
            
            Make it suitable for a learning platform - educational but engaging.
            """
            
            response = self.model.generate_content(prompt)
            return response.text
            
        except Exception as e:
            return f"I'm sorry, I couldn't generate an explanation for '{topic}' at the moment. Please try again later."
    
    async def analyze_learning_pattern(self, user_history: list) -> str:
        """
        Analyze user's learning patterns and provide personalized recommendations.
        """
        try:
            # Convert history to a summary
            topics = [item.get('topic', 'Unknown') for item in user_history]
            scores = [item.get('score', 0) for item in user_history]
            
            avg_score = sum(scores) / len(scores) if scores else 0
            
            prompt = f"""
            Analyze this learning pattern and provide recommendations:
            
            Topics studied: {', '.join(topics)}
            Average score: {avg_score:.1f}%
            Number of sessions: {len(user_history)}
            
            Please provide:
            1. Strengths identified
            2. Areas for improvement
            3. Recommended next topics
            4. Study strategies
            
            Keep it encouraging and actionable.
            """
            
            response = self.model.generate_content(prompt)
            return response.text
            
        except Exception as e:
            return "I'm working on analyzing your learning patterns. Please continue learning, and I'll have insights for you soon!"
