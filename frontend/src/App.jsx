import { useState, useEffect } from 'react';
import axios from 'axios';
import './index.css';
import './App.css';

import AuthOverlay from './components/AuthOverlay';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Forms from './pages/Forms';
import Responses from './pages/Responses';
import Analytics from './pages/Analytics';

import OcrUpload from './pages/OcrUpload';
import FormBuilder from './pages/FormBuilder';
import Settings from './pages/Settings';
import Navbar from './components/Navbar';

export default function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get('http://localhost:5000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
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

  const navigate = (page) => {
    setCurrentPage(page);
  };

  if (loading) {
    return <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Loading FeedMind...</div>;
  }

  if (!user) {
    return <AuthOverlay onLogin={handleLogin} />;
  }

  // Builder gets full screen treatment (no sidebar)
  if (currentPage === 'builder') {
    return <FormBuilder onBack={() => setCurrentPage('forms')} />;
  }

  const pages = {
    dashboard: <Dashboard user={user} onNavigate={navigate} />,
    forms: <Forms onNavigate={navigate} />,
    responses: <Responses />,
    analytics: <Analytics />,

    ocr: <OcrUpload />,
    settings: <Settings user={user} onUserUpdate={setUser} onSessionExpired={handleSessionExpired} />,
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="app-container">
      <Sidebar currentPage={currentPage} onNavigate={navigate} user={user} />
      <div className="main">
        <Navbar user={user} dateStr={dateStr} onNavigate={navigate} currentPage={currentPage} />
        <div className="page-content">
          {pages[currentPage] || pages.dashboard}
        </div>
      </div>
    </div>
  );
}
