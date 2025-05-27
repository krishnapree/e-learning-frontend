import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Ask from './pages/Ask'
import Quiz from './pages/Quiz'
import Dashboard from './pages/Dashboard'
import Subscription from './pages/Subscription'
import Login from './pages/Login'
import Register from './pages/Register'
import { useAuth } from './hooks/useAuth.tsx'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />
          
          {/* Protected routes */}
          <Route path="/ask" element={user ? <Ask /> : <Navigate to="/login" />} />
          <Route path="/quiz" element={user ? <Quiz /> : <Navigate to="/login" />} />
          <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/subscription" element={user ? <Subscription /> : <Navigate to="/login" />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
