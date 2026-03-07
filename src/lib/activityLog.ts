// ─── Activity Log ─────────────────────────────────────────────────────────────
// Stores login/logout events and active sessions in localStorage.
// All users of the same browser share one log (shared localStorage).

export interface ActivityEvent {
  id: string
  username: string
  name: string
  role: 'pm' | 'member'
  action: 'login' | 'logout'
  timestamp: string  // ISO 8601
}

export interface ActiveSession {
  username: string
  name: string
  role: 'pm' | 'member'
  loginTime: string  // ISO 8601
}

const KEY_EVENTS   = 'pmActivityLog'
const KEY_SESSIONS = 'pmActiveSessions'
const MAX_EVENTS   = 300
const SESSION_TTL  = 12 * 60 * 60 * 1000  // 12 h — after this, session is treated as stale

// ─── Read ──────────────────────────────────────────────────────────────────────

export function getActivityEvents(): ActivityEvent[] {
  try {
    const raw = localStorage.getItem(KEY_EVENTS)
    return raw ? (JSON.parse(raw) as ActivityEvent[]) : []
  } catch { return [] }
}

export function getActiveSessions(): ActiveSession[] {
  try {
    const raw = localStorage.getItem(KEY_SESSIONS)
    const sessions: ActiveSession[] = raw ? JSON.parse(raw) : []
    const cutoff = Date.now() - SESSION_TTL
    return sessions.filter((s) => new Date(s.loginTime).getTime() > cutoff)
  } catch { return [] }
}

// ─── Write ─────────────────────────────────────────────────────────────────────

export function recordLogin(username: string, name: string, role: 'pm' | 'member') {
  // Append to event log
  const events = getActivityEvents()
  events.unshift({
    id: Math.random().toString(36).slice(2, 10),
    username, name, role, action: 'login',
    timestamp: new Date().toISOString(),
  })
  localStorage.setItem(KEY_EVENTS, JSON.stringify(events.slice(0, MAX_EVENTS)))

  // Update active sessions (replace existing session for this user)
  const sessions = getActiveSessions().filter((s) => s.username !== username)
  sessions.unshift({ username, name, role, loginTime: new Date().toISOString() })
  localStorage.setItem(KEY_SESSIONS, JSON.stringify(sessions))
}

export function recordLogout(username: string, name: string, role: 'pm' | 'member') {
  // Append to event log
  const events = getActivityEvents()
  events.unshift({
    id: Math.random().toString(36).slice(2, 10),
    username, name, role, action: 'logout',
    timestamp: new Date().toISOString(),
  })
  localStorage.setItem(KEY_EVENTS, JSON.stringify(events.slice(0, MAX_EVENTS)))

  // Remove from active sessions
  const sessions = getActiveSessions().filter((s) => s.username !== username)
  localStorage.setItem(KEY_SESSIONS, JSON.stringify(sessions))
}

// ─── Reset ────────────────────────────────────────────────────────────────────

export function clearActivityLog() {
  localStorage.removeItem(KEY_EVENTS)
  localStorage.removeItem(KEY_SESSIONS)
}
