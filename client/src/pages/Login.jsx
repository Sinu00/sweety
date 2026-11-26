import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, setSession } from '../api';
import Icon from '../components/Icon';
import AuthLayout from './AuthLayout';

// Created by `npm run seed` in the server folder.
const DEMO = { email: 'demo@sweety.app', password: 'demo1234' };

export default function Login({ onAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function logIn(credentials) {
    setError('');
    setBusy(true);
    try {
      const { token, user } = await api('/auth/login', { method: 'POST', body: credentials });
      setSession(token, user);
      onAuth(user);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  function submit(e) {
    e.preventDefault();
    logIn({ email, password });
  }

  return (
    <AuthLayout title="Know your numbers." subtitle="Log up to four glucose readings a day and see how your days and months add up.">
      <form onSubmit={submit} className="stack">
        <h2 className="auth-card-title">Log in</h2>
        {error && (
          <div className="notice notice-error" role="alert">
            <Icon name="info" size={18} /><span>{error}</span>
          </div>
        )}
        <div className="field">
          <label htmlFor="login-email" className="field-label">Email</label>
          <input id="login-email" className="input" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        <div className="field">
          <label htmlFor="login-password" className="field-label">Password</label>
          <input id="login-password" className="input" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
        <button type="button" className="btn btn-ghost btn-block" disabled={busy} onClick={() => logIn(DEMO)}>
          Try the demo account
        </button>
        <p className="auth-switch">New here? <Link to="/register">Create an account</Link></p>
      </form>
    </AuthLayout>
  );
}
