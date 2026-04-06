import { useState, useEffect, useRef, useMemo } from "react";
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
  const [isProject, setIsProject] = useState(false);
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
  const [leaderboard, setLeaderboard] = useState([]);
  const [editingScoreId, setEditingScoreId] = useState(null);
  const [editingScoreValue, setEditingScoreValue] = useState("");

  const [question, setQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [allDoubts, setAllDoubts] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [historySidebarOpen, setHistorySidebarOpen] = useState(true);
  const [aiThinking, setAiThinking] = useState(false);
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);

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
    else if (activeTab === "leaderboard") loadLeaderboard();
    else if (activeTab === "doubts") loadChatHistory();
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

  const updateSubmissionScore = async (submissionId, assignmentId) => {
    try {
      await api.put(`/submissions/${submissionId}/score`, { marks: Number(editingScoreValue) });
      addToast("Score updated successfully", "success");
      setEditingScoreId(null);
      await loadSubmissions(assignmentId);
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to update score", "error");
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
        isProject,
      });
      addToast("Assignment created successfully!", "success");
      setAssignmentTitle("");
      setAssignmentDescription("");
      setDueDate("");
      setIsProject(false);
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
      await loadLeaderboard();
    } catch (error) {
      addToast(error.response?.data?.message || "Recompute failed", "error");
    }
  };

  const loadLeaderboard = async () => {
    try {
      const { data } = await api.get(`/leaderboard/${courseId}`);
      setLeaderboard(data.leaderboard || []);
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to load leaderboard", "error");
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

  const getDateGroup = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);
    const monthAgo = new Date(today); monthAgo.setDate(today.getDate() - 30);

    if (date >= today) return "Today";
    if (date >= yesterday) return "Yesterday";
    if (date >= weekAgo) return "Previous 7 Days";
    if (date >= monthAgo) return "Previous 30 Days";
    return "Older";
  };

  const groupedHistory = useMemo(() => {
    const threadsMap = {};
    for (const doubt of allDoubts) {
      const tId = doubt.sessionId || doubt._id;
      if (!threadsMap[tId]) {
        threadsMap[tId] = {
           id: tId,
           title: doubt.question, 
           doubts: [],
           createdAt: doubt.createdAt
        };
      }
      threadsMap[tId].doubts.push(doubt);
    }
    
    const threads = Object.values(threadsMap).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    const groups = {};
    const groupOrder = ["Today", "Yesterday", "Previous 7 Days", "Previous 30 Days", "Older"];

    for (const thread of threads) {
      const group = getDateGroup(thread.createdAt);
      if (!groups[group]) groups[group] = [];
      groups[group].push(thread);
    }

    return groupOrder
      .filter(g => groups[g]?.length)
      .map(g => ({ label: g, threads: groups[g] }));
  }, [allDoubts]);

  const loadChatHistory = async () => {
    try {
      const { data } = await api.get(`/doubts/course/${courseId}`);
      setAllDoubts(data.doubts || []);
      setChatMessages([]);
      setSelectedConversationId(null);
    } catch (error) {
      console.error("Failed to load chat history");
    }
  };

  const selectConversation = (thread) => {
    setSelectedConversationId(thread.id);
    const msgs = [];
    for (const doubt of thread.doubts) {
      msgs.push({ role: "user", text: doubt.question, time: doubt.createdAt });
      msgs.push({ role: "ai", text: doubt.answer, time: doubt.createdAt });
    }
    setChatMessages(msgs);
    setTimeout(() => chatContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

  const startNewChat = () => {
    setSelectedConversationId(`session_${Date.now()}`); 
    setChatMessages([]);
    setQuestion("");
  };

  const clearChatHistory = async () => {
    try {
      await api.delete(`/doubts/course/${courseId}`);
      setChatMessages([]);
      setAllDoubts([]);
      setSelectedConversationId(null);
      addToast("Chat history cleared", "success");
    } catch (error) {
      addToast("Failed to clear history", "error");
    }
  };

  const askDoubt = async (e) => {
    if (e) e.preventDefault();
    if (!question.trim()) return;
    const userMsg = question.trim();
    setQuestion("");

    let sessionId = selectedConversationId;
    if (!sessionId || sessionId === "pending") {
      sessionId = `session_${Date.now()}`;
      setSelectedConversationId(sessionId);
    }

    setChatMessages((prev) => [...prev, { role: "user", text: userMsg, time: new Date().toISOString() }]);
    setAiThinking(true);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    try {
      const { data } = await api.post("/doubts/ask", { courseId, question: userMsg, sessionId });
      const doubt = data.doubt;
      const answer = doubt?.answer || "No answer generated.";
      
      setChatMessages((prev) => [...prev, { role: "ai", text: answer, time: doubt?.createdAt || new Date().toISOString() }]);
      
      if (doubt) {
        setAllDoubts((prev) => [...prev, doubt]);
        setSelectedConversationId(doubt.sessionId || doubt._id);
      }
    } catch (error) {
      setChatMessages((prev) => [...prev, { role: "ai", text: "Sorry, I encountered an error. Please try again.", time: new Date().toISOString() }]);
      addToast(error.response?.data?.message || "Failed to get answer", "error");
    } finally {
      setAiThinking(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
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

                    <div className="form-group" style={{ marginTop: 'var(--space-2)' }}>
                      <label style={{ marginBottom: "8px", display: "block" }}>Task Type Classification</label>
                      <div style={{ display: 'flex', gap: '8px', background: 'var(--surface-hover)', padding: '6px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                        <button 
                          type="button"
                          onClick={() => setIsProject(false)}
                          style={{ 
                            flex: 1, 
                            padding: '10px 16px', 
                            borderRadius: 'var(--radius-sm)',
                            border: 'none',
                            background: !isProject ? 'var(--primary)' : 'transparent',
                            color: !isProject ? '#fff' : 'var(--text-secondary)',
                            fontWeight: !isProject ? 600 : 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                          }}
                        >
                          📝 Standard Assignment
                        </button>
                        <button 
                          type="button"
                          onClick={() => setIsProject(true)}
                          style={{ 
                            flex: 1, 
                            padding: '10px 16px', 
                            borderRadius: 'var(--radius-sm)',
                            border: 'none',
                            background: isProject ? 'var(--accent)' : 'transparent',
                            color: isProject ? '#000' : 'var(--text-secondary)',
                            fontWeight: isProject ? 700 : 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: isProject ? '0 0 16px rgba(139, 92, 246, 0.4)' : 'none'
                          }}
                        >
                          🚀 Project (30% Leaderboard Weight)
                        </button>
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
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {a.isProject && <span className="badge badge-accent">Project</span>}
                              <span className="badge badge-primary">{a.maxMarks} marks</span>
                            </div>
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
                                          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                                            {editingScoreId === s._id ? (
                                              <>
                                                <input 
                                                  type="number" 
                                                  style={{ width: "80px", padding: "4px 8px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "var(--radius-sm)" }}
                                                  value={editingScoreValue} 
                                                  onChange={(e) => setEditingScoreValue(e.target.value)} 
                                                />
                                                <span className="text-secondary text-sm"> / {a.maxMarks} marks</span>
                                                <button className="btn-primary btn-sm" onClick={() => updateSubmissionScore(s._id, a._id)}>Save</button>
                                                <button className="btn-ghost btn-sm" onClick={() => setEditingScoreId(null)}>Cancel</button>
                                              </>
                                            ) : (
                                              <>
                                                <span style={{ fontWeight: 700, color: "var(--accent)" }}>{s.aiResult.marks ?? "—"}</span>
                                                <span className="text-secondary text-sm"> / {a.maxMarks} marks</span>
                                                <button 
                                                  className="btn-ghost btn-sm" 
                                                  style={{ padding: "2px 8px", fontSize: "12px", marginLeft: "10px" }}
                                                  onClick={() => { setEditingScoreId(s._id); setEditingScoreValue(s.aiResult.marks ?? 0); }}
                                                >
                                                  ✎ Edit
                                                </button>
                                              </>
                                            )}
                                          </div>
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

            {/* ── Ask AI Tab ── */}
            {activeTab === "doubts" && (
              <div className="chat-layout">
                {/* History Sidebar */}
                <div className={`chat-history-sidebar ${historySidebarOpen ? "open" : "collapsed"}`}>
                  <div className="chat-history-top">
                    <button className="chat-new-btn" onClick={startNewChat}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      New Chat
                    </button>
                    <button className="chat-sidebar-toggle" onClick={() => setHistorySidebarOpen(false)} title="Collapse sidebar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="9" y1="3" x2="9" y2="21" />
                      </svg>
                    </button>
                  </div>

                  <div className="chat-history-list">
                    {groupedHistory.length === 0 ? (
                      <div className="chat-history-empty"><p>No conversations yet</p></div>
                    ) : (
                      groupedHistory.map((group) => (
                        <div key={group.label} className="chat-history-group">
                          <div className="chat-history-group-label">{group.label}</div>
                          {group.threads.map((thread) => (
                            <button
                              key={thread.id}
                              className={`chat-history-item ${selectedConversationId === thread.id ? "active" : ""}`}
                              onClick={() => selectConversation(thread)}
                              title={thread.title}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="chat-history-item-icon">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                              </svg>
                              <span className="chat-history-item-text">{thread.title}</span>
                            </button>
                          ))}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="chat-history-bottom">
                    <button className="chat-clear-btn" onClick={clearChatHistory}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      Clear History
                    </button>
                  </div>
                </div>

                {/* Main Chat Panel */}
                <div className="chat-main-panel">
                  <div className="chatbot-header">
                    <div className="chatbot-header-info">
                      {!historySidebarOpen && (
                        <button className="chat-sidebar-expand-btn" onClick={() => setHistorySidebarOpen(true)} title="Open sidebar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <line x1="9" y1="3" x2="9" y2="21" />
                          </svg>
                        </button>
                      )}
                      <div className="section-icon cyan" style={{ width: 32, height: 32, fontSize: 16 }}>🤖</div>
                      <div>
                        <h3 style={{ fontSize: "var(--font-md)", fontWeight: 700, color: "var(--text-primary)" }}>
                          AI Teaching Assistant
                        </h3>
                        <p style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)" }}>
                          Answers questions about student performance & materials.
                        </p>
                      </div>
                    </div>
                    {selectedConversationId && (
                      <button className="btn-ghost btn-sm" onClick={startNewChat} style={{ color: "var(--primary-light)" }}>
                        + New Chat
                      </button>
                    )}
                  </div>

                  {/* Chat Messages */}
                  <div className="chatbot-messages" ref={chatContainerRef}>
                    {chatMessages.length === 0 && !aiThinking && (
                      <div className="chatbot-empty">
                        <div style={{ fontSize: 56, marginBottom: 20 }}>🤖</div>
                        <h3 style={{ color: "var(--text-primary)", marginBottom: 8, fontSize: "var(--font-xl)" }}>Hello, Professor!</h3>
                        <p style={{ color: "var(--text-tertiary)", fontSize: "var(--font-sm)", maxWidth: 400, lineHeight: 1.6 }}>
                          I am your AI Teaching Assistant. I can help you with student analytics, summarize materials, or suggest the best way to explain a difficult concept.
                        </p>
                        <div className="chat-suggestions">
                          <button className="chat-suggestion-chip" onClick={() => setQuestion("Based on the uploaded slides, how should I explain this topic?")}>📖 Best way to teach a concept?</button>
                          <button className="chat-suggestion-chip" onClick={() => setQuestion("Can you create a short pop quiz for my students based on the materials?")}>📝 Generate a short quiz</button>
                        </div>
                      </div>
                    )}

                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`chat-bubble-row ${msg.role === "user" ? "chat-bubble-row-user" : "chat-bubble-row-ai"}`}>
                        {msg.role === "ai" && <div className="chat-avatar chat-avatar-ai">🤖</div>}
                        <div className={`chat-bubble ${msg.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"}`}>
                          <p className="chat-bubble-text">{msg.text}</p>
                          <span className="chat-bubble-time">
                            {new Date(msg.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        {msg.role === "user" && <div className="chat-avatar chat-avatar-user">{user?.name?.[0]?.toUpperCase() || "U"}</div>}
                      </div>
                    ))}

                    {aiThinking && (
                      <div className="chat-bubble-row chat-bubble-row-ai">
                        <div className="chat-avatar chat-avatar-ai">🤖</div>
                        <div className="chat-bubble chat-bubble-ai chat-typing">
                          <span className="typing-dot"></span><span className="typing-dot"></span><span className="typing-dot"></span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat Input */}
                  <div className="chatbot-input-bar">
                    <textarea
                      className="chatbot-input"
                      placeholder="Ask the assistant anything..."
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          askDoubt();
                        }
                      }}
                      rows={1}
                      disabled={aiThinking}
                    />
                    <button className="chatbot-send-btn" onClick={() => askDoubt()} disabled={aiThinking || !question.trim()} title="Send message">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Leaderboard Tab ── */}
            {activeTab === "leaderboard" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="section-header" style={{ marginBottom: 0 }}>
                    <div className="section-icon amber">🏆</div>
                    <div>
                      <h2>Leaderboard</h2>
                      <p>View student rankings and recompute AI scores</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-4)" }}>
                    <button className="btn-secondary btn-sm" onClick={loadLeaderboard}>Refresh</button>
                    <button className="btn-primary btn-sm" onClick={recomputeLeaderboard} disabled={submitting}>
                      {submitting ? "Recomputing..." : "🔄 Recompute Leaderboard"}
                    </button>
                  </div>
                </div>

                {leaderboard.length === 0 ? (
                  <div className="glass-card-static">
                    <div className="empty-state">
                      <div className="empty-state-icon">🏆</div>
                      <p className="empty-state-text">No leaderboard data available yet. Click Recompute to generate.</p>
                    </div>
                  </div>
                ) : (
                  <div className="glass-card-static" style={{ padding: 0, overflow: "hidden" }}>
                    <table className="leaderboard-table">
                      <thead>
                        <tr>
                          <th style={{ paddingLeft: "24px" }}>Rank</th>
                          <th>Student</th>
                          <th>Total Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.map((row) => (
                          <tr key={row._id || row.studentId?._id || row.studentId}>
                            <td style={{ paddingLeft: "24px" }}>
                              <span className={`rank-badge ${row.rank === 1 ? 'rank-1' : row.rank === 2 ? 'rank-2' : row.rank === 3 ? 'rank-3' : 'rank-default'}`}>
                                {row.rank}
                              </span>
                            </td>
                            <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                              {row.studentId?.name || row.studentId || "Student"}
                            </td>
                            <td>
                              <span className="badge badge-primary">
                                {row.totalScore?.toFixed?.(2) ?? row.totalScore}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="item-card mt-6">
                  <div className="item-card-header">
                    <span className="item-card-title">💡 How is this calculated?</span>
                  </div>
                  <p className="item-card-desc" style={{ marginTop: "var(--space-2)", lineHeight: "1.6" }}>
                    The AI leaderboard score combines academic performance and classroom engagement:<br/>
                    • <strong>Assignments (50%)</strong>: Total marks vs. Max possible marks.<br/>
                    • <strong>Projects (30%)</strong>: Practical project evaluations.<br/>
                    • <strong>Doubt & Engagement (20%)</strong>: Based on the quantity and AI-evaluated quality of questions asked via Ask AI.<br/>
                    <br/>
                    <em>Formula breakdown: (0.5 * Assignment Score) + (0.3 * Project Score) + (0.2 * Doubt Score)</em>
                  </p>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </>
  );
}
