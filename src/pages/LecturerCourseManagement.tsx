import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";

interface Course {
  id: number;
  name: string;
  code: string;
  description: string;
  credits: number;
  department: string;
  semester: string;
  max_capacity: number;
  enrolled_count: number;
}

interface Material {
  id: number;
  title: string;
  description?: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  is_active: boolean;
}

interface Lesson {
  id: number;
  title: string;
  description: string;
  lesson_date?: string;
  lesson_time?: string;
  duration_minutes?: number;
  lesson_type: string;
  is_published: boolean;
  materials: Material[];
}

const LecturerCourseManagement: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"materials" | "lessons">(
    "materials"
  );

  // Upload states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<"general" | "video">("general");

  // Lesson states
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [newLesson, setNewLesson] = useState({
    title: "",
    description: "",
    lesson_date: "",
    lesson_time: "",
    duration_minutes: 60,
    lesson_type: "lecture",
  });
  const [creatingLesson, setCreatingLesson] = useState(false);

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
      const response = await fetch("/api/lecturer/courses", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses || []);
        if (data.courses.length > 0 && !selectedCourse) {
          setSelectedCourse(data.courses[0]);
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
      const response = await fetch(
        `/api/courses/${selectedCourse.id}/materials`,
        {
          credentials: "include",
        }
      );

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
      const response = await fetch(
        `/api/courses/${selectedCourse.id}/lessons`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLessons(data.lessons || []);
      }
    } catch (error) {
      console.error("Error fetching lessons:", error);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !uploadFile) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("title", uploadTitle || uploadFile.name);
      formData.append("description", uploadDescription);

      const response = await fetch(
        `/api/courses/${selectedCourse.id}/materials`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );

      if (response.ok) {
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadTitle("");
        setUploadDescription("");
        fetchMaterials();
      } else {
        const error = await response.json();
        alert(`Upload failed: ${error.detail}`);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;

    try {
      setCreatingLesson(true);
      const response = await fetch(
        `/api/courses/${selectedCourse.id}/lessons`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(newLesson),
        }
      );

      if (response.ok) {
        setShowLessonModal(false);
        setNewLesson({
          title: "",
          description: "",
          lesson_date: "",
          lesson_time: "",
          duration_minutes: 60,
          lesson_type: "lecture",
        });
        fetchLessons();
      } else {
        const error = await response.json();
        alert(`Failed to create lesson: ${error.detail}`);
      }
    } catch (error) {
      console.error("Failed to create lesson:", error);
      alert("Failed to create lesson. Please try again.");
    } finally {
      setCreatingLesson(false);
    }
  };

  const deleteMaterial = async (materialId: number) => {
    if (!confirm("Are you sure you want to delete this material?")) return;

    try {
      const response = await fetch(`/api/materials/${materialId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        fetchMaterials();
      }
    } catch (error) {
      console.error("Failed to delete material:", error);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("pdf")) return "fas fa-file-pdf text-red-500";
    if (fileType.includes("video")) return "fas fa-play-circle text-blue-500";
    if (fileType.includes("image")) return "fas fa-image text-green-500";
    if (fileType.includes("word")) return "fas fa-file-word text-blue-600";
    if (fileType.includes("powerpoint") || fileType.includes("presentation"))
      return "fas fa-file-powerpoint text-orange-500";
    return "fas fa-file text-gray-500";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your courses...</p>
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
            Course Management
          </h1>
          <p className="text-gray-600">
            Upload materials and manage lessons for your courses
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
                    onClick={() => setSelectedCourse(course)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedCourse?.id === course.id
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {course.code}: {course.name}
                  </button>
                ))}
              </div>
            </div>

            {selectedCourse && (
              <div className="text-right">
                <p className="text-sm text-gray-500">Enrolled Students</p>
                <p className="text-2xl font-bold text-gray-900">
                  {selectedCourse.enrolled_count}
                </p>
                <p className="text-sm text-gray-500">
                  of {selectedCourse.max_capacity}
                </p>
              </div>
            )}
          </div>
        </div>

        {selectedCourse && (
          <>
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 mb-6">
              <button
                type="button"
                onClick={() => {
                  setUploadMode("general");
                  setShowUploadModal(true);
                }}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center"
              >
                <i className="fas fa-upload mr-2"></i>
                Upload Material
              </button>
              <button
                type="button"
                onClick={() => {
                  setUploadMode("video");
                  setShowUploadModal(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <i className="fas fa-video mr-2"></i>
                Upload Video
              </button>
              <button
                onClick={() => setShowLessonModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <i className="fas fa-plus mr-2"></i>
                Create Lesson
              </button>
            </div>

            {/* Tabs */}
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  {[
                    {
                      key: "materials",
                      label: "Course Materials",
                      icon: "fa-folder-open",
                    },
                    {
                      key: "lessons",
                      label: "Lessons & Schedule",
                      icon: "fa-calendar-alt",
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Course Materials
                  </h3>
                </div>

                <div className="p-6">
                  {materials.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {materials.map((material) => (
                        <div
                          key={material.id}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center">
                              <i
                                className={`${getFileIcon(
                                  material.file_type
                                )} text-2xl mr-3`}
                              ></i>
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {material.title}
                                </h4>
                                <p className="text-sm text-gray-500">
                                  {material.file_name}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => deleteMaterial(material.id)}
                              className="text-red-600 hover:text-red-700 text-sm"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>

                          {material.description && (
                            <p className="text-gray-600 text-sm mb-3">
                              {material.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <span>{formatFileSize(material.file_size)}</span>
                            <span>
                              {new Date(
                                material.uploaded_at
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-folder-open text-gray-400 text-3xl"></i>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No materials uploaded
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Start by uploading your first course material
                      </p>
                      <button
                        onClick={() => setShowUploadModal(true)}
                        className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        <i className="fas fa-upload mr-2"></i>
                        Upload Material
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Lessons Tab */}
            {activeTab === "lessons" && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Lessons & Schedule
                  </h3>
                </div>

                <div className="p-6">
                  {lessons.length > 0 ? (
                    <div className="space-y-4">
                      {lessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="border border-gray-200 rounded-lg p-6"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900">
                                {lesson.title}
                              </h4>
                              <p className="text-gray-600 mt-1">
                                {lesson.description}
                              </p>
                            </div>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                lesson.is_published
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {lesson.is_published ? "Published" : "Draft"}
                            </span>
                          </div>

                          {(lesson.lesson_date || lesson.lesson_time) && (
                            <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                              {lesson.lesson_date && (
                                <span>
                                  <i className="fas fa-calendar mr-1"></i>
                                  {new Date(
                                    lesson.lesson_date
                                  ).toLocaleDateString()}
                                </span>
                              )}
                              {lesson.lesson_time && (
                                <span>
                                  <i className="fas fa-clock mr-1"></i>
                                  {lesson.lesson_time}
                                </span>
                              )}
                              {lesson.duration_minutes && (
                                <span>
                                  <i className="fas fa-hourglass-half mr-1"></i>
                                  {lesson.duration_minutes} minutes
                                </span>
                              )}
                            </div>
                          )}

                          {lesson.materials.length > 0 && (
                            <div>
                              <h5 className="font-medium text-gray-900 mb-2">
                                Lesson Materials
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {lesson.materials.map((material) => (
                                  <div
                                    key={material.id}
                                    className="flex items-center p-2 bg-gray-50 rounded"
                                  >
                                    <i
                                      className={`${getFileIcon(
                                        material.file_type
                                      )} mr-2`}
                                    ></i>
                                    <span className="text-sm text-gray-700">
                                      {material.title}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-calendar-alt text-gray-400 text-3xl"></i>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No lessons created
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Create your first lesson to organize course content
                      </p>
                      <button
                        onClick={() => setShowLessonModal(true)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <i className="fas fa-plus mr-2"></i>
                        Create Lesson
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Upload Material Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                {uploadMode === "video" ? (
                  <>
                    <i className="fas fa-video text-blue-600 mr-2"></i>
                    Upload Video Content
                  </>
                ) : (
                  <>
                    <i className="fas fa-upload text-primary-600 mr-2"></i>
                    Upload Course Material
                  </>
                )}
              </h3>
            </div>

            <form onSubmit={handleFileUpload} className="p-6">
              {uploadMode === "video" && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <i className="fas fa-info-circle mr-1"></i>
                    Perfect for lecture recordings, tutorials, doubt clearing
                    sessions, and educational videos.
                  </p>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File *
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  accept={
                    uploadMode === "video"
                      ? ".mp4,.avi,.mov,.mkv,.webm,.flv,.wmv"
                      : ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.mp4,.avi,.mov,.jpg,.jpeg,.png,.gif"
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  {uploadMode === "video"
                    ? "Supported video formats: MP4, AVI, MOV, MKV, WebM, FLV, WMV"
                    : "Supported: PDF, Word, PowerPoint, Excel, Videos, Images"}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder={
                    uploadMode === "video"
                      ? "e.g., Lecture 5: Advanced Concepts"
                      : "Leave empty to use filename"
                  }
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder={
                    uploadMode === "video"
                      ? "Describe what topics are covered in this video..."
                      : "Brief description of the material..."
                  }
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadFile(null);
                    setUploadTitle("");
                    setUploadDescription("");
                    setUploadMode("general");
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Lesson Modal */}
      {showLessonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Create New Lesson
              </h3>
            </div>

            <form onSubmit={handleCreateLesson} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lesson Title *
                </label>
                <input
                  type="text"
                  required
                  value={newLesson.title}
                  onChange={(e) =>
                    setNewLesson({ ...newLesson, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Introduction to Variables"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  required
                  value={newLesson.description}
                  onChange={(e) =>
                    setNewLesson({ ...newLesson, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Describe what students will learn..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={newLesson.lesson_date}
                    onChange={(e) =>
                      setNewLesson({
                        ...newLesson,
                        lesson_date: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={newLesson.lesson_time}
                    onChange={(e) =>
                      setNewLesson({
                        ...newLesson,
                        lesson_time: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={newLesson.duration_minutes}
                    onChange={(e) =>
                      setNewLesson({
                        ...newLesson,
                        duration_minutes: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    min="15"
                    max="300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={newLesson.lesson_type}
                    onChange={(e) =>
                      setNewLesson({
                        ...newLesson,
                        lesson_type: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="lecture">Lecture</option>
                    <option value="lab">Lab Session</option>
                    <option value="tutorial">Tutorial</option>
                    <option value="seminar">Seminar</option>
                    <option value="workshop">Workshop</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowLessonModal(false);
                    setNewLesson({
                      title: "",
                      description: "",
                      lesson_date: "",
                      lesson_time: "",
                      duration_minutes: 60,
                      lesson_type: "lecture",
                    });
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingLesson}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {creatingLesson ? "Creating..." : "Create Lesson"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LecturerCourseManagement;
