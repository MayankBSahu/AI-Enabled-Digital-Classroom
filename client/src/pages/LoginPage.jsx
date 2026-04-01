import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const user = await login(email, password, mode, name);
      navigate(user.role === "professor" ? "/professor" : "/student");
    } catch (err) {
      setError(err.response?.data?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Animated Background */}
      <div className="bg-animated">
        <div className="bg-blob bg-blob-1"></div>
        <div className="bg-blob bg-blob-2"></div>
      </div>

      <div className="login-page">
        <div className="login-card">
          {/* Brand */}
          <div className="login-brand">
            <div className="login-logo">🎓</div>
            <h1>AI Classroom</h1>
            <p>
              {mode === "login"
                ? "Welcome back! Sign in to continue your learning journey."
                : "Create your account to get started with AI-powered learning."}
            </p>
          </div>

          {/* Form */}
          <form className="login-form" onSubmit={onSubmit}>
            {mode === "register" && (
              <div className="form-group">
                <div className="login-input-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <input
                  id="register-name"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            )}

            <div className="form-group">
              <div className="login-input-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M22 7l-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7" />
                </svg>
              </div>
              <input
                id="login-email"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <div className="login-input-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </div>
              <input
                id="login-password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === "register" ? "new-password" : "current-password"}
              />
            </div>

            <button
              id="login-submit"
              className="btn-primary login-submit"
              disabled={loading}
              type="submit"
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Please wait...
                </>
              ) : mode === "login" ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Error */}
          {error && <div className="login-error">{error}</div>}

          {/* Toggle */}
          <div className="login-toggle">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              id="login-toggle-mode"
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
            >
              {mode === "login" ? "Sign Up" : "Sign In"}
            </button>
          </div>

          {/* Hint */}
          <div className="login-hint">
            💡 Role is auto-detected from your email — use keywords like
            <strong> prof</strong> or <strong>faculty</strong> for professor,
            <strong> student</strong>, <strong>ug</strong>, or <strong>pg</strong> for student.
          </div>
        </div>
      </div>
    </>
  );
}
