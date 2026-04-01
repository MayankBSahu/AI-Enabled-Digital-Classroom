import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import Sidebar from "../components/Sidebar";
import api from "../services/api";

export default function ProfessorDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState("courses");
  const [courseId, setCourseId] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [myCourses, setMyCourses] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [courseProfessor, setCourseProfessor] = useState(null);

  const [materials, setMaterials] = useState([]);
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
  const apiOrigin = apiBase.replace(/\/api\/?$/, "");

  const toPublicFileUrl = (fileUrl) => {
    if (!fileUrl) return "";
    if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
    return `${apiOrigin}${fileUrl}`;
  };

  /* ── Material Upload State ── */
  const [materialType, setMaterialType] = useState("slide");
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialDescription, setMaterialDescription] = useState("");
  const [materialText, setMaterialText] = useState("");
  const [materialFile, setMaterialFile] = useState(null);

  /* ── Assignment State ── */
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDescription, setAssignmentDescription] = useState("");
  const [assignmentRubric, setAssignmentRubric] = useState("Correctness,Clarity,Examples");
  const [maxMarks, setMaxMarks] = useState(100);
  const [dueDate, setDueDate] = useState("");
  const [assignments, setAssignments] = useState([]);
  const [selectedViewAssignment, setSelectedViewAssignment] = useState(null);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState([]);

  /* ── Announcement State ── */
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcements, setAnnouncements] = useState([]);

  /* ── Analytics State ── */
  const [analytics, setAnalytics] = useState(null);

  /* ── Loading State ── */
  const [submitting, setSubmitting] = useState(false);

  /* ── Course Creation State ── */
  const [newCourseId, setNewCourseId] = useState("");
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseDesc, setNewCourseDesc] = useState("");

  const loadMyCourses = async () => {
    try {
      const { data } = await api.get("/courses/professor");
      setMyCourses(data.courses || []);
    } catch (error) {
      console.error("Failed to load courses");
    }
  };

  useEffect(() => {
    loadMyCourses();
  }, []);

  useEffect(() => {
    if (!courseId) return;
    if (activeTab === "people" || activeTab === "courses") loadStudents();
    else if (activeTab === "materials" || activeTab === "files") loadMaterials();
    else if (activeTab === "announcements") loadAnnouncements();
    else if (activeTab === "analytics") loadAnalytics();
    else if (activeTab === "assignments") loadAssignments();
  }, [activeTab, courseId]);

  const loadAnnouncements = async () => {
    try {
      const { data } = await api.get(`/announcements/course/${courseId}`);
      setAnnouncements(data.announcements || []);
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to load announcements", "error");
    }
  };

  const loadStudents = async () => {
    try {
      const { data } = await api.get(`/courses/${courseId}/students`);
      setEnrolledStudents(data.students || []);
      setCourseProfessor(data.professor || null);
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to load students", "error");
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/courses", {
        courseId: newCourseId,
        name: newCourseName,
        description: newCourseDesc,
        color: ["#6366f1", "#06b6d4", "#8b5cf6", "#f59e0b", "#10b981", "#ec4899"][Math.floor(Math.random() * 6)]
      });
      addToast("Course created! Enrollment code generated.", "success");
      setNewCourseId("");
      setNewCourseName("");
      setNewCourseDesc("");
      loadMyCourses();
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to create course", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const loadMaterials = async () => {
    try {
      const { data } = await api.get(`/materials/course/${courseId}`);
      setMaterials(data.materials || []);
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to load materials", "error");
    }
  };

  const reindexMaterials = async () => {
    if (!window.confirm("Re-index all materials for the AI? This will re-extract PDF text and update the AI knowledge base.")) return;
    try {
      setSubmitting(true);
      const { data } = await api.post(`/materials/reindex/${courseId}`);
      addToast(data.message || "Re-indexing complete!", "success");
      await loadMaterials();
    } catch (error) {
      addToast(error.response?.data?.message || "Re-index failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const loadAssignments = async () => {
    try {
      const { data } = await api.get(`/assignments/course/${courseId}`);
      setAssignments(data.assignments || []);
    } catch (error) {
      console.error("Failed to load assignments");
    }
  };

  const loadSubmissions = async (assignmentId) => {
    try {
      const { data } = await api.get(`/submissions/${assignmentId}`);
      setAssignmentSubmissions(data.submissions || []);
    } catch (error) {
      addToast("Failed to load submissions", "error");
    }
  };

  const uploadMaterial = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("courseId", courseId);
      formData.append("type", materialType);
      formData.append("title", materialTitle);
      formData.append("description", materialDescription);
      formData.append("materialText", materialText);
      if (materialFile) formData.append("file", materialFile);
      await api.post("/materials", formData, { headers: { "Content-Type": "multipart/form-data" } });
      addToast("Material uploaded and indexed!", "success");
      setMaterialTitle("");
      setMaterialDescription("");
      setMaterialText("");
      setMaterialFile(null);
      await loadMaterials();
    } catch (error) {
      addToast(error.response?.data?.message || "Upload failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const createAssignment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/assignments", {
        courseId,
        title: assignmentTitle,
        description: assignmentDescription,
        rubric: assignmentRubric.split(",").map((x) => x.trim()).filter(Boolean),
        maxMarks: Number(maxMarks),
        dueDate,
      });
      addToast("Assignment created successfully!", "success");
      setAssignmentTitle("");
      setAssignmentDescription("");
      setDueDate("");
      await loadAssignments();
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to create assignment", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const postAnnouncement = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/announcements", {
        courseId,
        title: announcementTitle,
        message: announcementMessage,
      });
      addToast("Announcement posted!", "success");
      setAnnouncementTitle("");
      setAnnouncementMessage("");
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to post announcement", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const recomputeLeaderboard = async () => {
    try {
      await api.post(`/leaderboard/${courseId}/recompute`);
      addToast("Leaderboard recomputed", "success");
    } catch (error) {
      addToast(error.response?.data?.message || "Recompute failed", "error");
    }
  };

  const loadAnalytics = async () => {
    try {
      const { data } = await api.get(`/analytics/${courseId}`);
      setAnalytics(data);
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to load analytics", "error");
    }
  };

  return (
    <>
      <div className="bg-animated">
        <div className="bg-blob bg-blob-1"></div>
        <div className="bg-blob bg-blob-2"></div>
      </div>

      <div className="app-layout">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          role="professor"
          hasCourseSelected={!!selectedCourse}
        />

        <main className="app-content">
          {/* Page Header */}
          <div className="page-header">
            <h1>Professor Dashboard</h1>
            <p>Manage your courses, materials, and track student progress</p>
          </div>

          {/* Course Selector or Active Indicator */}
          {selectedCourse && activeTab !== "courses" && (
            <div className="course-bar">
              <div className="selected-course-indicator">
                <span className="selected-course-icon" style={{ background: selectedCourse.color || "var(--primary)" }}>
                  {selectedCourse.icon || "📚"}
                </span>
                <div className="selected-course-info">
                  <span className="selected-course-name">{selectedCourse.name}</span>
                  <span className="selected-course-id">
                    {selectedCourse.courseId} • Code: {selectedCourse.enrollmentCode}
                  </span>
                </div>
              </div>
              <button className="btn-ghost btn-sm" onClick={() => { setSelectedCourse(null); setCourseId(""); setActiveTab("courses"); }} style={{ marginLeft: 'auto' }}>
                ↩ Change Course
              </button>
            </div>
          )}

          {/* Tab Content */}
          <div className="tab-content" key={activeTab}>

            {/* ── My Courses Tab ── */}
            {activeTab === "courses" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="section-header" style={{ marginBottom: 0 }}>
                    <div className="section-icon indigo">📚</div>
                    <div>
                      <h2>My Courses</h2>
                      <p>Manage courses you teach and create new ones</p>
                    </div>
                  </div>
                </div>

                <div className="course-grid mb-8">
                  {myCourses.length === 0 ? (
                    <div className="glass-card-static" style={{ gridColumn: "1 / -1" }}>
                      <p className="empty-state-text">You haven't created any courses yet.</p>
                    </div>
                  ) : (
                    myCourses.map((c) => (
                      <div
                        key={c._id}
                        className="course-card"
                        onClick={() => {
                          setSelectedCourse(c);
                          setCourseId(c.courseId);
                        }}
                        style={{ '--course-color': c.color || "var(--primary)" }}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="course-card-icon" style={{ background: c.color || "var(--primary)", margin: 0 }}>
                            {c.icon || "📚"}
                          </div>
                          <div className="badge badge-accent" style={{ fontSize: "14px", padding: "4px 8px" }}>
                            Code: {c.enrollmentCode}
                          </div>
                        </div>
                        <div className="course-card-content">
                          <h3 className="course-card-title">{c.name}</h3>
                          <p className="course-card-id">{c.courseId}</p>
                        </div>
                        <div className="course-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="course-card-students text-secondary text-sm">👥 {c.students?.length || 0} enrolled</span>
                          <button className="btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); setSelectedCourse(c); setCourseId(c.courseId); setActiveTab("materials"); }}>Manage Course →</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {selectedCourse && (
                  <div className="glass-card-static mb-8">
                    <div className="section-header" style={{ marginBottom: "16px" }}>
                      <div className="section-icon indigo">👥</div>
                      <div>
                        <h2 className="text-xl">Enrolled Students • {selectedCourse.name}</h2>
                        <p className="text-secondary text-sm">Students currently enrolled in the selected course</p>
                      </div>
                    </div>
                    {enrolledStudents.length === 0 ? (
                      <p className="empty-state-text">No students enrolled yet.</p>
                    ) : (
                      <div className="student-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
                        {enrolledStudents.map(s => (
                          <div key={s._id} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "8px 12px", background: "var(--surface-hover)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
                            <span style={{ fontWeight: 600 }}>{s.name}</span>
                            <span style={{ fontSize: "11px", opacity: 0.8 }}>{s.email}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <section className="glass-card-static mt-8" style={{ maxWidth: 600 }}>
                  <div className="section-header">
                    <div className="section-icon green">➕</div>
                    <div>
                      <h2>Create New Course</h2>
                      <p>Generate an enrollment code to share with your students</p>
                    </div>
                  </div>
                  <form className="form-grid" onSubmit={handleCreateCourse}>
                    <div className="form-grid two-col">
                      <div className="form-group">
                        <label>Course ID</label>
                        <input
                          placeholder="e.g. CS201"
                          value={newCourseId}
                          onChange={(e) => setNewCourseId(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Course Name</label>
                        <input
                          placeholder="e.g. Data Structures"
                          value={newCourseName}
                          onChange={(e) => setNewCourseName(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        rows={2}
                        placeholder="Brief overview of the course..."
                        value={newCourseDesc}
                        onChange={(e) => setNewCourseDesc(e.target.value)}
                      />
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn-primary btn-full" disabled={submitting}>
                        {submitting ? <><span className="spinner"></span> Creating...</> : "Create Course"}
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            )}

            {/* ── People Tab ── */}
            {activeTab === "people" && (
              <div>
                <div className="section-header">
                  <div className="section-icon indigo">👥</div>
                  <div>
                    <h2>Class Roster</h2>
                    <p>View all students enrolled in this course</p>
                  </div>
                </div>
                <div className="glass-card mb-8">
                  <h3 className="text-lg mb-4" style={{ fontWeight: 600, borderBottom: "1px solid var(--border)", paddingBottom: "var(--space-2)" }}>Professor</h3>
                  <div className="flex items-center mb-6" style={{ gap: "var(--space-4)" }}>
                    <div className="sidebar-avatar" style={{ margin: 0, width: 44, height: 44, background: "var(--primary-glow)", color: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-md)", fontWeight: "bold" }}>
                      {courseProfessor?.name?.[0]?.toUpperCase() || "P"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{courseProfessor?.name || "Professor"}</div>
                      <div className="text-sm text-secondary">{courseProfessor?.email || "Email"}</div>
                    </div>
                  </div>

                  <h3 className="text-lg mb-4" style={{ fontWeight: 600, borderBottom: "1px solid var(--border)", paddingBottom: "var(--space-2)", display: "flex", justifyContent: "space-between" }}>
                    <span>Students</span>
                    <span className="text-secondary" style={{ fontSize: "var(--font-sm)", fontWeight: "normal" }}>{enrolledStudents.length} students</span>
                  </h3>
                  {enrolledStudents.length === 0 ? (
                    <p className="empty-state-text text-center" style={{ padding: "var(--space-6)" }}>No students enrolled yet.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                      {enrolledStudents.map(student => (
                        <div key={student._id} className="flex items-center" style={{ gap: "var(--space-4)", padding: "var(--space-3)", background: "var(--surface-hover)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                          <div className="sidebar-avatar" style={{ margin: 0, width: 36, height: 36, background: "rgba(255,255,255,0.05)", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" }}>
                            {student.name?.[0]?.toUpperCase() || "S"}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{student.name}</div>
                            <div className="text-sm text-secondary">{student.email}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Materials Tab ── */}
            {activeTab === "materials" && (
              <div>
                <section className="glass-card-static" style={{ maxWidth: 720 }}>
                  <div className="section-header">
                    <div className="section-icon indigo">📤</div>
                    <div>
                      <h2>Upload Material</h2>
                      <p>Add slides, notes, or resources for RAG indexing</p>
                    </div>
                  </div>

                  <form className="form-grid" onSubmit={uploadMaterial}>
                    <div className="form-grid two-col">
                      <div className="form-group">
                        <label htmlFor="mat-type">Type</label>
                        <select id="mat-type" value={materialType} onChange={(e) => setMaterialType(e.target.value)}>
                          <option value="slide">Slide</option>
                          <option value="note">Note</option>
                          <option value="assignment">Assignment</option>
                          <option value="project-topic">Project Topic</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label htmlFor="mat-title">Title</label>
                        <input id="mat-title" placeholder="e.g. Lecture 3 – Trees" value={materialTitle} onChange={(e) => setMaterialTitle(e.target.value)} required />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="mat-desc">Description</label>
                      <textarea id="mat-desc" rows={2} placeholder="Brief description of the material" value={materialDescription} onChange={(e) => setMaterialDescription(e.target.value)} />
                    </div>

                    <div className="form-group">
                      <label htmlFor="mat-text">Content Text (for AI Indexing)</label>
                      <textarea id="mat-text" rows={4} placeholder="Paste the material text to be indexed by the AI vector engine..." value={materialText} onChange={(e) => setMaterialText(e.target.value)} />
                    </div>

                    <div className="form-group">
                      <label>Attach File</label>
                      <input id="mat-file" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={(e) => setMaterialFile(e.target.files?.[0] || null)} />
                    </div>

                    <div className="form-actions">
                      <button type="submit" className="btn-primary btn-full" disabled={submitting}>
                        {submitting ? <><span className="spinner"></span> Uploading...</> : "Upload & Index"}
                      </button>
                    </div>
                  </form>
                </section>

                {/* Uploaded Materials List */}
                {materials.length > 0 && (
                  <section className="glass-card-static mt-8">
                    <div className="section-header">
                      <div className="section-icon cyan">📂</div>
                      <div>
                        <h2>Uploaded Materials</h2>
                        <p>{materials.length} material{materials.length !== 1 ? "s" : ""} uploaded</p>
                      </div>
                    </div>
                    <div className="form-grid">
                      {materials.map((m) => (
                        <div key={m._id} className="item-card">
                          <div className="item-card-header">
                            <span className="item-card-title">{m.title}</span>
                            <span className="badge badge-primary">{m.type}</span>
                          </div>
                          <p className="item-card-desc">{m.description || "No description"}</p>
                          <div className="item-card-meta">
                            {m.vectorized ? `✅ Indexed (${m.indexedChunks || 0} chunks)` : "⏳ Not indexed"} •{" "}
                            {new Date(m.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                          </div>
                          {m.fileUrl && (
                            <div className="item-card-actions">
                              <a href={toPublicFileUrl(m.fileUrl)} target="_blank" rel="noreferrer" className="link-btn">
                                📎 Open File
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <div className="item-card mt-4" style={{ maxWidth: 720 }}>
                  <div className="flex items-center justify-between">
                    <p className="item-card-desc" style={{ margin: 0 }}>
                      💡 <strong>How RAG Works:</strong> PDFs are automatically extracted, chunked, and indexed into
                      ChromaDB. Students can ask the AI about content in your uploaded materials.
                    </p>
                    <button className="btn-secondary btn-sm" onClick={reindexMaterials} disabled={submitting} style={{ whiteSpace: "nowrap", marginLeft: "var(--space-4)" }}>
                      {submitting ? "Re-indexing..." : "🔄 Re-index AI"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Assignments Tab ── */}
            {activeTab === "assignments" && (
              <div>
                <section className="glass-card-static" style={{ maxWidth: 640 }}>
                  <div className="section-header">
                    <div className="section-icon indigo">📝</div>
                    <div>
                      <h2>Create Assignment</h2>
                      <p>Set up a new assignment with rubric and due date</p>
                    </div>
                  </div>

                  <form className="form-grid" onSubmit={createAssignment}>
                    <div className="form-group">
                      <label htmlFor="asgn-title">Assignment Title</label>
                      <input id="asgn-title" placeholder="e.g. Assignment 2 – Sorting Algorithms" value={assignmentTitle} onChange={(e) => setAssignmentTitle(e.target.value)} required />
                    </div>

                    <div className="form-group">
                      <label htmlFor="asgn-desc">Description / Instructions</label>
                      <textarea id="asgn-desc" rows={4} placeholder="Detailed instructions for students..." value={assignmentDescription} onChange={(e) => setAssignmentDescription(e.target.value)} />
                    </div>

                    <div className="form-group">
                      <label htmlFor="asgn-rubric">Evaluation Rubric (comma-separated)</label>
                      <input id="asgn-rubric" placeholder="Correctness, Clarity, Examples" value={assignmentRubric} onChange={(e) => setAssignmentRubric(e.target.value)} />
                    </div>

                    <div className="form-grid two-col">
                      <div className="form-group">
                        <label htmlFor="asgn-marks">Max Marks</label>
                        <input id="asgn-marks" type="number" min="1" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} required />
                      </div>
                      <div className="form-group">
                        <label htmlFor="asgn-due">Due Date</label>
                        <input id="asgn-due" type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
                      </div>
                    </div>

                    <div className="form-actions">
                      <button type="submit" className="btn-primary btn-full" disabled={submitting}>
                        {submitting ? <><span className="spinner"></span> Creating...</> : "Create Assignment"}
                      </button>
                    </div>
                  </form>
                </section>

                {/* Past Assignments */}
                <section className="glass-card-static mt-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="section-header" style={{ marginBottom: 0 }}>
                      <div className="section-icon cyan">📋</div>
                      <div>
                        <h2>Past Assignments</h2>
                        <p>{assignments.length} assignment{assignments.length !== 1 ? "s" : ""} created</p>
                      </div>
                    </div>
                    <button className="btn-secondary btn-sm" onClick={loadAssignments}>Refresh</button>
                  </div>

                  {assignments.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">📝</div>
                      <p className="empty-state-text">No assignments created yet for this course.</p>
                    </div>
                  ) : (
                    <div className="form-grid">
                      {assignments.map((a) => (
                        <div key={a._id} className="item-card">
                          <div className="item-card-header">
                            <span className="item-card-title">{a.title}</span>
                            <span className="badge badge-primary">{a.maxMarks} marks</span>
                          </div>
                          {a.description && <p className="item-card-desc">{a.description}</p>}
                          <div className="item-card-meta">
                            Due: {new Date(a.dueDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            {a.rubric?.length > 0 && ` • Rubric: ${a.rubric.join(", ")}`}
                          </div>
                          <div className="item-card-actions" style={{ marginTop: "var(--space-3)" }}>
                            <button className="btn-secondary btn-sm" onClick={() => { setSelectedViewAssignment(selectedViewAssignment?._id === a._id ? null : a); loadSubmissions(a._id); }}>
                              {selectedViewAssignment?._id === a._id ? "▲ Hide Submissions" : "▼ View Submissions"}
                            </button>
                          </div>

                          {selectedViewAssignment?._id === a._id && (
                            <div style={{ marginTop: "var(--space-4)", borderTop: "1px solid var(--border)", paddingTop: "var(--space-4)" }}>
                              {assignmentSubmissions.length === 0 ? (
                                <p className="text-secondary text-sm">No submissions yet for this assignment.</p>
                              ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                                  {assignmentSubmissions.map((s) => (
                                    <div key={s._id} style={{ padding: "var(--space-3)", background: "var(--surface-hover)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{s.studentId?.name || "Student"}</span>
                                          <span className="text-sm text-secondary" style={{ marginLeft: "var(--space-2)" }}>{s.studentId?.email || ""}</span>
                                        </div>
                                        <span className={`badge ${s.status === "evaluated" ? "badge-accent" : s.status === "error" ? "badge-warning" : "badge-primary"}`}>
                                          {s.status}
                                        </span>
                                      </div>
                                      {s.aiResult && s.status === "evaluated" && (
                                        <div style={{ marginTop: "var(--space-2)" }}>
                                          <span style={{ fontWeight: 700, color: "var(--accent)" }}>{s.aiResult.marks ?? "—"}</span>
                                          <span className="text-secondary text-sm"> / {a.maxMarks} marks</span>
                                          {s.aiResult.feedback && (
                                            <p className="text-sm text-secondary" style={{ marginTop: "var(--space-1)" }}>{s.aiResult.feedback}</p>
                                          )}
                                        </div>
                                      )}
                                      <div className="flex items-center justify-between" style={{ marginTop: "var(--space-1)" }}>
                                        <span className="text-sm text-secondary">
                                          Submitted: {new Date(s.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                        {s.fileUrl && (
                                          <a href={toPublicFileUrl(s.fileUrl)} target="_blank" rel="noreferrer" className="link-btn" style={{ fontSize: "var(--font-sm)" }}>
                                            📎 View File
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* ── Announcements Tab ── */}
            {activeTab === "announcements" && (
              <div>
                <section className="glass-card-static" style={{ maxWidth: 640 }}>
                  <div className="section-header">
                    <div className="section-icon amber">📢</div>
                    <div>
                      <h2>Post Announcement</h2>
                      <p>Broadcast a message to all students in this course</p>
                    </div>
                  </div>

                  <form className="form-grid" onSubmit={async (e) => { await postAnnouncement(e); await loadAnnouncements(); }}>
                    <div className="form-group">
                      <label htmlFor="ann-title">Title</label>
                      <input id="ann-title" placeholder="e.g. Exam date changed" value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} required />
                    </div>

                    <div className="form-group">
                      <label htmlFor="ann-msg">Message</label>
                      <textarea id="ann-msg" rows={5} placeholder="Write your announcement..." value={announcementMessage} onChange={(e) => setAnnouncementMessage(e.target.value)} required />
                    </div>

                    <div className="form-actions">
                      <button type="submit" className="btn-primary btn-full" disabled={submitting}>
                        {submitting ? <><span className="spinner"></span> Posting...</> : "Post Announcement"}
                      </button>
                    </div>
                  </form>
                </section>

                {/* Past Announcements */}
                <section className="glass-card-static mt-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="section-header" style={{ marginBottom: 0 }}>
                      <div className="section-icon amber">📋</div>
                      <div>
                        <h2>Past Announcements</h2>
                        <p>{announcements.length} announcement{announcements.length !== 1 ? "s" : ""} posted</p>
                      </div>
                    </div>
                    <button className="btn-secondary btn-sm" onClick={loadAnnouncements}>Refresh</button>
                  </div>

                  {announcements.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">📢</div>
                      <p className="empty-state-text">No announcements posted yet for this course.</p>
                    </div>
                  ) : (
                    <div className="form-grid">
                      {announcements.map((a) => (
                        <div key={a._id} className="announcement-item">
                          <div className="announcement-title">{a.title}</div>
                          <div className="announcement-body">{a.message}</div>
                          {a.createdAt && (
                            <div className="announcement-date">
                              {new Date(a.createdAt).toLocaleDateString(undefined, {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* ── Analytics Tab ── */}
            {activeTab === "analytics" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="section-header" style={{ marginBottom: 0 }}>
                    <div className="section-icon green">📊</div>
                    <div>
                      <h2>Course Analytics</h2>
                      <p>AI-generated insights about student performance</p>
                    </div>
                  </div>
                  <button className="btn-secondary btn-sm" onClick={loadAnalytics}>Refresh</button>
                </div>

                {!analytics ? (
                  <div className="glass-card-static">
                    <div className="empty-state">
                      <div className="empty-state-icon">📊</div>
                      <p className="empty-state-text">Click "Load Analytics" to view AI-generated insights for this course.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="analytics-grid mb-6">
                      <div className="stat-card">
                        <div className="stat-value">{analytics.totalEvaluatedSubmissions ?? 0}</div>
                        <div className="stat-label">Evaluated Submissions</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">{analytics.totalDoubts ?? 0}</div>
                        <div className="stat-label">Total Doubts</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">{(analytics.weakStudents || []).length}</div>
                        <div className="stat-label">Weak Students</div>
                      </div>
                    </div>

                    {(analytics.strugglingTopics || []).length > 0 && (
                      <div className="glass-card-static">
                        <div className="section-header">
                          <div className="section-icon rose">⚠️</div>
                          <h2>Struggling Topics</h2>
                        </div>
                        <div className="form-grid">
                          {analytics.strugglingTopics.map((t, i) => (
                            <div key={i} className="item-card">
                              <div className="item-card-header">
                                <span className="item-card-title">{t.topic}</span>
                                <span className="badge badge-warning">{t.count} students</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {analytics.teachingSuggestions && (
                      <div className="glass-card-static mt-4">
                        <div className="section-header">
                          <div className="section-icon cyan">💡</div>
                          <h2>AI Teaching Suggestions</h2>
                        </div>
                        <p className="item-card-desc" style={{ whiteSpace: "pre-wrap" }}>
                          {typeof analytics.teachingSuggestions === "string"
                            ? analytics.teachingSuggestions
                            : JSON.stringify(analytics.teachingSuggestions, null, 2)}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

          </div>
        </main>
      </div>
    </>
  );
}
