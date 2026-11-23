import { useState } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { clearSession, getStoredUser, getToken } from './api';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';

export default function App() {
  const [user, setUser] = useState(getStoredUser());
  const navigate = useNavigate();

  function logout() {
    clearSession();
    setUser(null);
    navigate('/login');
  }

  if (!user || !getToken()) {
    return (
      <Routes>
        <Route path="/login" element={<Login onAuth={setUser} />} />
        <Route path="/register" element={<Register onAuth={setUser} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">Sweety</span>
        <nav>
          <NavLink to="/">Readings</NavLink>
          <NavLink to="/reports">Reports</NavLink>
        </nav>
        <div className="topbar-right">
          <span className="user-name">{user.name}</span>
          <button className="link-btn" onClick={logout}>Log out</button>
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
