import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const Home: React.FC = () => {
  const { user } = useAuth()

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-primary-100 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8">
              <div className="w-20 h-20 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-brain text-white text-3xl"></i>
              </div>
              <h1 className="text-5xl font-bold text-gray-900 mb-6">
                Learn Smarter with <span className="text-primary-600">AI Tutor</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Get personalized explanations, take adaptive quizzes, and track your progress 
                with our advanced AI-powered tutoring platform.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              {user ? (
                <>
                  <Link to="/ask" className="btn btn-primary btn-lg">
                    <i className="fas fa-comments mr-2"></i>
                    Start Learning
                  </Link>
                  <Link to="/dashboard" className="btn btn-outline btn-lg">
                    <i className="fas fa-chart-line mr-2"></i>
                    View Progress
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/register" className="btn btn-primary btn-lg">
                    <i className="fas fa-rocket mr-2"></i>
                    Get Started Free
                  </Link>
                  <Link to="/login" className="btn btn-outline btn-lg">
                    <i className="fas fa-sign-in-alt mr-2"></i>
                    Sign In
                  </Link>
                </>
              )}
            </div>

            {/* Features Preview */}
            <div className="grid md:grid-cols-3 gap-8 mt-16">
              <div className="text-center">
                <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md">
                  <i className="fas fa-microphone text-primary-600 text-2xl"></i>
                </div>
                <h3 className="text-lg font-semibold mb-2">Voice & Text Input</h3>
                <p className="text-gray-600">Ask questions using your voice or text and get instant AI-powered responses</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md">
                  <i className="fas fa-puzzle-piece text-primary-600 text-2xl"></i>
                </div>
                <h3 className="text-lg font-semibold mb-2">Adaptive Quizzes</h3>
                <p className="text-gray-600">Take personalized quizzes that adapt to your learning pace and weak areas</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md">
                  <i className="fas fa-chart-bar text-primary-600 text-2xl"></i>
                </div>
                <h3 className="text-lg font-semibold mb-2">Progress Tracking</h3>
                <p className="text-gray-600">Monitor your learning journey with detailed analytics and insights</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose AI Tutor?</h2>
              <p className="text-xl text-gray-600">Experience the future of personalized learning</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Feature 1 */}
              <div>
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-robot text-primary-600 text-xl"></i>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">AI-Powered Explanations</h3>
                    <p className="text-gray-600 mb-4">
                      Get detailed explanations with visual aids, code snippets, and interactive examples 
                      powered by advanced AI technology.
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div>
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-brain text-success-600 text-xl"></i>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Personalized Learning</h3>
                    <p className="text-gray-600 mb-4">
                      Our AI adapts to your learning style and identifies areas that need improvement 
                      for a truly personalized experience.
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 3 */}
              <div>
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-headphones text-warning-600 text-xl"></i>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Voice Interaction</h3>
                    <p className="text-gray-600 mb-4">
                      Speak naturally to ask questions and get answers. Perfect for hands-free learning 
                      and accessibility.
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 4 */}
              <div>
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-trophy text-purple-600 text-xl"></i>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Track Progress</h3>
                    <p className="text-gray-600 mb-4">
                      Monitor your learning journey with comprehensive analytics, performance metrics, 
                      and achievement tracking.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="bg-primary-600 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to Transform Your Learning?
              </h2>
              <p className="text-xl text-primary-100 mb-8">
                Join thousands of learners who are already using AI Tutor to achieve their goals.
              </p>
              <Link to="/register" className="btn bg-white text-primary-600 hover:bg-gray-100 btn-lg">
                <i className="fas fa-rocket mr-2"></i>
                Start Learning Today
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export default Home
