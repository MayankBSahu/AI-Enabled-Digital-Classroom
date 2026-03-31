import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import Sidebar from "../components/Sidebar";
import api from "../services/api";

export default function StudentDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState("submit");
  const [courseId, setCourseId] = useState("CSE101");
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

  /* ── Doubts ── */
  const [question, setQuestion] = useState("");
  const [doubtAnswer, setDoubtAnswer] = useState("");
  const [doubtScore, setDoubtScore] = useState(null);

  /* ── Lists ── */
  const [leaderboard, setLeaderboard] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [materials, setMaterials] = useState([]);

  /* ── Loading ── */
  const [submitting, setSubmitting] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);

  const loadAssignments = async () => {
    try {
      const { data } = await api.get(`/assignments/course/${courseId}`);
      setAssignments(data.assignments || []);
      if (data.assignments?.length) {
        setSelectedAssignmentId(data.assignments[0]._id);
      }
      addToast("Assignments loaded", "success");
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to load assignments", "error");
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
    } catch (error) {
      addToast(error.response?.data?.message || "Submission failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const askDoubt = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    setAiThinking(true);
    setDoubtAnswer("");
    setDoubtScore(null);
    try {
      const { data } = await api.post("/doubts/ask", { courseId, question });
      setDoubtAnswer(data.doubt?.answer || "No answer generated.");
      setDoubtScore(data.doubt?.qualityScore ?? null);
      addToast("AI answered your doubt", "success");
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to get answer", "error");
    } finally {
      setAiThinking(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const { data } = await api.get(`/leaderboard/${courseId}`);
      setLeaderboard(data.leaderboard || []);
      addToast("Leaderboard loaded", "success");
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to load leaderboard", "error");
    }
  };

  const loadAnnouncements = async () => {
    try {
      const { data } = await api.get(`/announcements/course/${courseId}`);
      setAnnouncements(data.announcements || []);
      addToast("Announcements loaded", "success");
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to load announcements", "error");
    }
  };

  const loadMaterials = async () => {
    try {
      const { data } = await api.get(`/materials/course/${courseId}`);
      setMaterials(data.materials || []);
      addToast("Materials loaded", "success");
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
        />

        <main className="app-content">
          {/* Page Header */}
          <div className="page-header">
            <h1>Student Dashboard</h1>
            <p>Submit assignments, ask AI-powered doubts, and track your progress</p>
          </div>

          {/* Course Selector */}
          <div className="course-bar">
            <label htmlFor="stu-course-id">📚 Course</label>
            <input
              id="stu-course-id"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              placeholder="e.g. CSE101"
              style={{ maxWidth: 200 }}
            />
            <button className="btn-secondary btn-sm" onClick={loadAssignments}>
              Load Assignments
            </button>
            <button className="btn-secondary btn-sm" onClick={loadMaterials}>
              Load Materials
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content" key={activeTab}>

            {/* ── Submit Work Tab ── */}
            {activeTab === "submit" && (
              <div style={{ maxWidth: 640 }}>
                <section className="glass-card-static">
                  <div className="section-header">
                    <div className="section-icon indigo">📩</div>
                    <div>
                      <h2>Submit Assignment</h2>
                      <p>Upload your work for AI-powered evaluation</p>
                    </div>
                  </div>

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
                            {a.title} {a.maxMarks ? `(${a.maxMarks} marks)` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    {assignments.length === 0 && (
                      <div className="item-card">
                        <p className="item-card-desc">
                          💡 Click "Load Assignments" in the course bar above to see available assignments.
                        </p>
                      </div>
                    )}

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
              </div>
            )}

            {/* ── Ask AI Tab ── */}
            {activeTab === "doubts" && (
              <div style={{ maxWidth: 720 }}>
                <section className="glass-card-static">
                  <div className="section-header">
                    <div className="section-icon cyan">🤖</div>
                    <div>
                      <h2>Ask a Doubt</h2>
                      <p>AI answers from professor's course materials using RAG</p>
                    </div>
                  </div>

                  <form className="form-grid" onSubmit={askDoubt}>
                    <div className="form-group">
                      <label htmlFor="doubt-q">Your Question</label>
                      <textarea
                        id="doubt-q"
                        rows={4}
                        placeholder="Ask anything about the course material..."
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                      />
                    </div>

                    <div className="form-actions">
                      <button type="submit" className="btn-accent btn-full" disabled={aiThinking}>
                        {aiThinking ? (
                          <><span className="spinner"></span> AI is thinking...</>
                        ) : (
                          "🤖 Ask AI"
                        )}
                      </button>
                    </div>
                  </form>

                  {doubtAnswer && (
                    <div className="doubt-answer">
                      <p>{doubtAnswer}</p>
                      {doubtScore != null && (
                        <div style={{ marginTop: "12px" }}>
                          <span className="badge badge-accent">Quality Score: {doubtScore}</span>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                <div className="item-card mt-4">
                  <p className="item-card-desc">
                    💡 <strong>How it works:</strong> Your question is matched against the professor's uploaded
                    materials using vector search (RAG). The AI only answers from course content, ensuring
                    accurate and relevant responses.
                  </p>
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
                  <button className="btn-primary" onClick={loadMaterials}>Refresh</button>
                </div>

                {materials.length === 0 ? (
                  <div className="glass-card-static">
                    <div className="empty-state">
                      <div className="empty-state-icon">📚</div>
                      <p className="empty-state-text">No materials loaded. Click "Refresh" or "Load Materials" to fetch course content.</p>
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
                  <button className="btn-primary" onClick={loadAnnouncements}>Refresh</button>
                </div>

                {announcements.length === 0 ? (
                  <div className="glass-card-static">
                    <div className="empty-state">
                      <div className="empty-state-icon">📢</div>
                      <p className="empty-state-text">No announcements yet. Click "Refresh" to check for updates.</p>
                    </div>
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
                  <button className="btn-primary" onClick={loadLeaderboard}>Refresh</button>
                </div>

                {leaderboard.length === 0 ? (
                  <div className="glass-card-static">
                    <div className="empty-state">
                      <div className="empty-state-icon">🏆</div>
                      <p className="empty-state-text">No leaderboard data yet. Click "Refresh" to load rankings.</p>
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
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
