import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export default function ProfessorDashboard() {
  const { user, logout } = useAuth();

  const [courseId, setCourseId] = useState("CSE101");
  const [status, setStatus] = useState("");
  const [materials, setMaterials] = useState([]);
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
  const apiOrigin = apiBase.replace(/\/api\/?$/, "");

  const toPublicFileUrl = (fileUrl) => {
    if (!fileUrl) return "";
    if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
    return `${apiOrigin}${fileUrl}`;
  };

  const [materialType, setMaterialType] = useState("slide");
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialDescription, setMaterialDescription] = useState("");
  const [materialText, setMaterialText] = useState("");
  const [materialFile, setMaterialFile] = useState(null);

  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDescription, setAssignmentDescription] = useState("");
  const [assignmentRubric, setAssignmentRubric] = useState("Correctness,Clarity,Examples");
  const [maxMarks, setMaxMarks] = useState(100);
  const [dueDate, setDueDate] = useState("");

  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [analytics, setAnalytics] = useState(null);

  const loadMaterials = async () => {
    try {
      const { data } = await api.get(`/materials/course/${courseId}`);
      setMaterials(data.materials || []);
      setStatus("Uploaded materials loaded.");
    } catch (error) {
      setStatus(error.response?.data?.message || "Failed to load uploaded materials");
    }
  };

  const uploadMaterial = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();
      formData.append("courseId", courseId);
      formData.append("type", materialType);
      formData.append("title", materialTitle);
      formData.append("description", materialDescription);
      formData.append("materialText", materialText);
      if (materialFile) formData.append("file", materialFile);

      await api.post("/materials", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setStatus("Material uploaded and indexed.");
      await loadMaterials();
    } catch (error) {
      setStatus(error.response?.data?.message || "Material upload failed");
    }
  };

  const createAssignment = async (e) => {
    e.preventDefault();

    try {
      await api.post("/assignments", {
        courseId,
        title: assignmentTitle,
        description: assignmentDescription,
        rubric: assignmentRubric.split(",").map((x) => x.trim()).filter(Boolean),
        maxMarks: Number(maxMarks),
        dueDate
      });
      setStatus("Assignment created.");
    } catch (error) {
      setStatus(error.response?.data?.message || "Assignment creation failed");
    }
  };

  const postAnnouncement = async (e) => {
    e.preventDefault();

    try {
      await api.post("/announcements", {
        courseId,
        title: announcementTitle,
        message: announcementMessage
      });
      setStatus("Announcement posted.");
    } catch (error) {
      setStatus(error.response?.data?.message || "Announcement failed");
    }
  };

  const recomputeLeaderboard = async () => {
    try {
      await api.post(`/leaderboard/${courseId}/recompute`);
      setStatus("Leaderboard recomputed.");
    } catch (error) {
      setStatus(error.response?.data?.message || "Leaderboard recompute failed");
    }
  };

  const loadAnalytics = async () => {
    try {
      const { data } = await api.get(`/analytics/${courseId}`);
      setAnalytics(data);
      setStatus("Analytics loaded.");
    } catch (error) {
      setStatus(error.response?.data?.message || "Analytics load failed");
    }
  };

  return (
    <div className="page">
      <div className="navbar">
        <h2>Professor Dashboard</h2>
        <div>
          <span className="badge">{user?.email}</span>
          <button style={{ marginLeft: 12, width: 96 }} onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <label>Course ID</label>
        <input value={courseId} onChange={(e) => setCourseId(e.target.value)} placeholder="e.g. CSE101" />
        <div style={{ marginTop: 10 }}>
          <button onClick={loadMaterials}>View Uploaded Materials</button>
          <button onClick={recomputeLeaderboard}>Recompute Leaderboard</button>
          <button onClick={loadAnalytics} style={{ marginTop: 8 }}>Load Analytics</button>
        </div>
      </div>

      <div className="grid two">
        <section className="card">
          <h3>Upload Material (RAG)</h3>
          <form className="grid" onSubmit={uploadMaterial}>
            <select value={materialType} onChange={(e) => setMaterialType(e.target.value)}>
              <option value="slide">Slide</option>
              <option value="note">Note</option>
              <option value="assignment">Assignment</option>
              <option value="project-topic">Project Topic</option>
            </select>
            <input placeholder="Title" value={materialTitle} onChange={(e) => setMaterialTitle(e.target.value)} required />
            <textarea
              rows={3}
              placeholder="Description"
              value={materialDescription}
              onChange={(e) => setMaterialDescription(e.target.value)}
            />
            <textarea
              rows={5}
              placeholder="Material text for vector indexing"
              value={materialText}
              onChange={(e) => setMaterialText(e.target.value)}
            />
            <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={(e) => setMaterialFile(e.target.files?.[0] || null)} />
            <button type="submit">Upload</button>
          </form>
        </section>

        <section className="card">
          <h3>Create Assignment</h3>
          <form className="grid" onSubmit={createAssignment}>
            <input placeholder="Title" value={assignmentTitle} onChange={(e) => setAssignmentTitle(e.target.value)} required />
            <textarea
              rows={3}
              placeholder="Description"
              value={assignmentDescription}
              onChange={(e) => setAssignmentDescription(e.target.value)}
            />
            <input
              placeholder="Rubric (comma separated)"
              value={assignmentRubric}
              onChange={(e) => setAssignmentRubric(e.target.value)}
            />
            <input type="number" min="1" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} required />
            <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
            <button type="submit">Create</button>
          </form>
        </section>

        <section className="card">
          <h3>Post Announcement</h3>
          <form className="grid" onSubmit={postAnnouncement}>
            <input
              placeholder="Announcement title"
              value={announcementTitle}
              onChange={(e) => setAnnouncementTitle(e.target.value)}
              required
            />
            <textarea
              rows={4}
              placeholder="Announcement message"
              value={announcementMessage}
              onChange={(e) => setAnnouncementMessage(e.target.value)}
              required
            />
            <button type="submit">Post</button>
          </form>
        </section>

        <section className="card">
          <h3>Uploaded Materials</h3>
          {materials.length === 0 ? <p>No materials loaded for this course.</p> : (
            materials.map((m) => (
              <div key={m._id} style={{ marginBottom: 12 }}>
                <strong>{m.title}</strong> <span className="badge">{m.type}</span>
                <p style={{ margin: "6px 0" }}>{m.description || "No description"}</p>
                <p style={{ margin: "4px 0" }}>
                  Indexed: {m.vectorized ? `Yes (${m.indexedChunks || 0} chunks)` : "No"}
                </p>
                <p style={{ margin: "4px 0" }}>
                  Uploaded: {new Date(m.createdAt).toLocaleString()}
                </p>
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
          <h3>Analytics Snapshot</h3>
          {!analytics ? <p>No analytics loaded.</p> : (
            <div>
              <p><strong>Evaluated submissions:</strong> {analytics.totalEvaluatedSubmissions}</p>
              <p><strong>Total doubts:</strong> {analytics.totalDoubts}</p>
              <p><strong>Weak students:</strong> {(analytics.weakStudents || []).length}</p>
              <p><strong>Top struggling topics:</strong> {(analytics.strugglingTopics || []).map((x) => x.topic).join(", ") || "-"}</p>
            </div>
          )}
        </section>
      </div>

      {status && <p style={{ marginTop: 16 }}>{status}</p>}
    </div>
  );
}
