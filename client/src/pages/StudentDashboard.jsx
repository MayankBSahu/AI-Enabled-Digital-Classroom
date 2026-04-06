import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import Sidebar from "../components/Sidebar";
import api from "../services/api";

export default function StudentDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState("courses");
  const [courseId, setCourseId] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [myCourses, setMyCourses] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [courseProfessor, setCourseProfessor] = useState(null);
  
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollmentCode, setEnrollmentCode] = useState("");
  const [enrolling, setEnrolling] = useState(false);

  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
  const apiOrigin = apiBase.replace(/\/api\/?$/, "");

  const toPublicFileUrl = (fileUrl) => {
    if (!fileUrl) return "";
    if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
    return `${apiOrigin}${fileUrl}`;
  };

  /* ── Assignments ── */
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [submissionFile, setSubmissionFile] = useState(null);
  const [submissionText, setSubmissionText] = useState("");
  const [mySubmissions, setMySubmissions] = useState([]);

  /* ── Doubts / Chat ── */
  const [question, setQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [allDoubts, setAllDoubts] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [historySidebarOpen, setHistorySidebarOpen] = useState(true);
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  /* ── Lists ── */
  const [leaderboard, setLeaderboard] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [hasNewAnnouncements, setHasNewAnnouncements] = useState(false);
  const [materials, setMaterials] = useState([]);

  /* ── Loading ── */
  const [submitting, setSubmitting] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);

  const loadMyCourses = async () => {
    try {
      const { data } = await api.get('/courses/student');
      setMyCourses(data.courses || []);
    } catch (error) {
      console.error("Failed to load enrolled courses");
    }
  };

  useEffect(() => {
    loadMyCourses();
  }, []);

  useEffect(() => {
    if (courseId) {
       loadAnnouncements(true);
    }
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;
    if (activeTab === "people" || activeTab === "courses") loadStudents();
    else if (activeTab === "materials" || activeTab === "files") loadMaterials();
    else if (activeTab === "leaderboard") loadLeaderboard();
    else if (activeTab === "doubts") loadChatHistory();
    else if (activeTab === "assignments") { loadAssignments(); loadMySubmissions(); }

    if (activeTab === "announcements" && hasNewAnnouncements) {
      setHasNewAnnouncements(false);
      localStorage.setItem(`last_announcement_view_${courseId}`, Date.now().toString());
    }
  }, [activeTab, courseId, hasNewAnnouncements]);

  const loadStudents = async () => {
    try {
      const { data } = await api.get(`/courses/${courseId}/students`);
      setEnrolledStudents(data.students || []);
      setCourseProfessor(data.professor || null);
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to load students", "error");
    }
  };

  const handleEnroll = async (e) => {
    e.preventDefault();
    setEnrolling(true);
    try {
      await api.post('/courses/enroll', { enrollmentCode });
      addToast("Successfully enrolled!", "success");
      setShowEnrollModal(false);
      setEnrollmentCode("");
      loadMyCourses();
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to enroll", "error");
    } finally {
      setEnrolling(false);
    }
  };

  const loadAssignments = async () => {
    try {
      const { data } = await api.get(`/assignments/course/${courseId}`);
      setAssignments(data.assignments || []);
      if (data.assignments?.length) {
        setSelectedAssignmentId(data.assignments[0]._id);
      }
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to load assignments", "error");
    }
  };

  const loadMySubmissions = async () => {
    try {
      const { data } = await api.get(`/submissions/my/${courseId}`);
      setMySubmissions(data.submissions || []);
    } catch (error) {
      console.error("Failed to load submissions");
    }
  };

  const submitAssignment = async (e) => {
    e.preventDefault();
    if (!selectedAssignmentId || !submissionFile) {
      addToast("Please select an assignment and attach a file", "error");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", submissionFile);
      formData.append("submissionText", submissionText);
      const { data } = await api.post(`/submissions/${selectedAssignmentId}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const marks = data.submission?.aiResult?.marks;
      addToast(`Submitted! ${marks != null ? `Score: ${marks}` : "Evaluation pending..."}`, "success");
      setSubmissionFile(null);
      setSubmissionText("");
      await loadMySubmissions();
    } catch (error) {
      addToast(error.response?.data?.message || "Submission failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Day-based grouping helpers ── */
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
    // 1. Group single doubts into cohesive Threads
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
    
    // Sort threads descending
    const threads = Object.values(threadsMap).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 2. Group threads by Date Section
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
      const doubts = data.doubts || [];
      setAllDoubts(doubts);
      // Start with empty state — user picks a conversation or starts new
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
    setSelectedConversationId(`session_${Date.now()}`); // Create a unique local session ID
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
      console.error("Clear error:", error);
      addToast("Failed to clear history", "error");
    }
  };

  const askDoubt = async (e) => {
    if (e) e.preventDefault();
    if (!question.trim()) return;
    const userMsg = question.trim();
    setQuestion("");

    // Determine the active session
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
        // Update selection explicitly in case of backend ID change
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

  const loadLeaderboard = async () => {
    try {
      const { data } = await api.get(`/leaderboard/${courseId}`);
      setLeaderboard(data.leaderboard || []);
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to load leaderboard", "error");
    }
  };

  const loadAnnouncements = async (background = false) => {
    try {
      const { data } = await api.get(`/announcements/course/${courseId}`);
      const fetched = data.announcements || [];
      setAnnouncements(fetched);
      if (background && fetched.length > 0) {
         const lastViewed = localStorage.getItem(`last_announcement_view_${courseId}`);
         if (!lastViewed || new Date(fetched[0].createdAt).getTime() > parseInt(lastViewed, 10)) {
            setHasNewAnnouncements(true);
            addToast(`You have ${fetched.length} course announcements to review.`, "info");
         }
      }
    } catch (error) {
      if (!background) addToast(error.response?.data?.message || "Failed to load announcements", "error");
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

  const getRankClass = (rank) => {
    if (rank === 1) return "rank-1";
    if (rank === 2) return "rank-2";
    if (rank === 3) return "rank-3";
    return "rank-default";
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
          role="student"
          hasCourseSelected={!!selectedCourse}
        />

        <main className="app-content">
          {/* Page Header */}
          <div className="page-header">
            <h1>Student Dashboard</h1>
            <p>Submit assignments, ask AI-powered doubts, and track your progress</p>
          </div>

          {/* Course Selector */}
          {selectedCourse && activeTab !== "courses" ? (
            <div className="course-bar">
              <div className="selected-course-indicator">
                <span className="selected-course-icon" style={{ background: selectedCourse.color || "var(--primary)" }}>{selectedCourse.icon || "📚"}</span>
                <div className="selected-course-info">
                  <span className="selected-course-name">{selectedCourse.name}</span>
                  <span className="selected-course-id">{selectedCourse.courseId} • {selectedCourse.professor?.name || "Professor"}</span>
                </div>
              </div>
              <button className="btn-ghost btn-sm" onClick={() => { setSelectedCourse(null); setCourseId(""); setActiveTab("courses"); }} style={{ marginLeft: 'auto' }}>
                ↩ Change Course
              </button>
            </div>
          ) : (
            activeTab === "courses" && (
              <div>
                <div className="course-grid-header">
                  <div className="section-icon indigo">📚</div>
                  <div>
                    <h2>My Courses</h2>
                    <p>Select a course to view assignments, materials, and track progress</p>
                  </div>
                </div>
                <div className="course-grid mb-8">
                  {myCourses.length === 0 ? (
                    <div className="glass-card-static" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "var(--space-8)" }}>
                      <div className="section-icon mx-auto mb-4" style={{ filter: "grayscale(1)", opacity: 0.5 }}>📭</div>
                      <p className="empty-state-text text-lg">You are not enrolled in any courses yet.</p>
                      <p className="text-secondary">Click the + button below to join a class using an enrollment code.</p>
                    </div>
                  ) : (
                    myCourses.map((c) => (
                      <div
                        key={c._id}
                        className={`course-card ${selectedCourse?._id === c._id ? 'selected' : ''}`}
                        onClick={() => { setSelectedCourse(c); setCourseId(c.courseId); }}
                        style={{ '--course-color': c.color || "var(--primary)", ...(selectedCourse?._id === c._id ? { border: `2px solid ${c.color || "var(--primary)"}` } : {}) }}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="course-card-icon" style={{ background: c.color || "var(--primary)", margin: 0 }}>
                            {c.icon || "📚"}
                          </div>
                          <div className="badge badge-primary">
                            {c.courseId}
                          </div>
                        </div>
                        <div className="course-card-content">
                          <h3 className="course-card-title">{c.name}</h3>
                          <p className="course-card-id">{c.professor?.name || "Professor"}</p>
                        </div>
                        <div className="course-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="course-card-students text-secondary text-sm">Select to view students</span>
                          <button className="btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); setSelectedCourse(c); setCourseId(c.courseId); setActiveTab("assignments"); }}>View Dashboard →</button>
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
              </div>
            )
          )}

          {/* Tab Content */}
          <div className="tab-content" key={activeTab}>

            {/* ── People Tab ── */}
            {activeTab === "people" && (
              <div>
                <div className="section-header">
                  <div className="section-icon indigo">👥</div>
                  <div>
                    <h2>Classroom Roster</h2>
                    <p>View the professor and all students enrolled in this course</p>
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

            {/* ── Assignments Tab ── */}
            {activeTab === "assignments" && (
              <div style={{ maxWidth: 640 }}>
                <section className="glass-card-static">
                  <div className="section-header">
                    <div className="section-icon indigo">📩</div>
                    <div>
                      <h2>Submit Assignment</h2>
                      <p>Upload your work for AI-powered evaluation</p>
                    </div>
                  </div>

                  {announcements.find(a => a.type === 'assignment' || a.type === 'project') && (
                    <div className="item-card mb-6" style={{ borderLeft: "4px solid var(--primary-light)", background: "var(--surface-hover)", cursor: "pointer" }} onClick={() => setSelectedAssignmentId(announcements.find(a => a.type === 'assignment' || a.type === 'project').referenceId || "")}>
                      <div className="item-card-header">
                        <span className="item-card-title text-primary-light">🚀 Latest Requirement: {announcements.find(a => a.type === 'assignment' || a.type === 'project').title}</span>
                      </div>
                      <p className="item-card-desc" style={{ marginTop: "var(--space-2)" }}>{announcements.find(a => a.type === 'assignment' || a.type === 'project').message}</p>
                    </div>
                  )}

                  <form className="form-grid" onSubmit={submitAssignment}>
                    <div className="form-group">
                      <label htmlFor="sub-assignment">Select Assignment</label>
                      <select
                        id="sub-assignment"
                        value={selectedAssignmentId}
                        onChange={(e) => setSelectedAssignmentId(e.target.value)}
                      >
                        <option value="">
                          {assignments.length === 0 ? "No assignments loaded" : "Choose assignment..."}
                        </option>
                        {assignments.map((a) => (
                          <option key={a._id} value={a._id}>
                            {a.isProject ? "[Project] " : ""}{a.title} {a.maxMarks ? `(${a.maxMarks} marks)` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Upload File (PDF/DOCX)</label>
                      <input
                        id="sub-file"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="sub-text">Answer Text (optional, for AI evaluation)</label>
                      <textarea
                        id="sub-text"
                        rows={5}
                        placeholder="Paste your answer text here for more accurate AI evaluation..."
                        value={submissionText}
                        onChange={(e) => setSubmissionText(e.target.value)}
                      />
                    </div>

                    <div className="form-actions">
                      <button type="submit" className="btn-primary btn-full" disabled={submitting}>
                        {submitting ? (
                          <><span className="spinner"></span> Submitting & Evaluating...</>
                        ) : (
                          "Upload & Evaluate"
                        )}
                      </button>
                    </div>
                  </form>
                </section>

                {/* Past Submissions */}
                <section className="glass-card-static mt-8">
                  <div className="section-header">
                    <div className="section-icon green">📋</div>
                    <div>
                      <h2>My Submissions</h2>
                      <p>{mySubmissions.length} submission{mySubmissions.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>

                  {mySubmissions.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">📝</div>
                      <p className="empty-state-text">No submissions yet. Submit your first assignment above!</p>
                    </div>
                  ) : (
                    <div className="form-grid">
                      {mySubmissions.map((s) => (
                        <div key={s._id} className="item-card">
                          <div className="item-card-header">
                            <span className="item-card-title">{s.assignmentId?.title || "Assignment"}</span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {s.assignmentId?.isProject && <span className="badge badge-accent">Project</span>}
                              <span className={`badge ${s.status === "evaluated" ? "badge-accent" : s.status === "error" ? "badge-warning" : "badge-primary"}`}>
                                {s.status}
                              </span>
                            </div>
                          </div>
                          {s.aiResult && s.status === "evaluated" && (
                            <div style={{ marginTop: "var(--space-3)" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-2)" }}>
                                <span style={{ fontWeight: 700, fontSize: "var(--font-xl)", color: "var(--accent)" }}>
                                  {s.aiResult.marks ?? "—"}
                                </span>
                                <span className="text-secondary text-sm">/ {s.assignmentId?.maxMarks || 100} marks</span>
                              </div>
                              <p className="item-card-desc">{s.aiResult.feedback}</p>
                              {s.aiResult.mistakes?.length > 0 && (
                                <div style={{ marginTop: "var(--space-2)" }}>
                                  <span className="text-sm" style={{ fontWeight: 600, color: "var(--warning)" }}>Mistakes:</span>
                                  <ul style={{ paddingLeft: "var(--space-5)", marginTop: "var(--space-1)", color: "var(--text-secondary)", fontSize: "var(--font-sm)" }}>
                                    {s.aiResult.mistakes.map((m, i) => <li key={i}>{m}</li>)}
                                  </ul>
                                </div>
                              )}
                              {s.aiResult.suggestions?.length > 0 && (
                                <div style={{ marginTop: "var(--space-2)" }}>
                                  <span className="text-sm" style={{ fontWeight: 600, color: "var(--primary-light)" }}>Suggestions:</span>
                                  <ul style={{ paddingLeft: "var(--space-5)", marginTop: "var(--space-1)", color: "var(--text-secondary)", fontSize: "var(--font-sm)" }}>
                                    {s.aiResult.suggestions.map((sg, i) => <li key={i}>{sg}</li>)}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="item-card-meta" style={{ marginTop: "var(--space-2)" }}>
                            {new Date(s.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
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
                    <button
                      className="chat-sidebar-toggle"
                      onClick={() => setHistorySidebarOpen(false)}
                      title="Collapse sidebar"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="9" y1="3" x2="9" y2="21" />
                      </svg>
                    </button>
                  </div>

                  <div className="chat-history-list">
                    {groupedHistory.length === 0 ? (
                      <div className="chat-history-empty">
                        <p>No conversations yet</p>
                      </div>
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
                              <span className="chat-history-item-text">
                                {thread.title}
                              </span>
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
                  {/* Chat Header */}
                  <div className="chatbot-header">
                    <div className="chatbot-header-info">
                      {/* Sidebar Toggle (always visible) */}
                      {!historySidebarOpen && (
                        <button
                          className="chat-sidebar-expand-btn"
                          onClick={() => setHistorySidebarOpen(true)}
                          title="Open sidebar"
                        >
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
                          Answers from course materials using RAG
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
                        <h3 style={{ color: "var(--text-primary)", marginBottom: 8, fontSize: "var(--font-xl)" }}>How can I help you today?</h3>
                        <p style={{ color: "var(--text-tertiary)", fontSize: "var(--font-sm)", maxWidth: 400, lineHeight: 1.6 }}>
                          I answer questions using only your professor's uploaded course materials. Ask me about any topic covered in your lectures, notes, or slides.
                        </p>
                        <div className="chat-suggestions">
                          <button className="chat-suggestion-chip" onClick={() => { setQuestion("Summarize the key topics covered in this course"); }}>📝 Summarize key topics</button>
                          <button className="chat-suggestion-chip" onClick={() => { setQuestion("What are the main concepts I should know?"); }}>💡 Main concepts</button>
                          <button className="chat-suggestion-chip" onClick={() => { setQuestion("Explain the most important topic in detail"); }}>📖 Explain a topic</button>
                        </div>
                      </div>
                    )}

                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`chat-bubble-row ${msg.role === "user" ? "chat-bubble-row-user" : "chat-bubble-row-ai"}`}>
                        {msg.role === "ai" && (
                          <div className="chat-avatar chat-avatar-ai">🤖</div>
                        )}
                        <div className={`chat-bubble ${msg.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"}`}>
                          <p className="chat-bubble-text">{msg.text}</p>
                          <span className="chat-bubble-time">
                            {new Date(msg.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        {msg.role === "user" && (
                          <div className="chat-avatar chat-avatar-user">{user?.name?.[0]?.toUpperCase() || "U"}</div>
                        )}
                      </div>
                    ))}

                    {aiThinking && (
                      <div className="chat-bubble-row chat-bubble-row-ai">
                        <div className="chat-avatar chat-avatar-ai">🤖</div>
                        <div className="chat-bubble chat-bubble-ai chat-typing">
                          <span className="typing-dot"></span>
                          <span className="typing-dot"></span>
                          <span className="typing-dot"></span>
                        </div>
                      </div>
                    )}

                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat Input */}
                  <div className="chatbot-input-bar">
                    <textarea
                      className="chatbot-input"
                      placeholder="Ask anything about the course material..."
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
                    <button
                      className="chatbot-send-btn"
                      onClick={() => askDoubt()}
                      disabled={aiThinking || !question.trim()}
                      title="Send message"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Materials Tab ── */}
            {activeTab === "materials" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="section-header" style={{ marginBottom: 0 }}>
                    <div className="section-icon green">📚</div>
                    <div>
                      <h2>Course Materials</h2>
                      <p>Slides, notes, and resources from your professor</p>
                    </div>
                  </div>
                  <button className="btn-secondary btn-sm" onClick={loadMaterials}>Refresh</button>
                </div>

                {materials.length === 0 ? (
                  <div className="glass-card-static">
                    <div className="empty-state">
                      <div className="empty-state-icon">📚</div>
                      <p className="empty-state-text">No materials available yet for this course.</p>
                    </div>
                  </div>
                ) : (
                  <div className="content-grid two">
                    {materials.map((m) => (
                      <div key={m._id} className="item-card">
                        <div className="item-card-header">
                          <span className="item-card-title">{m.title}</span>
                          <span className="badge badge-primary">{m.type}</span>
                        </div>
                        <p className="item-card-desc">{m.description || "No description"}</p>
                        {m.fileUrl && (
                          <div className="item-card-actions">
                            <a href={toPublicFileUrl(m.fileUrl)} target="_blank" rel="noreferrer" className="link-btn">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                              Open File
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Announcements Tab ── */}
            {activeTab === "announcements" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="section-header" style={{ marginBottom: 0 }}>
                    <div className="section-icon amber">📢</div>
                    <div>
                      <h2>Announcements</h2>
                      <p>Latest updates from your professor</p>
                    </div>
                  </div>
                  <button className="btn-secondary btn-sm" onClick={loadAnnouncements}>Refresh</button>
                </div>

                {announcements.length === 0 ? (
                  <div className="glass-card-static">
                    <div className="empty-state">
                      <div className="empty-state-icon">📢</div>
                      <p className="empty-state-text">No announcements yet for this course.</p>
                    </div>
                  </div>
                ) : (
                  <div className="form-grid">
                    {announcements.map((a) => {
                      const isTask = a.type === "assignment" || a.type === "project";
                      return (
                        <div 
                          key={a._id} 
                          className={`announcement-item ${isTask ? 'premium-banner' : ''}`}
                          style={isTask ? { border: "1px solid var(--primary-light)", background: "linear-gradient(145deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.05))", cursor: "pointer", transition: "transform 0.2s" } : {}}
                          onClick={() => {
                            if (isTask) {
                              setActiveTab("assignments");
                              if (a.referenceId) setSelectedAssignmentId(a.referenceId);
                            }
                          }}
                        >
                          <div className="announcement-title" style={isTask ? { color: "var(--primary-light)" } : {}}>
                            {isTask && "🔥 "}{a.title}
                          </div>
                          <div className="announcement-body">{a.message}</div>
                          {a.createdAt && (
                            <div className="announcement-date text-secondary mt-3">
                              {new Date(a.createdAt).toLocaleDateString(undefined, {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          )}
                          {isTask && (
                             <div style={{ marginTop: "16px" }}>
                               <button className="btn-primary btn-sm" style={{ background: "var(--primary)" }}>Go to {a.type === 'project' ? 'Project' : 'Assignment'} →</button>
                             </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
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
                      <p>See how you rank among your peers</p>
                    </div>
                  </div>
                  <button className="btn-secondary btn-sm" onClick={loadLeaderboard}>Refresh</button>
                </div>

                {leaderboard.length === 0 ? (
                  <div className="glass-card-static">
                    <div className="empty-state">
                      <div className="empty-state-icon">🏆</div>
                      <p className="empty-state-text">No leaderboard data available yet.</p>
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
                              <span className={`rank-badge ${getRankClass(row.rank)}`}>
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
                    The AI leaderboard score combines your academic performance and classroom engagement:<br/>
                    • <strong>Assignments (50%)</strong>: Total marks vs. Max possible marks.<br/>
                    • <strong>Projects (30%)</strong>: Practical project evaluations.<br/>
                    • <strong>Doubt & Engagement (20%)</strong>: Based on the quantity and AI-evaluated quality of questions you ask via Ask AI.<br/>
                    <br/>
                    <em>Formula breakdown: (0.5 * Assignment Score) + (0.3 * Project Score) + (0.2 * Doubt Score)</em>
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Floating Action Button - only on Courses tab */}
      {activeTab === "courses" && (
        <button className="fab-btn" title="Enroll in Course" onClick={() => setShowEnrollModal(true)}>
          +
        </button>
      )}

      {/* Enrollment Modal */}
      {showEnrollModal && (
        <div className="modal-overlay" onClick={() => setShowEnrollModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Join a Classroom</h3>
              <button className="modal-close" onClick={() => setShowEnrollModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleEnroll}>
              <div className="form-group mb-6">
                <label>Enrollment Code </label>
                <div className="text-sm text-secondary mb-2">Ask your professor for the 6-character class code.</div>
                <input
                  type="text"
                  className="enroll-code-disp"
                  style={{
                    padding: "0.5rem",
                    margin: "0",
                    width: "100%",
                    textTransform: "uppercase",
                  }}
                  placeholder="e.g. XY78ZP"
                  value={enrollmentCode}
                  onChange={(e) => setEnrollmentCode(e.target.value.toUpperCase())}
                  required
                  maxLength={6}
                />
              </div>
              <button type="submit" className="btn-primary btn-full" disabled={enrolling}>
                {enrolling ? <><span className="spinner"></span> Joining...</> : "Join Classroom"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
