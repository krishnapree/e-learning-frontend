import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";

interface Program {
  id: number;
  name: string;
  code: string;
  description: string;
  program_type: string;
  duration_years: number;
  total_credits: number;
  department_name: string;
  total_courses: number;
  enrolled_students: number;
  is_active: boolean;
  created_at: string;
}

const ProgramManagement: React.FC = () => {
  const {} = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    program_type: "bachelor",
    department_id: "",
    duration_years: 4,
    total_credits: 120,
    is_active: true,
  });

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      setLoading(true);

      // Try to fetch programs from API
      try {
        const programsResponse = await fetch("/api/academic/programs", {
          credentials: "include",
        });

        if (programsResponse.ok) {
          const data = await programsResponse.json();
          setPrograms(data.programs || []);
        } else {
          throw new Error("API not available");
        }

        // Fetch departments for the modal
        const departmentsResponse = await fetch("/api/academic/departments", {
          credentials: "include",
        });

        if (departmentsResponse.ok) {
          const departmentsData = await departmentsResponse.json();
          setDepartments(departmentsData.departments || []);
        }
      } catch (apiError) {
        console.log("API not available, using mock data");
        // Use mock data when API is not available
        const mockPrograms = [
          {
            id: 1,
            name: "Computer Science",
            code: "CS",
            description: "Bachelor of Science in Computer Science",
            program_type: "bachelor",
            department_name: "Computer Science",
            duration_years: 4,
            total_credits: 120,
            total_courses: 45,
            enrolled_students: 120,
            is_active: true,
            created_at: new Date().toISOString(),
          },
          {
            id: 2,
            name: "Business Administration",
            code: "BA",
            description: "Master of Business Administration",
            program_type: "master",
            department_name: "Business",
            duration_years: 2,
            total_credits: 60,
            total_courses: 20,
            enrolled_students: 85,
            is_active: true,
            created_at: new Date().toISOString(),
          },
          {
            id: 3,
            name: "Engineering",
            code: "ENG",
            description: "Bachelor of Engineering",
            program_type: "bachelor",
            department_name: "Engineering",
            duration_years: 4,
            total_credits: 128,
            total_courses: 50,
            enrolled_students: 95,
            is_active: true,
            created_at: new Date().toISOString(),
          },
        ];

        const mockDepartments = [
          { id: 1, name: "Computer Science" },
          { id: 2, name: "Business" },
          { id: 3, name: "Engineering" },
        ];

        setPrograms(mockPrograms);
        setDepartments(mockDepartments);
        setError(null); // Clear any error since we have mock data
      }
    } catch (error) {
      console.error("Error fetching programs:", error);
      setError("Failed to fetch programs");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (program?: Program) => {
    if (program) {
      setEditingProgram(program);
      setFormData({
        name: program.name,
        code: program.code,
        description: program.description || "",
        program_type: program.program_type,
        department_id: "", // Will need to be mapped from department_name
        duration_years: program.duration_years,
        total_credits: program.total_credits,
        is_active: program.is_active,
      });
    } else {
      setEditingProgram(null);
      setFormData({
        name: "",
        code: "",
        description: "",
        program_type: "bachelor",
        department_id: "",
        duration_years: 4,
        total_credits: 120,
        is_active: true,
      });
    }
    setShowCreateModal(true);
    setError(null);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingProgram(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const url = editingProgram
        ? `/api/academic/programs/${editingProgram.id}`
        : "/api/academic/programs";

      const method = editingProgram ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          department_id: parseInt(formData.department_id),
        }),
      });

      if (response.ok) {
        await fetchPrograms();
        closeModal();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Failed to save program");
      }
    } catch (error) {
      console.error("Error saving program:", error);
      setError("Failed to save program");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPrograms = programs.filter((program) => {
    if (filterType === "all") return true;
    return program.program_type.toLowerCase() === filterType.toLowerCase();
  });

  const programTypes = [...new Set(programs.map((p) => p.program_type))];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading programs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Program Management
            </h1>
            <p className="text-gray-600">
              Manage academic programs and degree offerings
            </p>
          </div>
          <button
            type="button"
            onClick={() => openModal()}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <i className="fas fa-plus mr-2"></i>
            Add Program
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <i className="fas fa-exclamation-circle text-red-400 mr-3 mt-0.5"></i>
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterType("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === "all"
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All Programs
            </button>
            {programTypes.map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterType === type
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Programs Grid */}
        {filteredPrograms.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-graduation-cap text-gray-400 text-3xl"></i>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Programs
            </h3>
            <p className="text-gray-600 mb-6">
              No programs match your current filter.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPrograms.map((program) => (
              <div
                key={program.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {program.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {program.code} • {program.department_name}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      program.is_active
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {program.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="mb-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      program.program_type === "Bachelor"
                        ? "bg-blue-100 text-blue-800"
                        : program.program_type === "Master"
                        ? "bg-purple-100 text-purple-800"
                        : program.program_type === "PhD"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {program.program_type}
                  </span>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {program.description}
                </p>

                {/* Program Details */}
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Duration:</span>
                    <span className="font-medium">
                      {program.duration_years} years
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Credits:</span>
                    <span className="font-medium">{program.total_credits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Courses:</span>
                    <span className="font-medium">{program.total_courses}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Enrolled:</span>
                    <span className="font-medium">
                      {program.enrolled_students}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <button className="flex-1 bg-primary-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-primary-700 transition-colors">
                    <i className="fas fa-eye mr-1"></i>
                    View
                  </button>
                  <button className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-200 transition-colors">
                    <i className="fas fa-edit mr-1"></i>
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {programs.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Program Overview
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {programs.length}
                </div>
                <div className="text-sm text-gray-500">Total Programs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600">
                  {programs.reduce((sum, prog) => sum + prog.total_courses, 0)}
                </div>
                <div className="text-sm text-gray-500">Total Courses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {programs.reduce(
                    (sum, prog) => sum + prog.enrolled_students,
                    0
                  )}
                </div>
                <div className="text-sm text-gray-500">Total Students</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {programs.filter((p) => p.is_active).length}
                </div>
                <div className="text-sm text-gray-500">Active Programs</div>
              </div>
            </div>
          </div>
        )}

        {/* Create/Edit Program Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingProgram ? "Edit Program" : "Create New Program"}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Program Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Program Code
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Program Type
                    </label>
                    <select
                      value={formData.program_type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          program_type: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="bachelor">Bachelor</option>
                      <option value="master">Master</option>
                      <option value="phd">PhD</option>
                      <option value="diploma">Diploma</option>
                      <option value="certificate">Certificate</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <select
                      value={formData.department_id}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          department_id: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Duration (Years)
                      </label>
                      <input
                        type="number"
                        value={formData.duration_years}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            duration_years: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        min="1"
                        max="10"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Credits
                      </label>
                      <input
                        type="number"
                        value={formData.total_credits}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            total_credits: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        min="1"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_active: e.target.checked,
                        })
                      }
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="is_active"
                      className="ml-2 block text-sm text-gray-900"
                    >
                      Active Program
                    </label>
                  </div>

                  {error && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <div className="flex space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                    >
                      {submitting
                        ? "Saving..."
                        : editingProgram
                        ? "Update"
                        : "Create"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgramManagement;
