import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, setSession } from '../api';

export default function Login({ onAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { token, user } = await api('/auth/login', { method: 'POST', body: { email, password } });
      setSession(token, user);
      onAuth(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={submit}>
        <h1>Sweety</h1>
        <p className="muted">Blood glucose tracker</p>
        {error && <div className="error-box" role="alert">{error}</div>}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            autoComplete="email" required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password" required />
        </label>
        <button type="submit" disabled={busy}>{busy ? 'Logging in...' : 'Log in'}</button>
        <p className="muted">New here? <Link to="/register">Create an account</Link></p>
      </form>
    </div>
  );
}
