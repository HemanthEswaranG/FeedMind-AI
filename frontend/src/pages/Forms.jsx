import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/apiClient';

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes === 1 ? 'about 1 minute ago' : `about ${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? 'about 1 hour ago' : `about ${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return days === 1 ? 'about 1 day ago' : `about ${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? 'about 1 month ago' : `about ${months} months ago`;
}

const IconDoc = () => (
  <svg className="fm-card-doc-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconGlobe = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75" />
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="currentColor" strokeWidth="1.75" />
  </svg>
);

const IconLock = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.75" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);

const IconClock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconMsg = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M21 12a8 8 0 0 1-8 8H6l-4 4V12a8 8 0 0 1 8-8h5a8 8 0 0 1 8 8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

const IconHelp = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
    <path d="M9.5 9.5a2.5 2.5 0 0 1 4.2 1.7c0 1.5-1.2 2-2 2.3-.3.1-.7.4-.7 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="12" cy="17" r="0.75" fill="currentColor" />
  </svg>
);

const IconPencil = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconChart = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M4 20V10M10 20V4M16 20v-6M22 20V14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);

const IconBubble = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M21 12a8 8 0 0 1-8 8H6l-4 4V12a8 8 0 0 1 8-8h5a8 8 0 0 1 8 8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.75" />
    <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);

const IconGrid = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const IconList = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconDots = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <circle cx="6" cy="12" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="18" cy="12" r="1.5" />
  </svg>
);

function FormCard({
  form,
  isSelected,
  onSelect,
  onNavigate,
  onDelete,
  onShareClick,
  viewMode,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const questionCount = form.questions?.length || 0;
  const responses = form.responseCount || 0;
  const spamCount = form.spamCount ?? 0;
  const isPublished = form.status === 'published';

  const stop = (e) => e.stopPropagation();

  const openBuilder = (e) => {
    stop(e);
    onNavigate('builder', form._id);
  };

  return (
    <div
      className={`fm-card${isSelected ? ' fm-card--selected' : ''}${viewMode === 'list' ? ' fm-card--list' : ''}`}
      onClick={() => onSelect(form._id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(form._id);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="fm-card-gradient" aria-hidden />

      <div className="fm-card-inner">
        <div className="fm-card-head">
          <div className="fm-card-head-left">
            <IconDoc />
          </div>
          <div className="fm-card-head-right">
            {isPublished ? (
              <span className="fm-badge fm-badge--live">
                <IconGlobe /> Published
              </span>
            ) : (
              <span className="fm-badge fm-badge--draft">
                <IconLock /> Draft
              </span>
            )}
            <div className="fm-card-menu-wrap">
              <button
                type="button"
                className="fm-card-dots"
                onClick={(e) => {
                  stop(e);
                  setShowMenu(!showMenu);
                }}
                aria-label="Form actions"
              >
                <IconDots />
              </button>
              {showMenu && (
                <div className="fm-card-dropdown" onClick={stop}>
                  {isPublished && form.shareLink && (
                    <button type="button" className="dropdown-item" onClick={() => { onShareClick(form); setShowMenu(false); }}>
                      Copy link
                    </button>
                  )}
                  <button type="button" className="dropdown-item dropdown-item-danger" onClick={() => { onDelete(form._id); setShowMenu(false); }}>
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <h3 className="fm-card-title">{form.title || 'Untitled form'}</h3>

        <div className="fm-card-meta">
          <span className="fm-meta-item">
            <IconMsg />
            {responses} {responses === 1 ? 'response' : 'responses'}
          </span>
          <span className="fm-meta-item">
            <IconHelp />
            {questionCount} {questionCount === 1 ? 'question' : 'questions'}
          </span>
          {spamCount > 0 && (
            <span className="fm-meta-spam">• {spamCount} spam</span>
          )}
        </div>

        <div className="fm-card-foot">
          <span className="fm-card-time">
            <IconClock />
            {timeAgo(form.updatedAt)}
          </span>
          <div className="fm-card-actions">
            <button type="button" className="fm-action-btn" title="Edit" onClick={openBuilder}>
              <IconPencil />
            </button>
            <button type="button" className="fm-action-btn" title="Analytics" onClick={(e) => { stop(e); onNavigate('analytics'); }}>
              <IconChart />
            </button>
            <button type="button" className="fm-action-btn" title="Responses" onClick={(e) => { stop(e); onNavigate('responses'); }}>
              <IconBubble />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Forms({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('all');
  const [forms, setForms] = useState([]);
  const [stats, setStats] = useState({ total: 0, published: 0, drafts: 0, archived: 0, totalResponses: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy] = useState('-updatedAt');
  const [viewMode, setViewMode] = useState('grid');
  const [copiedLink, setCopiedLink] = useState(null);
  const [selectedFormId, setSelectedFormId] = useState(null);
  const [searchInput, setSearchInput] = useState('');

  const fetchForms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeTab === 'published') params.append('status', 'published');
      else if (activeTab === 'drafts') params.append('status', 'draft');
      else if (activeTab === 'bin') params.append('status', 'archived');
      if (search.trim()) params.append('search', search.trim());
      params.append('sort', sortBy);

      const { data } = await apiClient.get(`/forms?${params.toString()}`);
      setForms(data.forms);
      setStats({
        total: data.stats?.total ?? 0,
        published: data.stats?.published ?? 0,
        drafts: data.stats?.drafts ?? 0,
        archived: data.stats?.archived ?? 0,
        totalResponses: data.stats?.totalResponses ?? 0,
      });
    } catch (err) {
      console.error('Failed to fetch forms:', err);
      setError('Failed to load forms. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, sortBy]);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!forms.length) {
      setSelectedFormId(null);
      return;
    }
    setSelectedFormId((prev) => {
      if (prev && forms.some((f) => f._id === prev)) return prev;
      return forms[0]._id;
    });
  }, [forms]);

  const handleDelete = async (formId) => {
    if (!window.confirm('Are you sure you want to delete this form? This action cannot be undone.')) return;
    try {
      await apiClient.delete(`/forms/${formId}`);
      fetchForms();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete form.');
    }
  };

  const handleShare = (form) => {
    const url = `${window.location.origin}?form=${form.shareLink}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(form._id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const tabData = [
    ['all', 'All Forms', stats.total],
    ['published', 'Published', stats.published],
    ['drafts', 'Drafts', stats.drafts],
  ];

  return (
    <div className="forms-view fm-page">
      <header className="fm-header">
        <div className="fm-header-tabs">
          <div className="fm-tabs-shell">
            <div className="fm-tabs" role="tablist" aria-label="Form filters">
              {tabData.map(([id, label, count]) => (
                <button
                  key={id}
                  type="button"
                  className={`fm-tab${activeTab === id ? ' is-active' : ''}`}
                  onClick={() => setActiveTab(id)}
                  role="tab"
                  aria-selected={activeTab === id}
                >
                  {label}
                  <span className="fm-tab-count">{count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="fm-header-tools">
          <button
            type="button"
            className={`fm-bin${activeTab === 'bin' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('bin')}
            title="Archived forms"
          >
            <IconTrash />
            Bin
            {stats.archived > 0 && <span className="fm-bin-badge">{stats.archived}</span>}
          </button>
          <div className="fm-search">
            <span className="fm-search-icon" aria-hidden><IconSearch /></span>
            <input
              className="fm-search-input"
              placeholder="Search forms..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="fm-view-toggles" role="group" aria-label="View mode">
            <button
              type="button"
              className={`fm-view-btn${viewMode === 'grid' ? ' is-active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-pressed={viewMode === 'grid'}
              title="Grid"
            >
              <IconGrid />
            </button>
            <button
              type="button"
              className={`fm-view-btn${viewMode === 'list' ? ' is-active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              title="List"
            >
              <IconList />
            </button>
          </div>
        </div>
      </header>

      {copiedLink && (
        <div className="forms-toast">
          ✓ Share link copied to clipboard!
        </div>
      )}

      {loading ? (
        <div className="forms-loading">
          <div className="forms-loading-spinner" />
          <span>Loading forms...</span>
        </div>
      ) : error ? (
        <div className="forms-error">
          <span>⚠️</span> {error}
          <button type="button" className="btn btn-ghost btn-sm" onClick={fetchForms} style={{ marginLeft: 12 }}>Retry</button>
        </div>
      ) : forms.length === 0 ? (
        <div className="empty-state fm-empty">
          <div className="empty-icon-wrap">
            <IconDoc />
          </div>
          <div className="empty-title">
            {search ? 'No matching forms' : activeTab === 'bin' ? 'Bin is empty' : activeTab !== 'all' ? `No ${activeTab} forms` : 'No forms yet'}
          </div>
          <div className="empty-sub">
            {search
              ? 'Try adjusting your search query.'
              : activeTab === 'bin'
                ? 'Archived forms will appear here.'
                : 'Create your first form to start collecting feedback and responses.'}
          </div>
          {!search && activeTab !== 'bin' && (
            <button type="button" className="fm-btn-create" onClick={() => onNavigate('builder')}>
              <span className="fm-btn-create-plus">+</span>
              Create Form
            </button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'fm-grid' : 'fm-list'}>
          {forms.map((form) => (
            <FormCard
              key={form._id}
              form={form}
              isSelected={selectedFormId === form._id}
              onSelect={setSelectedFormId}
              onNavigate={onNavigate}
              onDelete={handleDelete}
              onShareClick={handleShare}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
