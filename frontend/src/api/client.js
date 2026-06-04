import { API_BASE, AUTH_STORAGE_KEY } from '../config';

/**
 * api/client.js - Centralized API communication layer.
 * Supports dynamic Clerk tokens via setToken() + fallback to localStorage.
 */

let activeToken = localStorage.getItem(AUTH_STORAGE_KEY) || null;

function authHeaders() {
  return activeToken ? { Authorization: `Bearer ${activeToken}` } : {};
}

async function throwIfNotOk(res) {
  if (res.ok) return;
  let body = null;
  try {
    body = await res.json();
  } catch {
    // ignore
  }
  const err = new Error(`HTTP ${res.status}`);
  err.status = res.status;
  err.body = body;
  throw err;
}

export const apiClient = {
  setToken(token) {
    activeToken = token;
    if (token) {
      localStorage.setItem(AUTH_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  },

  async loginWithGoogle(idToken) {
    const res = await fetch(`${API_BASE}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: idToken }),
    });
    await throwIfNotOk(res);
    return res.json();
  },

  async me() {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { ...authHeaders() },
    });
    await throwIfNotOk(res);
    return res.json();
  },

  async requestJudge(payload) {
    const res = await fetch(`${API_BASE}/api/debate/judge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload),
    });
    await throwIfNotOk(res);
    return res.json();
  },

  async requestDebateStream(payload, signal) {
    const response = await fetch(`${API_BASE}/api/debate/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload),
      signal,
    });
    await throwIfNotOk(response);
    return response.body.getReader();
  },

  async saveBattle(payload) {
    const res = await fetch(`${API_BASE}/api/battles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload),
    });
    await throwIfNotOk(res);
    return res.json();
  },

  async getBattles() {
    const res = await fetch(`${API_BASE}/api/battles`, {
      headers: { ...authHeaders() },
    });
    await throwIfNotOk(res);
    return res.json();
  },

  async getBattle(battleId) {
    const res = await fetch(`${API_BASE}/api/battles/${battleId}`, {
      headers: { ...authHeaders() },
    });
    await throwIfNotOk(res);
    return res.json();
  },

  async deleteBattle(battleId) {
    const res = await fetch(`${API_BASE}/api/battles/${battleId}`, {
      method: 'DELETE',
      headers: { ...authHeaders() },
    });
    await throwIfNotOk(res);
    return res.json();
  },

  async requestHeckles(payload, { signal } = {}) {
    const res = await fetch(`${API_BASE}/api/debate/heckle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload),
      signal,
    });
    await throwIfNotOk(res);
    return res.json();
  },

  async requestCoachAdvice(payload) {
    const res = await fetch(`${API_BASE}/api/debate/coach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload),
    });
    await throwIfNotOk(res);
    return res.json();
  },
};
