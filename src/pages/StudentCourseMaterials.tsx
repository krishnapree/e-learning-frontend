import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";

interface Course {
  id: number;
  name: string;
  code: string;
  lecturer: string;
  materials_count: number;
}

interface Material {
  id: number;
  title: string;
  description?: string;
  type: "pdf" | "video" | "document" | "link" | "presentation";
  file_path?: string;
  url?: string;
  uploaded_at: string;
  size?: string;
  course_id: number;
  course_name: string;
  course_code: string;
  lecturer: string;
  is_downloadable: boolean;
}

interface Lesson {
  id: number;
  title: string;
  description: string;
  course_id: number;
  course_name: string;
  course_code: string;
  materials: Material[];
  completed: boolean;
  completion_date?: string;
  progress_percentage: number;
}

const StudentCourseMaterials: React.FC = () => {
  const {} = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"materials" | "lessons">(
    "materials"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchMaterials();
      fetchLessons();
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/student/enrolled-courses", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses || []);
        if (data.courses.length > 0 && !selectedCourse) {
          setSelectedCourse(data.courses[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async () => {
    if (!selectedCourse) return;

    try {
      const response = await fetch(`/api/courses/${selectedCourse}/materials`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setMaterials(data.materials || []);
      }
    } catch (error) {
      console.error("Error fetching materials:", error);
    }
  };

  const fetchLessons = async () => {
    if (!selectedCourse) return;

    try {
      const response = await fetch(`/api/courses/${selectedCourse}/lessons`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setLessons(data.lessons || []);
      }
    } catch (error) {
      console.error("Error fetching lessons:", error);
    }
  };

  const markLessonComplete = async (lessonId: number) => {
    try {
      const response = await fetch(`/api/lessons/${lessonId}/complete`, {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        fetchLessons();
      }
    } catch (error) {
      console.error("Error marking lesson complete:", error);
    }
  };

  const downloadMaterial = async (material: Material) => {
    if (!material.is_downloadable || !material.file_path) return;

    try {
      const response = await fetch(`/api/materials/${material.id}/download`, {
        credentials: "include",
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = material.title;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Error downloading material:", error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return "fas fa-file-pdf text-red-500";
      case "video":
        return "fas fa-play-circle text-blue-500";
      case "document":
        return "fas fa-file-word text-blue-600";
      case "presentation":
        return "fas fa-file-powerpoint text-orange-500";
      case "link":
        return "fas fa-external-link-alt text-green-500";
      default:
        return "fas fa-file text-gray-500";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "pdf":
        return "bg-red-100 text-red-800";
      case "video":
        return "bg-blue-100 text-blue-800";
      case "document":
        return "bg-blue-100 text-blue-800";
      case "presentation":
        return "bg-orange-100 text-orange-800";
      case "link":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredMaterials = materials.filter((material) => {
    const matchesSearch =
      material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || material.type === filterType;
    return matchesSearch && matchesType;
  });

  const selectedCourseData = courses.find((c) => c.id === selectedCourse);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading course materials...</p>
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
            Course Materials
          </h1>
          <p className="text-gray-600">
            Access learning materials and track lesson progress
          </p>
        </div>

        {/* Course Selector */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Select Course
              </h3>
              <div className="flex flex-wrap gap-2">
                {courses.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => setSelectedCourse(course.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedCourse === course.id
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {course.code}: {course.name}
                  </button>
                ))}
              </div>
            </div>

            {selectedCourseData && (
              <div className="text-right">
                <p className="text-sm text-gray-500">Instructor</p>
                <p className="font-medium text-gray-900">
                  {selectedCourseData.lecturer}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedCourseData.materials_count} materials available
                </p>
              </div>
            )}
          </div>
        </div>

        {selectedCourse && (
          <>
            {/* Tabs */}
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  {[
                    {
                      key: "materials",
                      label: "Materials",
                      icon: "fa-folder-open",
                    },
                    {
                      key: "lessons",
                      label: "Lessons",
                      icon: "fa-play-circle",
                    },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as any)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.key
                          ? "border-primary-500 text-primary-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <i className={`fas ${tab.icon} mr-2`}></i>
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Materials Tab */}
            {activeTab === "materials" && (
              <>
                {/* Search and Filter */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                    <div className="flex-1 max-w-md">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search materials..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                        <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="all">All Types</option>
                        <option value="pdf">PDF Documents</option>
                        <option value="video">Videos</option>
                        <option value="document">Documents</option>
                        <option value="presentation">Presentations</option>
                        <option value="link">Links</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Materials Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredMaterials.map((material) => (
                    <div
                      key={material.id}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          <i
                            className={`${getTypeIcon(
                              material.type
                            )} text-2xl mr-3`}
                          ></i>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {material.title}
                            </h3>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(
                                material.type
                              )}`}
                            >
                              {material.type.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {material.description && (
                        <p className="text-gray-600 text-sm mb-4">
                          {material.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <span>
                          <i className="fas fa-calendar mr-1"></i>
                          {new Date(material.uploaded_at).toLocaleDateString()}
                        </span>
                        {material.size && (
                          <span>
                            <i className="fas fa-file mr-1"></i>
                            {material.size}
                          </span>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        {material.type === "link" && material.url ? (
                          <a
                            href={material.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors text-center text-sm"
                          >
                            <i className="fas fa-external-link-alt mr-2"></i>
                            Open Link
                          </a>
                        ) : (
                          <>
                            <button
                              onClick={() => downloadMaterial(material)}
                              disabled={!material.is_downloadable}
                              className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                              <i className="fas fa-download mr-2"></i>
                              Download
                            </button>
                            <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                              <i className="fas fa-eye"></i>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {filteredMaterials.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-folder-open text-gray-400 text-3xl"></i>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No materials found
                    </h3>
                    <p className="text-gray-600">
                      {searchTerm || filterType !== "all"
                        ? "Try adjusting your search or filter criteria."
                        : "No materials have been uploaded for this course yet."}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Lessons Tab */}
            {activeTab === "lessons" && (
              <div className="space-y-6">
                {lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 mr-3">
                            {lesson.title}
                          </h3>
                          {lesson.completed && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <i className="fas fa-check mr-1"></i>
                              Completed
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-3">
                          {lesson.description}
                        </p>

                        {/* Progress Bar */}
                        <div className="flex items-center mb-4">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                            <div
                              className="bg-primary-600 h-2 rounded-full"
                              style={{
                                width: `${lesson.progress_percentage}%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">
                            {lesson.progress_percentage}%
                          </span>
                        </div>
                      </div>

                      <div className="ml-6">
                        {!lesson.completed && (
                          <button
                            onClick={() => markLessonComplete(lesson.id)}
                            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm"
                          >
                            <i className="fas fa-check mr-2"></i>
                            Mark Complete
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Lesson Materials */}
                    {lesson.materials.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">
                          Lesson Materials
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {lesson.materials.map((material) => (
                            <div
                              key={material.id}
                              className="flex items-center p-3 bg-gray-50 rounded-lg"
                            >
                              <i
                                className={`${getTypeIcon(material.type)} mr-3`}
                              ></i>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 text-sm">
                                  {material.title}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {material.type.toUpperCase()}
                                </p>
                              </div>
                              <button
                                onClick={() => downloadMaterial(material)}
                                className="text-primary-600 hover:text-primary-700 text-sm"
                              >
                                <i className="fas fa-download"></i>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {lessons.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-play-circle text-gray-400 text-3xl"></i>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No lessons available
                    </h3>
                    <p className="text-gray-600">
                      Lessons for this course will appear here when they are
                      created.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StudentCourseMaterials;
