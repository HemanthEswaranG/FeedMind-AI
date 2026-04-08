const Icons = {
  Logo: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1-8.313-12.454z" />
      <path d="M12 8v4" />
      <path d="M10 10h4" />
    </svg>
  ),
  Dashboard: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  ),
  Forms: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  ),
  Responses: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  OCR: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <path d="M7 10h10" />
      <path d="M7 14h10" />
      <path d="M10 7v10" />
    </svg>
  ),
};

export default function Sidebar({ currentPage, onNavigate, user }) {
  const navItems = [
    { id: 'dashboard', icon: <Icons.Dashboard />, label: 'Dashboard' },
    { id: 'forms', icon: <Icons.Forms />, label: 'My Forms' },
    { id: 'responses', icon: <Icons.Responses />, label: 'Responses' },
    { id: 'ocr', icon: <Icons.OCR />, label: 'Data Upload' },
  ];

  const initial = user?.name?.[0]?.toUpperCase() || 'U';
  const avatarSrc = user?.avatar ? `http://localhost:5000${user.avatar}` : '';

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">
          <Icons.Dashboard />
        </div>
        <div className="logo-text">FeedMind</div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Main</div>
        {navItems.map(item => (
          <div
            key={item.id}
            className={`nav-item${currentPage === item.id ? ' active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="icon">{item.icon}</span>
            {item.label}
            {item.badge && <span className="nav-badge">{item.badge}</span>}
          </div>
        ))}
      </div>

      <div className="sidebar-bottom">
        <div className="responses-bar">
          <div className="responses-bar-label">
            <span>Responses this month</span>
            <span className="color-cyan" style={{ fontWeight: 700 }}>0 / 100</span>
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: '0%' }}></div>
          </div>
        </div>
        <div className="user-row" onClick={() => onNavigate('settings')} style={{ cursor: 'pointer' }}>
          <div className="user-avatar">
            {avatarSrc ? <img src={avatarSrc} alt="Profile" className="avatar-image" /> : initial}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.name || 'User'}</div>
            <div className="user-email">{user?.email || 'user@example.com'}</div>
          </div>
          <button
            className="btn btn-ghost"
            style={{ marginLeft: 'auto', fontSize: 14, padding: '4px 8px' }}
            onClick={(e) => {
              e.stopPropagation();
              localStorage.removeItem('token');
              window.location.reload();
            }}
            title="Logout"
          >
            ⇐ Logout
          </button>
        </div>
      </div>
    </div>
  );
}
