import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'

interface Course {
  id: number
  name: string
  code: string
  description: string
  credits: number
  department: string
  lecturer: string
  semester: string
  max_capacity: number
  enrolled_count: number
  available_spots: number
}

const Courses: React.FC = () => {
  const { } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      setLoading(true)
      // This will be connected to the actual API
      // For now, showing mock data
      const mockCourses: Course[] = [
        {
          id: 1,
          name: "Introduction to Programming",
          code: "CS101",
          description: "Learn the fundamentals of programming using Python",
          credits: 3,
          department: "Computer Science",
          lecturer: "Prof. David Wilson",
          semester: "Fall 2024",
          max_capacity: 30,
          enrolled_count: 25,
          available_spots: 5
        },
        {
          id: 2,
          name: "Data Structures and Algorithms",
          code: "CS201",
          description: "Advanced programming concepts and algorithm design",
          credits: 4,
          department: "Computer Science",
          lecturer: "Dr. Emily Rodriguez",
          semester: "Fall 2024",
          max_capacity: 25,
          enrolled_count: 20,
          available_spots: 5
        },
        {
          id: 3,
          name: "Calculus I",
          code: "MATH101",
          description: "Introduction to differential and integral calculus",
          credits: 4,
          department: "Mathematics",
          lecturer: "Prof. James Thompson",
          semester: "Fall 2024",
          max_capacity: 35,
          enrolled_count: 30,
          available_spots: 5
        }
      ]
      
      setCourses(mockCourses)
    } catch (err) {
      setError('Failed to fetch courses')
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = async (courseId: number) => {
    try {
      // This will be connected to the actual API
      alert(`Enrollment request submitted for course ${courseId}`)
    } catch (err) {
      alert('Failed to enroll in course')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading courses...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Browse Courses
          </h1>
          <p className="text-gray-600">
            Discover and enroll in courses for the current semester
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">All Departments</option>
                <option value="cs">Computer Science</option>
                <option value="math">Mathematics</option>
                <option value="eng">Engineering</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Credits
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">Any Credits</option>
                <option value="3">3 Credits</option>
                <option value="4">4 Credits</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Availability
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">All Courses</option>
                <option value="available">Available</option>
                <option value="waitlist">Waitlist</option>
              </select>
            </div>
          </div>
        </div>

        {/* Course Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div key={course.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {course.name}
                    </h3>
                    <p className="text-sm text-gray-500">{course.code}</p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                    {course.credits} Credits
                  </span>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {course.description}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <i className="fas fa-building mr-2 w-4"></i>
                    {course.department}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <i className="fas fa-chalkboard-teacher mr-2 w-4"></i>
                    {course.lecturer}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <i className="fas fa-calendar mr-2 w-4"></i>
                    {course.semester}
                  </div>
                </div>

                {/* Enrollment Status */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Enrollment</span>
                    <span>{course.enrolled_count}/{course.max_capacity}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full" 
                      style={{ width: `${(course.enrolled_count / course.max_capacity) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {course.available_spots} spots available
                  </p>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleEnroll(course.id)}
                  disabled={course.available_spots === 0}
                  className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    course.available_spots > 0
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {course.available_spots > 0 ? (
                    <>
                      <i className="fas fa-plus mr-2"></i>
                      Enroll Now
                    </>
                  ) : (
                    <>
                      <i className="fas fa-clock mr-2"></i>
                      Join Waitlist
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {courses.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">
              <i className="fas fa-book-open"></i>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No courses found
            </h3>
            <p className="text-gray-600">
              Try adjusting your filters or check back later for new courses.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Courses
