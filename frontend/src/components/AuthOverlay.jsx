import { useState } from 'react';
import axios from 'axios';

export default function AuthOverlay({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const doLogin = async () => {
    setError('');
    if (!email || !pass) { setError('Please fill in all fields.'); return; }
    if (isSignup && (!name || pass !== confirmPass)) {
      setError('Please provide a name and matching passwords.');
      return;
    }

    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <div className="auth-logo">✦</div>
        <div className="auth-title">{isSignup ? 'Create your FeedMind account' : 'Welcome to FeedMind'}</div>
        <div className="auth-sub">{isSignup ? 'Sign up with your email and password' : 'Sign in to create AI-powered feedback forms'}</div>

        <button className="auth-google" onClick={() => onLogin({ name: 'User', email: 'user@gmail.com' })}>
          <span style={{ fontSize: 18 }}>G</span> Continue with Google
        </button>

        <div className="auth-divider">
          <div className="auth-divider-line"></div>
          <div className="auth-divider-text">OR CONTINUE WITH EMAIL</div>
          <div className="auth-divider-line"></div>
        </div>

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

        <div className="auth-footer">
          {isSignup
            ? <>Already have an account? <span className="auth-link" onClick={() => setIsSignup(false)}>Sign in</span></>
            : <>New here? <span className="auth-link" onClick={() => setIsSignup(true)}>Create an account</span></>
          }
        </div>
        <div className="auth-tiny">By signing in, you agree to our Terms of Service and Privacy Policy.</div>
      </div>
    </div>
  );
}
