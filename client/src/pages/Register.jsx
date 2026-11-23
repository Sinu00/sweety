import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, setSession } from '../api';

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
      const { token, user } = await api('/auth/register', { method: 'POST', body: { name, email, password } });
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
        <h1>Create account</h1>
        {error && <div className="error-box" role="alert">{error}</div>}
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            autoComplete="email" required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password" minLength={6} required />
        </label>
        <button type="submit" disabled={busy}>{busy ? 'Creating...' : 'Sign up'}</button>
        <p className="muted">Already registered? <Link to="/login">Log in</Link></p>
      </form>
    </div>
  );
}
