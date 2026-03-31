import { useState } from 'react';
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

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const navigate = (page) => {
    setCurrentPage(page);
  };

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
    settings: <Settings />,

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
