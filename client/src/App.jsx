import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { clearSession, getStoredUser, getToken } from './api';
import { AppContext } from './AppContext';
import Icon from './components/Icon';
import Sheet from './components/Sheet';
import ReadingForm from './ReadingForm';
import Login from './pages/Login';
import Register from './pages/Register';
import Today from './pages/Today';
import History from './pages/History';
import Profile from './pages/Profile';

// Reports pulls in the charting library, so it loads on first visit.
const Reports = lazy(() => import('./pages/Reports'));

const NAV = [
  { to: '/', label: 'Today', icon: 'home', end: true },
  { to: '/history', label: 'History', icon: 'list' },
  null, // centre "add" button
  { to: '/reports', label: 'Reports', icon: 'chart' },
  { to: '/profile', label: 'Profile', icon: 'user' },
];

export default function App() {
  const [user, setUser] = useState(() => (getToken() ? getStoredUser() : null));
  // null = closed; otherwise { editing, date, slot }
  const [sheet, setSheet] = useState(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [toast, setToast] = useState('');
  const { pathname } = useLocation();

  // Each tab starts at the top, like a native app.
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  const logout = useCallback(() => {
    clearSession();
    setSheet(null);
    setUser(null);
  }, []);

  // api.js fires this when the token is rejected (expired session).
  useEffect(() => {
    window.addEventListener('sweety:logout', logout);
    return () => window.removeEventListener('sweety:logout', logout);
  }, [logout]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const openReading = useCallback((opts = {}) => setSheet(opts), []);
  const closeSheet = useCallback(() => setSheet(null), []);

  const afterChange = (message) => {
    setSheet(null);
    setDataVersion((v) => v + 1);
    setToast(message);
  };

  const ctx = useMemo(
    () => ({ user, setUser, logout, openReading, dataVersion }),
    [user, logout, openReading, dataVersion]
  );

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login onAuth={setUser} />} />
        <Route path="/register" element={<Register onAuth={setUser} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <AppContext.Provider value={ctx}>
      <div className="app-shell">
        <main className="app-main">
          <Suspense fallback={<div className="page" aria-busy="true" />}>
            <Routes>
              <Route path="/" element={<Today />} />
              <Route path="/history" element={<History />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>

        <nav className="tabbar" aria-label="Main">
          {NAV.map((item) => (item ? (
            <NavLink key={item.to} to={item.to} end={item.end} className="tab">
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ) : (
            <button
              key="add"
              type="button"
              className="tab-add"
              aria-label="Add a reading"
              onClick={() => openReading({})}
            >
              <Icon name="plus" size={26} strokeWidth={2.4} />
            </button>
          )))}
        </nav>

        {sheet && (
          <Sheet title={sheet.editing ? 'Edit reading' : 'New reading'} onClose={closeSheet}>
            <ReadingForm
              editing={sheet.editing || null}
              initialDate={sheet.date}
              initialSlot={sheet.slot}
              onSaved={() => afterChange(sheet.editing ? 'Reading updated' : 'Reading added')}
              onDeleted={() => afterChange('Reading deleted')}
            />
          </Sheet>
        )}

        <div className={`toast ${toast ? 'is-visible' : ''}`} role="status" aria-live="polite">
          <Icon name="drop" size={16} /> {toast}
        </div>
      </div>
    </AppContext.Provider>
  );
}
