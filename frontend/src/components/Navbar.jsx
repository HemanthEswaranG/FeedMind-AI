import React from 'react';

export default function Navbar({ user, dateStr, onNavigate, currentPage }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  
  const pageTitles = {
    dashboard: `${greeting}, ${user?.name || 'User'} 👋`,
    forms: 'Forms',
    responses: 'Responses',
    analytics: 'Analytics',
    ocr: 'OCR Upload',
    settings: 'Settings',
  };

  const currentTitle = pageTitles[currentPage] || pageTitles.dashboard;

  return (
    <div className="navbar">
      <div className="navbar-left">
        <h1 className="nav-greeting">
          {currentPage === 'dashboard' ? (
            <>
              {greeting}, <span className="user-highlight">{user?.name || 'admin'}</span> 👋
            </>
          ) : (
            currentTitle
          )}
        </h1>
      </div>
      <div className="navbar-right">
        <div className="nav-date">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 8, opacity: 0.6}}>
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
            <line x1="16" x2="16" y1="2" y2="6"/>
            <line x1="8" x2="8" y1="2" y2="6"/>
            <line x1="3" x2="21" y1="10" y2="10"/>
          </svg>
          {dateStr}
        </div>
        <button className="btn btn-primary nav-create-btn" onClick={() => onNavigate('builder')}>
          <span style={{ fontSize: 18, marginRight: 6 }}>+</span>
          Create Form
        </button>
      </div>
    </div>
  );
}
