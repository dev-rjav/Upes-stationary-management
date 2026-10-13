import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import upesLogo from '../../../assets/upes-logo-full.png';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) navigate('/receptionist/requests', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password || loading) return;
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      navigate('/receptionist/requests', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: '#f4f8fc' }}>
      <div style={{ width: '100%', maxWidth: 384, display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <img src={upesLogo} alt="UPES" style={{ height: 36, width: 'auto', display: 'block', marginBottom: 4 }} />
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.01em' }}>Receptionist Desk</h1>
          <p style={{ margin: 0, fontSize: 14.5, color: '#6B6B6B' }}>Sign in to manage stationery requests.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid #bcd6ec', borderRadius: 14, padding: '24px 24px 26px', display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', overflow: 'hidden', boxShadow: '0 14px 34px rgba(42, 90, 140, .12)' }}>
          <div className="upes-accent-bar" style={{ position: 'absolute', top: 0, left: 0, right: 0 }} />
          <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 13.5, fontWeight: 500, color: '#4A4A48' }}>
            Username
            <input autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} autoFocus
              style={{ height: 48, padding: '0 14px', border: '1px solid #CFCFCB', borderRadius: 9, font: 'inherit', fontSize: 15, color: '#1A1A1A', background: '#fff' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 13.5, fontWeight: 500, color: '#4A4A48' }}>
            Password
            <input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}
              style={{ height: 48, padding: '0 14px', border: '1px solid #CFCFCB', borderRadius: 9, font: 'inherit', fontSize: 15, color: '#1A1A1A', background: '#fff' }} />
          </label>
          {error && <p style={{ margin: 0, padding: '10px 12px', borderRadius: 8, background: '#FEE2E2', color: '#9B1C1C', fontSize: 14, lineHeight: 1.4 }}>{error}</p>}
          <button type="submit" disabled={!username || !password || loading}
            style={{ height: 50, border: 'none', borderRadius: 9, background: '#0b66b2', color: '#fff', font: 'inherit', fontSize: 15, fontWeight: 500, cursor: 'pointer', opacity: (!username || !password || loading) ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 2 }}>
            {loading && <span style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} />}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{ margin: 0, textAlign: 'center', fontSize: 13, color: '#8A8A86' }}>
          User? <a href="/request" style={{ color: '#0b66b2', fontWeight: 500 }}>Open the request form</a>
        </p>
      </div>
    </div>
  );
}
