import { useState } from "react";
import { useAuth } from "../context/AuthContext";

/* ── SVG Icon Helpers ── */
const icons = {
  menu: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  grid: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  // Professor icons
  upload: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  assignment: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  megaphone: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  // Student icons
  send: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  bot: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <line x1="8" y1="16" x2="8" y2="16" />
      <line x1="16" y1="16" x2="16" y2="16" />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  ),
  trophy: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
      <path d="M18 2H6v7a6 6 0 1012 0V2z" />
    </svg>
  ),
  files: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
};

const professorTabs = [
  { key: "courses", label: "My Courses", icon: icons.grid },
  { key: "people", label: "People", icon: icons.users },
  { key: "materials", label: "Materials", icon: icons.upload },
  { key: "assignments", label: "Assignments", icon: icons.assignment },
  { key: "announcements", label: "Announcements", icon: icons.megaphone },
  { key: "analytics", label: "Analytics", icon: icons.chart },
  { key: "doubts", label: "Ask AI", icon: icons.bot },
  { key: "leaderboard", label: "Leaderboard", icon: icons.trophy },
];

const studentTabs = [
  { key: "courses", label: "My Courses", icon: icons.grid },
  { key: "people", label: "People", icon: icons.users },
  { key: "assignments", label: "Assignments", icon: icons.assignment },
  { key: "doubts", label: "Ask AI", icon: icons.bot },
  { key: "materials", label: "Materials", icon: icons.book },
  { key: "announcements", label: "Announcements", icon: icons.megaphone },
  { key: "leaderboard", label: "Leaderboard", icon: icons.trophy },
];

export default function Sidebar({ activeTab, onTabChange, role, hasCourseSelected }) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const tabs = role === "professor" ? professorTabs : studentTabs;

  const initials = (user?.name || user?.email || "U")
    .split(/[\s@]+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleTabClick = (key) => {
    onTabChange(key);
    setMobileOpen(false);
  };

  return (
    <>
      <button
        className="sidebar-toggle"
        onClick={() => setMobileOpen((p) => !p)}
        aria-label="Toggle sidebar"
      >
        {icons.menu}
      </button>

      {mobileOpen && (
        <div
          className="sidebar-overlay open"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`sidebar${mobileOpen ? " open" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">🎓</div>
          <div>
            <div className="sidebar-brand-text">AI Classroom</div>
            <div className="sidebar-brand-sub">Smart Learning Platform</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">
            {role === "professor" ? "Teaching" : "Learning"}
          </div>
          {tabs.map((tab) => {
            const isDisabled = !hasCourseSelected && tab.key !== "courses";
            return (
              <button
                key={tab.key}
                className={`sidebar-link${activeTab === tab.key ? " active" : ""}`}
                onClick={() => {
                  if (isDisabled) return;
                  handleTabClick(tab.key);
                }}
                style={isDisabled ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                title={isDisabled ? "Please select a course first" : ""}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name || user?.email}</div>
              <div className="sidebar-user-role">{user?.role || role}</div>
            </div>
            <button
              className="sidebar-logout"
              onClick={logout}
              title="Logout"
            >
              {icons.logout}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export { icons };
