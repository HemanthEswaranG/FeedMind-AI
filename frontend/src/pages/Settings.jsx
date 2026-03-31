import { useState } from 'react';

export default function Settings() {
  const [activeNav, setActiveNav] = useState('Profile');
  const navItems = ['Profile', 'AI Config', 'Notifications', 'Security'];

  return (
    <div className="page-content settings-view">
      <div className="settings-header">
        <p className="page-subtitle">Manage your account and preferences</p>
      </div>

      <div className="settings-tabs">
        {navItems.map(item => (
          <button 
            key={item} 
            className={`settings-tab${activeNav === item ? ' active' : ''}`} 
            onClick={() => setActiveNav(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="settings-main card">
        <div className="settings-section-title">Profile Settings</div>
        <div className="settings-section-sub">Update your personal information</div>
        <div className="settings-row">
          <div><div className="settings-row-label">Full Name</div><div className="settings-row-sub">admin</div></div>
          <button className="btn btn-ghost btn-sm">Edit</button>
        </div>
        <div className="settings-row">
          <div><div className="settings-row-label">Email</div><div className="settings-row-sub">admin@feedmind.com</div></div>
          <button className="btn btn-ghost btn-sm">Change</button>
        </div>
        <div className="settings-row">
          <div><div className="settings-row-label">Password</div><div className="settings-row-sub">Last changed never</div></div>
          <button className="btn btn-ghost btn-sm">Reset</button>
        </div>
        <div className="settings-row">
          <div><div className="settings-row-label">Delete Account</div><div className="settings-row-sub">Permanently delete your account and data</div></div>
          <button className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)' }}>Delete</button>
        </div>
      </div>
    </div>
  );
}
