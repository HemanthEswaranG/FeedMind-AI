import { useState } from 'react';
<<<<<<< HEAD
import axios from 'axios';
=======
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';

// API Configuration
const API_URL = 'http://localhost:5000/api/auth';
>>>>>>> refs/remotes/origin/master

export default function AuthOverlay({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
<<<<<<< HEAD
  const [pass, setPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const doLogin = async () => {
    setError('');
    if (!email || !pass) { setError('Please fill in all fields.'); return; }
    if (isSignup && (!name || pass !== confirmPass)) {
      setError('Please provide a name and matching passwords.');
=======
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAuth = async () => {
    if (!email || !password || (isSignup && !name)) {
      setError('Please fill in all required fields.');
>>>>>>> refs/remotes/origin/master
      return;
    }

    setLoading(true);
<<<<<<< HEAD
    try {
      if (isSignup) {
        const res = await axios.post('http://localhost:5000/api/auth/register', { name, email, password: pass });
        onLogin(res.data.user, res.data.token);
      } else {
        const res = await axios.post('http://localhost:5000/api/auth/login', { email, password: pass });
        onLogin(res.data.user, res.data.token);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
=======
    setError(null);
    try {
      const endpoint = isSignup ? '/register' : '/login';
      const body = isSignup ? { name, email, password } : { email, password };
      const res = await axios.post(`${API_URL}${endpoint}`, body);
      
      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        onLogin(res.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please try again.');
>>>>>>> refs/remotes/origin/master
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (response) => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.post(`${API_URL}/google`, { token: response.access_token });
        if (res.data.success) {
          localStorage.setItem('token', res.data.token);
          onLogin(res.data.user);
        }
      } catch (err) {
        setError('Google Login failed. Please try again.');
        console.error('Google Auth error:', err);
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError('Google Login was unsuccessful.'),
  });

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <div className="auth-logo">✦</div>
        <div className="auth-title">{isSignup ? 'Create Account' : 'Welcome to FeedMind'}</div>
        <div className="auth-sub">
          {isSignup ? 'Join FeedMind and build better forms' : 'Sign in to access your dashboard'}
        </div>

        {error && <div className="auth-error" style={{ color: '#ff4444', marginBottom: 15, fontSize: 13, background: 'rgba(255, 68, 68, 0.1)', padding: '8px 12px', borderRadius: 8 }}>{error}</div>}

        <button className="auth-google" onClick={() => handleGoogleLogin()} disabled={loading}>
          <span style={{ fontSize: 18, marginRight: 10 }}>G</span> 
          {loading ? 'Processing...' : 'Continue with Google'}
        </button>

        <div className="auth-divider">
          <div className="auth-divider-line"></div>
          <div className="auth-divider-text">OR CONTINUE WITH EMAIL</div>
          <div className="auth-divider-line"></div>
        </div>

<<<<<<< HEAD
        {error && <div style={{ color: '#ef4444', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>{error}</div>}

        {isSignup && (
          <div className="auth-field">
            <label className="auth-label">Name</label>
            <input className="auth-input" type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
          </div>
        )}
        <div className="auth-field">
          <label className="auth-label">Email</label>
          <input className="auth-input" type="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="auth-field">
          <label className="auth-label">Password</label>
          <input className="auth-input" type="password" placeholder="Enter your password" value={pass} onChange={e => setPass(e.target.value)} />
        </div>
        {isSignup && (
          <div className="auth-field">
            <label className="auth-label">Confirm password</label>
            <input className="auth-input" type="password" placeholder="Re-enter your password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />
          </div>
        )}

        <button className="auth-btn" onClick={doLogin} disabled={loading}>{loading ? 'Verifying...' : (isSignup ? 'Create account' : 'Sign in with Email')}</button>
=======
        {isSignup && (
          <div className="auth-field">
            <label className="auth-label">Full Name</label>
            <input 
              className="auth-input" 
              type="text" 
              placeholder="Your Name" 
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>
        )}

        <div className="auth-field">
          <label className="auth-label">Email Address</label>
          <input 
            className="auth-input" 
            type="email" 
            placeholder="name@example.com" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
          />
        </div>
        <div className="auth-field">
          <label className="auth-label">Password</label>
          <input 
            className="auth-input" 
            type="password" 
            placeholder="Your password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
          />
        </div>
>>>>>>> refs/remotes/origin/master

        <button className="auth-btn" onClick={handleAuth} disabled={loading} style={{ marginTop: 10 }}>
          {loading ? 'Processing...' : (isSignup ? 'Register' : 'Sign In')}
        </button>

        <div className="auth-footer" style={{ marginTop: 25, fontSize: 12 }}>
          {isSignup 
            ? <>Already have an account? <span className="auth-link" onClick={() => setIsSignup(false)}>Sign In</span></>
            : <>Don't have an account? <span className="auth-link" onClick={() => setIsSignup(true)}>Register</span></>
          }
        </div>
        <div className="auth-tiny" style={{ marginTop: 15, fontSize: 11 }}>By signing in, you agree to our Terms and Privacy Policy.</div>
      </div>
    </div>
  );
}
