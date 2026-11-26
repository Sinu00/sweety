import { useState } from 'react';
import { downloadCsv } from '../api';
import { useApp } from '../AppContext';
import Icon from '../components/Icon';
import { HIGH_ABOVE, LOW_BELOW } from '../slots';

export default function Profile() {
  const { user, logout } = useApp();
  const [error, setError] = useState('');

  async function exportCsv() {
    setError('');
    try {
      await downloadCsv();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Profile</h1>
        </div>
      </header>

      <div className="card profile-card">
        <span className="avatar avatar-lg">{(user.name || 'S')[0].toUpperCase()}</span>
        <div>
          <p className="profile-name">{user.name}</p>
          <p className="muted small">{user.email}</p>
        </div>
      </div>

      <section className="section" aria-labelledby="range-title">
        <h2 id="range-title" className="section-title">Target range</h2>
        <div className="card">
          <ul className="range-key">
            <li><span className="dot dot-low" /> <strong>Low</strong> <span>below {LOW_BELOW} mg/dl</span></li>
            <li><span className="dot dot-in_range" /> <strong>In range</strong> <span>{LOW_BELOW}–{HIGH_ABOVE} mg/dl</span></li>
            <li><span className="dot dot-high" /> <strong>High</strong> <span>above {HIGH_ABOVE} mg/dl</span></li>
          </ul>
          <p className="muted small">
            Sweety uses the common 70–180 mg/dl “time in range” target. Your doctor may set a different
            target for you. Sweety is a log, not medical advice.
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="data-title">
        <h2 id="data-title" className="section-title">Your data</h2>
        <div className="card list-card">
          <button type="button" className="list-row" onClick={exportCsv}>
            <span className="slot-icon small"><Icon name="download" size={18} /></span>
            <span className="list-row-label">Export readings (CSV)<small>Share with your doctor or keep a copy</small></span>
            <Icon name="right" size={18} className="muted" />
          </button>
          <button type="button" className="list-row danger-text" onClick={logout}>
            <span className="slot-icon small"><Icon name="logout" size={18} /></span>
            <span className="list-row-label">Log out</span>
          </button>
        </div>
        {error && <div className="notice notice-error" role="alert"><Icon name="info" size={18} /><span>{error}</span></div>}
      </section>
    </div>
  );
}
