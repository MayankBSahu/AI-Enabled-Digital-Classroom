import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import Sidebar from "../components/Sidebar";
import api from "../services/api";

export default function ProfessorDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState("materials");
  const [courseId, setCourseId] = useState("CSE101");
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

  /* ── Announcement State ── */
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");

  /* ── Analytics State ── */
  const [analytics, setAnalytics] = useState(null);

  /* ── Loading State ── */
  const [submitting, setSubmitting] = useState(false);

  const loadMaterials = async () => {
    try {
      const { data } = await api.get(`/materials/course/${courseId}`);
      setMaterials(data.materials || []);
      addToast("Materials loaded successfully", "success");
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to load materials", "error");
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
      addToast("Analytics loaded", "success");
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
        />

        <main className="app-content">
          {/* Page Header */}
          <div className="page-header">
            <h1>Professor Dashboard</h1>
            <p>Manage your courses, materials, and track student progress</p>
          </div>

          {/* Course Selector */}
          <div className="course-bar">
            <label htmlFor="prof-course-id">📚 Course</label>
            <input
              id="prof-course-id"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              placeholder="e.g. CSE101"
              style={{ maxWidth: 200 }}
            />
            <button className="btn-secondary btn-sm" onClick={recomputeLeaderboard}>
              Recompute Leaderboard
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content" key={activeTab}>
            {/* ── Materials Tab ── */}
            {activeTab === "materials" && (
              <div className="content-grid two">
                <section className="glass-card-static">
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

                <section className="glass-card-static">
                  <div className="section-header">
                    <div className="section-icon cyan">📋</div>
                    <div>
                      <h2>Quick Actions</h2>
                      <p>Common tasks for this course</p>
                    </div>
                  </div>

                  <div className="form-grid" style={{ gap: "12px" }}>
                    <button className="btn-secondary btn-full" onClick={loadMaterials}>
                      📂 Load Uploaded Materials
                    </button>
                    <button className="btn-secondary btn-full" onClick={loadAnalytics}>
                      📊 Load Course Analytics
                    </button>
                    <button className="btn-secondary btn-full" onClick={recomputeLeaderboard}>
                      🏆 Recompute Leaderboard
                    </button>
                  </div>

                  <div style={{ marginTop: "24px" }}>
                    <div className="section-header">
                      <div className="section-icon green">💡</div>
                      <div>
                        <h2>How RAG Works</h2>
                      </div>
                    </div>
                    <div className="item-card">
                      <p className="item-card-desc">
                        When you upload material text, it's automatically chunked and indexed into
                        the ChromaDB vector database. Students can then ask doubts that are answered
                        using only your course materials — ensuring accurate, contextual responses.
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* ── Assignments Tab ── */}
            {activeTab === "assignments" && (
              <div style={{ maxWidth: 640 }}>
                <section className="glass-card-static">
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
              </div>
            )}

            {/* ── Announcements Tab ── */}
            {activeTab === "announcements" && (
              <div style={{ maxWidth: 640 }}>
                <section className="glass-card-static">
                  <div className="section-header">
                    <div className="section-icon amber">📢</div>
                    <div>
                      <h2>Post Announcement</h2>
                      <p>Broadcast a message to all students in this course</p>
                    </div>
                  </div>

                  <form className="form-grid" onSubmit={postAnnouncement}>
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
                  <button className="btn-primary" onClick={loadAnalytics}>Load Analytics</button>
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

            {/* ── Uploaded Files Tab ── */}
            {activeTab === "files" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="section-header" style={{ marginBottom: 0 }}>
                    <div className="section-icon indigo">📁</div>
                    <div>
                      <h2>Uploaded Materials</h2>
                      <p>All materials for {courseId}</p>
                    </div>
                  </div>
                  <button className="btn-primary" onClick={loadMaterials}>Refresh</button>
                </div>

                {materials.length === 0 ? (
                  <div className="glass-card-static">
                    <div className="empty-state">
                      <div className="empty-state-icon">📂</div>
                      <p className="empty-state-text">No materials uploaded yet. Go to the Materials tab to upload course content.</p>
                    </div>
                  </div>
                ) : (
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
          </div>
        </main>
      </div>
    </>
  );
}
