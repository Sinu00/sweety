// Thin fetch wrapper that attaches the JWT and surfaces API error messages.
const BASE = import.meta.env.VITE_API_URL || '';

export function getToken() {
  return localStorage.getItem('sweety_token');
}

export function setSession(token, user) {
  localStorage.setItem('sweety_token', token);
  localStorage.setItem('sweety_user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('sweety_token');
  localStorage.removeItem('sweety_user');
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('sweety_user'));
  } catch {
    return null;
  }
}

function headers() {
  return {
    'Content-Type': 'application/json',
    ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
  };
}

function handleUnauthorized(status) {
  if (status === 401 && getToken()) {
    clearSession();
    // App listens for this and returns to the login screen.
    window.dispatchEvent(new Event('sweety:logout'));
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: headers(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    handleUnauthorized(res.status);
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
  return data;
}

// Downloads the CSV export (needs the auth header, so a plain link won't do).
export async function downloadCsv() {
  const res = await fetch(`${BASE}/api/readings/export`, { headers: headers() });
  if (!res.ok) {
    handleUnauthorized(res.status);
    throw new Error('Could not export your readings. Please try again.');
  }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sweety-readings.csv';
  a.click();
  URL.revokeObjectURL(url);
}
