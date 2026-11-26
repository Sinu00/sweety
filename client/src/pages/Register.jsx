import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, setSession } from '../api';
import Icon from '../components/Icon';
import AuthLayout from './AuthLayout';

export default function Register({ onAuth }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { token, user } = await api('/auth/register', {
        method: 'POST',
        body: { name, email, password },
      });
      setSession(token, user);
      onAuth(user);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Start your log." subtitle="A calm place to track fasting and after-meal readings, with reports that make sense at a glance.">
      <form onSubmit={submit} className="stack">
        <h2 className="auth-card-title">Create account</h2>
        {error && (
          <div className="notice notice-error" role="alert">
            <Icon name="info" size={18} /><span>{error}</span>
          </div>
        )}
        <div className="field">
          <label htmlFor="reg-name" className="field-label">Name</label>
          <input id="reg-name" className="input" value={name}
            onChange={(e) => setName(e.target.value)} autoComplete="name" required />
        </div>
        <div className="field">
          <label htmlFor="reg-email" className="field-label">Email</label>
          <input id="reg-email" className="input" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        <div className="field">
          <label htmlFor="reg-password" className="field-label">Password</label>
          <input id="reg-password" className="input" type="password" value={password} minLength={6}
            onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
          <p className="field-help">At least 6 characters.</p>
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
        <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
      </form>
    </AuthLayout>
  );
}
