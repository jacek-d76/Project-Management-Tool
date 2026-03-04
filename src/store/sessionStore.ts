/// <reference types="vite/client" />
import { create } from 'zustand'
import type { UserRole, SessionUser } from '@/types'
import { useUserStore } from './userStore'

const PM_PASSWORD = import.meta.env.VITE_PM_PASSWORD || 'pm2026'
const PM_USERNAME = 'pm'

interface SessionState {
  currentUser: SessionUser | null
  login: (username: string, password: string) => boolean
  logout: () => void
  isPM: () => boolean
  isAtLeastMember: () => boolean
  role: UserRole
}

function loadSession(): SessionUser | null {
  try {
    const raw = sessionStorage.getItem('pm-session')
    return raw ? (JSON.parse(raw) as SessionUser) : null
  } catch {
    return null
  }
}

export const useSessionStore = create<SessionState>()((set, get) => ({
  currentUser: loadSession(),
  role: loadSession()?.role ?? null,

  login: (username, password) => {
    // Konto PM - specjalne, weryfikowane przez env var
    if (username.toLowerCase() === PM_USERNAME && password === PM_PASSWORD) {
      const user: SessionUser = { username: PM_USERNAME, name: 'Project Manager', role: 'pm', personId: null }
      sessionStorage.setItem('pm-session', JSON.stringify(user))
      set({ currentUser: user, role: 'pm' })
      return true
    }

    // Konta zespołu - z localStorage
    const appUser = useUserStore.getState().findByUsername(username)
    if (appUser && appUser.isActive && appUser.password === password) {
      const user: SessionUser = {
        username: appUser.username,
        name: appUser.name,
        role: appUser.role,
        personId: appUser.personId,
      }
      sessionStorage.setItem('pm-session', JSON.stringify(user))
      set({ currentUser: user, role: appUser.role })
      return true
    }

    return false
  },

  logout: () => {
    sessionStorage.removeItem('pm-session')
    set({ currentUser: null, role: null })
  },

  isPM: () => get().currentUser?.role === 'pm',
  isAtLeastMember: () => {
    const role = get().currentUser?.role
    return role === 'pm' || role === 'member'
  },
}))
