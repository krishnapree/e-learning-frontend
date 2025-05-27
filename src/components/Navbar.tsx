import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.tsx'

const Navbar: React.FC = () => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const isActive = (path: string) => {
    return location.pathname === path
  }

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <i className="fas fa-brain text-white text-lg"></i>
            </div>
            <span className="text-xl font-bold text-gray-800">AI Tutor</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              to="/" 
              className={`text-gray-600 hover:text-primary-600 transition-colors ${
                isActive('/') ? 'text-primary-600 font-medium' : ''
              }`}
            >
              Home
            </Link>
            
            {user && (
              <>
                <Link 
                  to="/ask" 
                  className={`text-gray-600 hover:text-primary-600 transition-colors ${
                    isActive('/ask') ? 'text-primary-600 font-medium' : ''
                  }`}
                >
                  Ask AI
                </Link>
                <Link 
                  to="/quiz" 
                  className={`text-gray-600 hover:text-primary-600 transition-colors ${
                    isActive('/quiz') ? 'text-primary-600 font-medium' : ''
                  }`}
                >
                  Quiz
                </Link>
                <Link 
                  to="/dashboard" 
                  className={`text-gray-600 hover:text-primary-600 transition-colors ${
                    isActive('/dashboard') ? 'text-primary-600 font-medium' : ''
                  }`}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/subscription" 
                  className={`text-gray-600 hover:text-primary-600 transition-colors ${
                    isActive('/subscription') ? 'text-primary-600 font-medium' : ''
                  }`}
                >
                  Subscription
                </Link>
              </>
            )}
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <div className="hidden md:flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-medium text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-gray-700">{user.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn btn-outline btn-sm"
                >
                  <i className="fas fa-sign-out-alt mr-2"></i>
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/login" className="btn btn-outline btn-sm">
                  Login
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button className="text-gray-600 hover:text-gray-800">
              <i className="fas fa-bars text-xl"></i>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
