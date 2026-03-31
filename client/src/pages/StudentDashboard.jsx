import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export default function StudentDashboard() {
  const { user, logout } = useAuth();

  const [courseId, setCourseId] = useState("CSE101");
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [submissionFile, setSubmissionFile] = useState(null);
  const [submissionText, setSubmissionText] = useState("");
  const [question, setQuestion] = useState("");
  const [doubtAnswer, setDoubtAnswer] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [status, setStatus] = useState("");
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
  const apiOrigin = apiBase.replace(/\/api\/?$/, "");

  const toPublicFileUrl = (fileUrl) => {
    if (!fileUrl) return "";
    if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
    return `${apiOrigin}${fileUrl}`;
  };

  const loadAssignments = async () => {
    try {
      const { data } = await api.get(`/assignments/course/${courseId}`);
      setAssignments(data.assignments || []);
      if (data.assignments?.length) {
        setSelectedAssignmentId(data.assignments[0]._id);
      }
      setStatus("Assignments loaded.");
    } catch (error) {
      setStatus(error.response?.data?.message || "Failed to load assignments");
    }
  };

  const submitAssignment = async (e) => {
    e.preventDefault();
    if (!selectedAssignmentId || !submissionFile) {
      setStatus("Select assignment and file first.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", submissionFile);
      formData.append("submissionText", submissionText);

      const { data } = await api.post(`/submissions/${selectedAssignmentId}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setStatus(`Submitted. Marks: ${data.submission?.aiResult?.marks ?? "pending"}`);
    } catch (error) {
      setStatus(error.response?.data?.message || "Submission failed");
    }
  };

  const askDoubt = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    try {
      const { data } = await api.post("/doubts/ask", { courseId, question });
      setDoubtAnswer(data.doubt?.answer || "No answer generated.");
      setStatus("Doubt answered.");
    } catch (error) {
      setStatus(error.response?.data?.message || "Failed to ask doubt");
    }
  };

  const loadLeaderboard = async () => {
    try {
      const { data } = await api.get(`/leaderboard/${courseId}`);
      setLeaderboard(data.leaderboard || []);
      setStatus("Leaderboard loaded.");
    } catch (error) {
      setStatus(error.response?.data?.message || "Failed to load leaderboard");
    }
  };

  const loadAnnouncements = async () => {
    try {
      const { data } = await api.get(`/announcements/course/${courseId}`);
      setAnnouncements(data.announcements || []);
      setStatus("Announcements loaded.");
    } catch (error) {
      setStatus(error.response?.data?.message || "Failed to load announcements");
    }
  };

  const loadMaterials = async () => {
    try {
      const { data } = await api.get(`/materials/course/${courseId}`);
      setMaterials(data.materials || []);
      setStatus("Slides/notes loaded.");
    } catch (error) {
      setStatus(error.response?.data?.message || "Failed to load slides/notes");
    }
  };

  return (
    <div className="page">
      <div className="navbar">
        <h2>Student Dashboard</h2>
        <div>
          <span className="badge">{user?.email}</span>
          <button style={{ marginLeft: 12, width: 96 }} onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <label>Course ID</label>
        <input value={courseId} onChange={(e) => setCourseId(e.target.value)} placeholder="e.g. CSE101" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10, marginTop: 10 }}>
          <button onClick={loadAssignments}>Load Assignments</button>
          <button onClick={loadMaterials}>Load Slides/Notes</button>
          <button onClick={loadAnnouncements}>Load Announcements</button>
          <button onClick={loadLeaderboard}>Load Leaderboard</button>
        </div>
      </div>

      <div className="grid two">
        <section className="card">
          <h3>Submit Assignment</h3>
          <form className="grid" onSubmit={submitAssignment}>
            <select value={selectedAssignmentId} onChange={(e) => setSelectedAssignmentId(e.target.value)}>
              <option value="">Select assignment</option>
              {assignments.map((a) => (
                <option key={a._id} value={a._id}>{a.title}</option>
              ))}
            </select>
            <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)} />
            <textarea
              rows={4}
              placeholder="Optional extracted answer text for evaluation"
              value={submissionText}
              onChange={(e) => setSubmissionText(e.target.value)}
            />
            <button type="submit">Upload + Evaluate</button>
          </form>
        </section>

        <section className="card">
          <h3>Ask Doubt (RAG)</h3>
          <form className="grid" onSubmit={askDoubt}>
            <textarea
              rows={4}
              placeholder="Ask from professor materials"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button type="submit">Ask AI</button>
          </form>
          {doubtAnswer && <p style={{ marginTop: 10 }}>{doubtAnswer}</p>}
        </section>

        <section className="card">
          <h3>Slides and Notes</h3>
          {materials.length === 0 ? <p>No materials loaded.</p> : (
            materials.map((m) => (
              <div key={m._id} style={{ marginBottom: 12 }}>
                <strong>{m.title}</strong> <span className="badge">{m.type}</span>
                <p style={{ margin: "6px 0" }}>{m.description || "No description"}</p>
                {m.fileUrl ? (
                  <a href={toPublicFileUrl(m.fileUrl)} target="_blank" rel="noreferrer">Open file</a>
                ) : (
                  <p>No file attached (text-only material).</p>
                )}
              </div>
            ))
          )}
        </section>

        <section className="card">
          <h3>Announcements</h3>
          {announcements.length === 0 ? <p>No announcements loaded.</p> : (
            announcements.map((a) => (
              <div key={a._id} style={{ marginBottom: 12 }}>
                <strong>{a.title}</strong>
                <p style={{ margin: "6px 0" }}>{a.message}</p>
              </div>
            ))
          )}
        </section>

        <section className="card">
          <h3>Leaderboard</h3>
          {leaderboard.length === 0 ? <p>No leaderboard data.</p> : (
            leaderboard.map((row) => (
              <div key={row._id || row.studentId?._id || row.studentId} style={{ marginBottom: 8 }}>
                <strong>#{row.rank}</strong> {row.studentId?.name || row.studentId || "Student"} - {row.totalScore?.toFixed?.(2) ?? row.totalScore}
              </div>
            ))
          )}
        </section>
      </div>

      {status && <p style={{ marginTop: 16 }}>{status}</p>}
    </div>
  );
}
