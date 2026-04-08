import { useState, useEffect } from 'react';
import './index.css';
import './App.css';

import apiClient from './api/apiClient';
import AuthOverlay from './components/AuthOverlay';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Forms from './pages/Forms';
import Responses from './pages/Responses';
import PublicFormView from './pages/PublicFormView';

import OcrUpload from './pages/OcrUpload';
import FormBuilder from './pages/FormBuilder';
import Settings from './pages/Settings';
import Navbar from './components/Navbar';

export default function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [publicShareLink, setPublicShareLink] = useState(null);
  const [responsesSelectedForm, setResponsesSelectedForm] = useState('overall');

  // Check for public form link on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareLink = params.get('form');
    if (shareLink) {
      setPublicShareLink(shareLink);
      setLoading(false);
      return;
    }

    // Otherwise check authentication
    const token = localStorage.getItem('token');
    if (token) {
      apiClient.get('/auth/me')
      .then(res => {
        setUser(res.data.user);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Auth verification failed', err);
        localStorage.removeItem('token');
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (userData, token) => {
    if (token) localStorage.setItem('token', token);
    setUser(userData);
  };

  const handleSessionExpired = () => {
    localStorage.removeItem('token');
    setUser(null);
    setCurrentPage('dashboard');
  };

  const [builderFormId, setBuilderFormId] = useState(null);

  const navigate = (page, formId) => {
    if (page === 'builder') {
      setBuilderFormId(formId ?? null);
    } else {
      setBuilderFormId(null);
    }
    setCurrentPage(page);
  };

  if (loading) {
    return <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Loading FeedMind...</div>;
  }

  // Show public form if shareLink is in URL
  if (publicShareLink) {
    return <PublicFormView shareLink={publicShareLink} onFormNotFound={() => window.location.href = '/'} />;
  }

  if (!user) {
    return <AuthOverlay onLogin={handleLogin} />;
  }

  // Builder gets full screen treatment (no sidebar)
  if (currentPage === 'builder') {
    return (
      <FormBuilder
        key={builderFormId || 'new'}
        formId={builderFormId}
        onBack={() => {
          setBuilderFormId(null);
          setCurrentPage('forms');
        }}
      />
    );
  }

  const pages = {
    dashboard: <Dashboard user={user} onNavigate={navigate} />,
    forms: <Forms onNavigate={navigate} />,
    responses: (
      <Responses
        selectedForm={responsesSelectedForm}
        onSelectedFormChange={setResponsesSelectedForm}
      />
    ),
    ocr: <OcrUpload />,
    settings: <Settings user={user} onUserUpdate={setUser} onSessionExpired={handleSessionExpired} />,
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="app-container">
      <Sidebar currentPage={currentPage} onNavigate={navigate} user={user} />
      <div className="main">
        <Navbar
          user={user}
          dateStr={dateStr}
          onNavigate={navigate}
          currentPage={currentPage}
          responsesFormId={responsesSelectedForm}
        />
        <div className="page-content">
          {pages[currentPage] || pages.dashboard}
        </div>
      </div>
    </div>
  );
}
