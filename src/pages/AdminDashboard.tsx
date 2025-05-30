import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
// import { apiClient } from "../api/client";

interface AcademicOverview {
  total_students: number;
  total_lecturers: number;
  total_courses: number;
  total_departments: number;
  total_programs: number;
  current_semester: string;
  current_enrollments: number;
  system_status: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  student_id?: string;
  employee_id?: string;
  is_active: boolean;
  created_at: string;
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState<AcademicOverview | null>(null);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch academic overview
      const overviewResponse = await fetch("/api/academic/overview", {
        credentials: "include",
      });
      if (overviewResponse.ok) {
        const overviewData = await overviewResponse.json();
        setOverview(overviewData);
      }

      // Fetch recent users (students)
      const usersResponse = await fetch("/api/users/by-role/student", {
        credentials: "include",
      });
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setRecentUsers(usersData.users.slice(0, 5)); // Show latest 5
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600">
            Welcome back, {user?.name}. Here's your system overview.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                {
                  id: "overview",
                  name: "System Overview",
                  icon: "fa-chart-line",
                },
                { id: "users", name: "User Management", icon: "fa-users" },
                {
                  id: "academic",
                  name: "Academic Structure",
                  icon: "fa-graduation-cap",
                },
                { id: "analytics", name: "Analytics", icon: "fa-analytics" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? "border-primary-500 text-primary-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <i className={`fas ${tab.icon} mr-2`}></i>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && overview && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <i className="fas fa-user-graduate text-blue-600"></i>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">
                      Total Students
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {overview.total_students}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <i className="fas fa-chalkboard-teacher text-green-600"></i>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">
                      Total Lecturers
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {overview.total_lecturers}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <i className="fas fa-book text-purple-600"></i>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">
                      Active Courses
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {overview.total_courses}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <i className="fas fa-users text-orange-600"></i>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">
                      Current Enrollments
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {overview.current_enrollments}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* System Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  System Status
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Current Semester</span>
                    <span className="font-medium">
                      {overview.current_semester}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">System Status</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <i className="fas fa-circle text-green-400 mr-1"></i>
                      {overview.system_status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Departments</span>
                    <span className="font-medium">
                      {overview.total_departments}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Programs</span>
                    <span className="font-medium">
                      {overview.total_programs}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Recent Users
                </h3>
                <div className="space-y-3">
                  {recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 font-medium text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {user.email}
                        </p>
                      </div>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {user.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  User Management
                </h3>
                <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
                  <i className="fas fa-plus mr-2"></i>
                  Add New User
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <i className="fas fa-user-graduate text-blue-600"></i>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-900">
                        Students
                      </p>
                      <p className="text-2xl font-bold text-blue-600">
                        {overview?.total_students || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <i className="fas fa-chalkboard-teacher text-green-600"></i>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-900">
                        Lecturers
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        {overview?.total_lecturers || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <i className="fas fa-shield-alt text-purple-600"></i>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-purple-900">
                        Admins
                      </p>
                      <p className="text-2xl font-bold text-purple-600">3</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Recent Users</h4>
                  <a
                    href="/user-management"
                    className="text-primary-600 hover:text-primary-700 text-sm"
                  >
                    View All Users →
                  </a>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Joined
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recentUsers.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                                <span className="text-primary-600 font-medium text-sm">
                                  {user.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.is_active
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {user.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Academic Structure Tab */}
        {activeTab === "academic" && overview && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-building text-purple-600"></i>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">
                      Departments
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {overview.total_departments}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-graduation-cap text-orange-600"></i>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">
                      Programs
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {overview.total_programs}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-book text-blue-600"></i>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Courses</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {overview.total_courses}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-calendar text-green-600"></i>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">
                      Current Semester
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {overview.current_semester}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Department Management
                  </h3>
                  <button className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700">
                    <i className="fas fa-plus mr-1"></i>
                    Add Department
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <i className="fas fa-laptop-code text-purple-600 text-sm"></i>
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">
                          Computer Science
                        </p>
                        <p className="text-sm text-gray-500">15 Programs</p>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <i className="fas fa-ellipsis-v"></i>
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <i className="fas fa-calculator text-blue-600 text-sm"></i>
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">Mathematics</p>
                        <p className="text-sm text-gray-500">8 Programs</p>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <i className="fas fa-ellipsis-v"></i>
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <i className="fas fa-flask text-green-600 text-sm"></i>
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">Physics</p>
                        <p className="text-sm text-gray-500">6 Programs</p>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <i className="fas fa-ellipsis-v"></i>
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Program Management
                  </h3>
                  <button className="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700">
                    <i className="fas fa-plus mr-1"></i>
                    Add Program
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <span className="text-orange-600 font-bold text-xs">
                          BS
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">
                          Bachelor of Science
                        </p>
                        <p className="text-sm text-gray-500">4 Year Program</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">120 Students</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <span className="text-purple-600 font-bold text-xs">
                          MS
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">
                          Master of Science
                        </p>
                        <p className="text-sm text-gray-500">2 Year Program</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">45 Students</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                        <span className="text-red-600 font-bold text-xs">
                          PhD
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">
                          Doctor of Philosophy
                        </p>
                        <p className="text-sm text-gray-500">
                          4-6 Year Program
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">12 Students</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && overview && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Enrollment Rate
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      84.2%
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-chart-line text-green-600"></i>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-green-600 text-sm">↗ +5.2%</span>
                  <span className="text-gray-500 text-sm ml-1">
                    from last month
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Completion Rate
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      92.8%
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-graduation-cap text-blue-600"></i>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-green-600 text-sm">↗ +2.1%</span>
                  <span className="text-gray-500 text-sm ml-1">
                    from last month
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Average Grade
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">3.45</p>
                  </div>
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-star text-yellow-600"></i>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-green-600 text-sm">↗ +0.15</span>
                  <span className="text-gray-500 text-sm ml-1">
                    from last month
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Active Sessions
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      1,247
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-users text-purple-600"></i>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-red-600 text-sm">↘ -3.2%</span>
                  <span className="text-gray-500 text-sm ml-1">
                    from last month
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Enrollment Trends
                </h3>
                <div className="h-64 flex items-end justify-between space-x-2">
                  {[65, 78, 82, 75, 88, 92, 85, 90, 87, 94, 89, 96].map(
                    (height, index) => (
                      <div
                        key={index}
                        className="flex-1 bg-gradient-to-t from-blue-200 to-blue-500 rounded-t"
                        style={{ height: `${height}%` }}
                      ></div>
                    )
                  )}
                </div>
                <div className="flex justify-between text-sm text-gray-500 mt-2">
                  <span>Jan</span>
                  <span>Dec</span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Top Performing Courses
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-xs">
                          CS
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">
                          Computer Science 101
                        </p>
                        <p className="text-sm text-gray-500">
                          95% completion rate
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">4.8</p>
                      <p className="text-sm text-gray-500">avg rating</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <span className="text-green-600 font-bold text-xs">
                          MT
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">
                          Mathematics 201
                        </p>
                        <p className="text-sm text-gray-500">
                          92% completion rate
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">4.6</p>
                      <p className="text-sm text-gray-500">avg rating</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <span className="text-purple-600 font-bold text-xs">
                          PH
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">Physics 301</p>
                        <p className="text-sm text-gray-500">
                          89% completion rate
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">4.4</p>
                      <p className="text-sm text-gray-500">avg rating</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <span className="text-orange-600 font-bold text-xs">
                          CH
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">
                          Chemistry 101
                        </p>
                        <p className="text-sm text-gray-500">
                          87% completion rate
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">4.3</p>
                      <p className="text-sm text-gray-500">avg rating</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                System Performance Metrics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <i className="fas fa-server text-green-600 text-xl"></i>
                  </div>
                  <p className="font-semibold text-gray-900">Server Uptime</p>
                  <p className="text-2xl font-bold text-green-600">99.9%</p>
                  <p className="text-sm text-gray-500">Last 30 days</p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <i className="fas fa-tachometer-alt text-blue-600 text-xl"></i>
                  </div>
                  <p className="font-semibold text-gray-900">Response Time</p>
                  <p className="text-2xl font-bold text-blue-600">1.2s</p>
                  <p className="text-sm text-gray-500">Average</p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <i className="fas fa-database text-purple-600 text-xl"></i>
                  </div>
                  <p className="font-semibold text-gray-900">Database Size</p>
                  <p className="text-2xl font-bold text-purple-600">2.4GB</p>
                  <p className="text-sm text-gray-500">Current usage</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <a
              href="/user-management"
              className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left block"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-users text-blue-600"></i>
                </div>
                <div>
                  <p className="font-medium text-gray-900">User Management</p>
                  <p className="text-sm text-gray-500">Manage all users</p>
                </div>
              </div>
            </a>

            <a
              href="/courses"
              className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left block"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-book-open text-green-600"></i>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Course Management</p>
                  <p className="text-sm text-gray-500">Manage courses</p>
                </div>
              </div>
            </a>

            <a
              href="/departments"
              className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left block"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-building text-purple-600"></i>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Departments</p>
                  <p className="text-sm text-gray-500">Manage departments</p>
                </div>
              </div>
            </a>

            <a
              href="/programs"
              className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left block"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-graduation-cap text-orange-600"></i>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Programs</p>
                  <p className="text-sm text-gray-500">Manage programs</p>
                </div>
              </div>
            </a>
          </div>
        </div>

        {/* Additional Admin Features */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Additional Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <a
              href="/students"
              className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left block"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-user-graduate text-indigo-600"></i>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    Student Management
                  </p>
                  <p className="text-sm text-gray-500">
                    Manage student records
                  </p>
                </div>
              </div>
            </a>

            <a
              href="/assignments"
              className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left block"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-tasks text-red-600"></i>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    Assignment Management
                  </p>
                  <p className="text-sm text-gray-500">Manage assignments</p>
                </div>
              </div>
            </a>

            <a
              href="/forums"
              className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left block"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-comments text-teal-600"></i>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Discussion Forums</p>
                  <p className="text-sm text-gray-500">Manage forums</p>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
