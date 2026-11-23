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

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) clearSession();
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
  return data;
}
