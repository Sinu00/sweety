import Icon from '../components/Icon';

// Shared frame for the login and sign-up screens.
export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth">
      <div className="auth-hero">
        <div className="brand-mark">
          <span className="brand-logo"><Icon name="drop" size={18} strokeWidth={2.2} /></span>
          Sweety
        </div>
        <div className="auth-hero-graphic" aria-hidden="true">
          <svg viewBox="0 0 320 120" preserveAspectRatio="none">
            <rect x="0" y="34" width="320" height="52" className="band" />
            <path d="M0 78 C30 70 45 40 75 46 S120 92 150 70 S205 22 235 40 S290 66 320 52" className="line" />
            <circle cx="235" cy="40" r="5" className="dot" />
          </svg>
        </div>
        <h1 className="auth-title">{title}</h1>
        <p className="auth-subtitle">{subtitle}</p>
      </div>
      <div className="auth-card">{children}</div>
    </div>
  );
}
