import { useState } from 'react';

export default function Settings({ user }) {
  const [activeNav, setActiveNav] = useState('Profile');
  const navItems = ['Profile', 'AI Config', 'Notifications', 'Security'];

  const initial = user?.name?.[0]?.toUpperCase() || 'A';

  const [notifications, setNotifications] = useState({
    emailDigest: true,
    breakingAlerts: true,
    weeklySummary: false,
    pushNotifications: false,
  });

  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: '',
    gemini: '',
  });
  
  const [activeProvider, setActiveProvider] = useState('openai');
  const avatarSrc = user?.avatar ? `http://localhost:5000${user.avatar}` : '';

  const toggleNotification = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="settings-view">
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
        {activeNav === 'Profile' && (
          <div className="profile-settings">
            <div className="profile-header-card">
              <div className="profile-avatar-large">
                {avatarSrc ? <img src={avatarSrc} alt="Profile" className="avatar-image" /> : initial}
              </div>
              <div className="profile-info-group">
                <div className="profile-name-row">
                  <h2 className="profile-display-name">{user?.name || 'Alex Mercer'}</h2>
                  <span className="pro-badge">PRO</span>
                </div>
                <div className="profile-meta-row">
                  <span className="profile-email-meta">{user?.email || 'alex.mercer@company.io'}</span>
                  <span className="dot-separator">·</span>
                  <span className="profile-member-since">Member since Jan 2024</span>
                </div>
              </div>
            </div>

            <div className="profile-form-grid">
              <div className="form-group">
                <label className="form-label">FIRST NAME</label>
                <input type="text" className="form-input" defaultValue={user?.name?.split(' ')[0] || 'Alex'} />
              </div>
              <div className="form-group">
                <label className="form-label">LAST NAME</label>
                <input type="text" className="form-input" defaultValue={user?.name?.split(' ')[1] || 'Mercer'} />
              </div>
              <div className="form-group">
                <label className="form-label">EMAIL ADDRESS</label>
                <input type="email" className="form-input" defaultValue={user?.email || 'alex.mercer@company.io'} />
              </div>
              <div className="form-group">
                <label className="form-label">LANGUAGE</label>
                <select className="form-select">
                  <option>English (US)</option>
                  <option>English (UK)</option>
                  <option>Hindi</option>
                </select>
              </div>
            </div>

            <div className="profile-footer">
              <button className="btn-discard">Discard</button>
              <button className="btn-save-profile">Save Profile</button>
            </div>
          </div>
        )}

        {activeNav === 'Notifications' && (
          <div className="notifications-settings">
            <div className="settings-section-header">
              <h2 className="profile-display-name" style={{ fontSize: 24, marginBottom: 4 }}>Notification Channels</h2>
              <p className="profile-meta-row" style={{ margin: 0, opacity: 0.6 }}>Control where and when FeedMind reaches you</p>
            </div>

            <div className="notifications-list">
              {[
                { key: 'emailDigest', title: 'Email Digest', sub: 'Receive your daily curated digest in your inbox every morning' },
                { key: 'breakingAlerts', title: 'Breaking alerts', sub: 'Instant notifications for high-importance stories from tracked sources' },
                { key: 'weeklySummary', title: 'Weekly summary', sub: 'A Sunday roundup of the week\'s most important content' },
                { key: 'pushNotifications', title: 'Browser push notifications', sub: 'Get notified in your browser when significant news drops' }
              ].map(item => (
                <div className="notification-item" key={item.key}>
                  <div className="notif-info">
                    <div className="notif-title">{item.title}</div>
                    <div className="notif-sub">{item.sub}</div>
                  </div>
                  <div 
                    className={`toggle-switch ${notifications[item.key] ? 'on' : ''}`}
                    onClick={() => toggleNotification(item.key)}
                  >
                    <div className="toggle-thumb"></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="profile-footer">
              <button className="btn-save-profile">Save Preferences</button>
            </div>
          </div>
        )}

        {activeNav === 'Security' && (
          <div className="security-settings">
            {/* Password Section */}
            <div className="security-section-card">
              <div className="settings-section-header">
                <h2 className="profile-display-name" style={{ fontSize: 24, marginBottom: 4 }}>Password & Security</h2>
                <p className="profile-meta-row" style={{ margin: 0, opacity: 0.6 }}>Manage authentication and access</p>
              </div>

              <div className="security-form">
                <div className="form-group full-width">
                  <label className="form-label">CURRENT PASSWORD</label>
                  <input type="password" placeholder="••••••••" className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">NEW PASSWORD</label>
                  <input type="password" placeholder="Min 12 characters" className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">CONFIRM NEW PASSWORD</label>
                  <input type="password" placeholder="Repeat new password" className="form-input" />
                </div>
              </div>

              <div className="profile-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
                <button className="btn-save-profile">Update Password</button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="danger-zone-card">
              <div className="settings-section-header">
                <h2 className="profile-display-name color-red" style={{ fontSize: 24, marginBottom: 4, color: '#ef4444' }}>Danger Zone</h2>
                <p className="profile-meta-row" style={{ margin: 0, opacity: 0.6 }}>Irreversible actions. Proceed with care.</p>
              </div>

              <div className="danger-list" style={{ marginTop: 24 }}>
                <div className="danger-item">
                  <div className="notif-info">
                    <div className="notif-title">Export all data</div>
                    <div className="notif-sub">Download a complete archive of your feeds, digests, and AI interactions</div>
                  </div>
                  <button className="btn-outline-sm">Export</button>
                </div>
                
                <div className="danger-item">
                  <div className="notif-info">
                    <div className="notif-title">Reset AI training data</div>
                    <div className="notif-sub">Clear all personalisation data and start fresh with a neutral model</div>
                  </div>
                  <button className="btn-outline-sm">Reset</button>
                </div>

                <div className="danger-item">
                  <div className="notif-info">
                    <div className="notif-title color-red" style={{ color: '#ef4444' }}>Delete account</div>
                    <div className="notif-sub">Permanently delete your FeedMind account and all associated data</div>
                  </div>
                  <button className="btn-outline-sm btn-delete-danger">Delete Account</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeNav === 'AI Config' && (
          <div className="security-settings">
            <div className="security-section-card">
              <div className="settings-section-header">
                <h2 className="profile-display-name" style={{ fontSize: 24, marginBottom: 4 }}>AI Providers</h2>
                <p className="profile-meta-row" style={{ margin: 0, opacity: 0.6 }}>Add your API keys to bring your own models (BYOM) for processing forms</p>
              </div>

              <div className="security-form" style={{ marginBottom: 0 }}>
                <div className="ai-provider-row">
                  <div className="form-group ai-provider-select-group">
                    <label className="form-label">SELECT PROVIDER</label>
                    <select 
                      className="form-select"
                      value={activeProvider}
                      onChange={(e) => setActiveProvider(e.target.value)}
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic (Claude)</option>
                      <option value="gemini">Google Gemini</option>
                    </select>
                  </div>

                  <div className="form-group ai-provider-key-group">
                    <label className="form-label ai-provider-key-label">
                      <span>{activeProvider.toUpperCase()} API KEY</span>
                      {activeProvider === 'openai' && <span className="api-key-hint api-key-hint-openai">sk-proj-...</span>}
                      {activeProvider === 'anthropic' && <span className="api-key-hint api-key-hint-anthropic">sk-ant-...</span>}
                      {activeProvider === 'gemini' && <span className="api-key-hint api-key-hint-gemini">AIzaSy...</span>}
                    </label>
                    <input 
                      type="password" 
                      className="form-input" 
                      placeholder="Enter your API key here" 
                      value={apiKeys[activeProvider]} 
                      onChange={e => setApiKeys({...apiKeys, [activeProvider]: e.target.value})} 
                    />
                  </div>
                  
                  <div className="ai-provider-save-wrap">
                    <button className="btn-save-profile ai-provider-save-btn">Save API Key</button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="danger-zone-card" style={{ border: '1px solid rgba(161, 161, 170, 0.2)', background: 'transparent' }}>
              <div className="settings-section-header">
                <h2 className="profile-display-name" style={{ fontSize: 24, marginBottom: 4 }}>Model Selection</h2>
                <p className="profile-meta-row" style={{ margin: 0, opacity: 0.6 }}>Choose the default model FeedMind uses to generate and process forms internally</p>
              </div>

              <div className="form-group" style={{ marginTop: '24px' }}>
                <select className="form-select">
                  <option>OpenAI — GPT-4o (Default)</option>
                  <option>OpenAI — GPT-4o-mini</option>
                  <option>Anthropic — Claude 3.5 Sonnet</option>
                  <option>Google — Gemini 1.5 Pro</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
