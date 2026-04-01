import { useState } from 'react';

export default function Forms({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('all');

  return (
    <div className="page-content forms-view">
      <div className="forms-header">
        <div className="forms-header-top">
          <h1 className="page-title">My Forms</h1>
          <button className="btn btn-ghost action-btn">
            <span className="icon">↗</span> Share a form
          </button>
        </div>
      </div>

      <div className="forms-filter-row">
        <div className="tabs-left">
          {[['all', 'All Forms', 0], ['published', 'Published', 0], ['drafts', 'Drafts', 0]].map(([id, label, count]) => (
            <button key={id} className={`forms-tab${activeTab === id ? ' active' : ''}`} onClick={() => setActiveTab(id)}>
              {label} <span className="tab-count">{count}</span>
            </button>
          ))}
        </div>
        <div className="tools-right">
          <div className="search-box">
             <span className="search-icon">🔍</span>
             <input className="search-input" placeholder="Search forms" />
          </div>
          <button className="btn btn-ghost tool-btn">⇃ Last modified</button>
          <div className="view-toggles">
            <button className="btn btn-ghost tool-btn active">⊞</button>
            <button className="btn btn-ghost tool-btn">≡</button>
          </div>
        </div>
      </div>

      <div className="empty-state">
        <div className="empty-icon">?</div>
        <div className="empty-title">No forms yet</div>
        <div className="empty-sub">Create your first form to start collecting responses.</div>
        <button className="btn btn-primary" onClick={() => onNavigate('builder')}>+ Create Form</button>
      </div>
    </div>
  );
}
