/// <reference types="vite/client" />
import { create } from 'zustand'
import type { UserRole, SessionUser, UserPermissions } from '@/types'
import { useProjectStore } from './projectStore'

const PM_PASSWORD = import.meta.env.VITE_PM_PASSWORD || 'pm2026'
const PM_USERNAME = 'pm'

interface SessionState {
  currentUser: SessionUser | null
  login: (username: string, password: string) => boolean
  logout: () => void
  isPM: () => boolean
  can: (permission: keyof UserPermissions) => boolean
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
    // Konto PM - weryfikowane przez env var
    if (username.toLowerCase() === PM_USERNAME && password === PM_PASSWORD) {
      const user: SessionUser = {
        username: PM_USERNAME,
        name: 'Project Manager',
        role: 'pm',
        memberId: null,
        permissions: null,
      }
      sessionStorage.setItem('pm-session', JSON.stringify(user))
      set({ currentUser: user, role: 'pm' })
      return true
    }

    // Konta zespołu - z projectStore
    const members = useProjectStore.getState().members
    const member = members.find(
      (m) => m.username.toLowerCase() === username.toLowerCase()
    )
    if (member && member.isActive && member.password === password) {
      const user: SessionUser = {
        username: member.username,
        name: member.name,
        role: 'member',
        memberId: member.id,
        permissions: member.permissions,
      }
      sessionStorage.setItem('pm-session', JSON.stringify(user))
      set({ currentUser: user, role: 'member' })
      return true
    }

    return false
  },

  logout: () => {
    sessionStorage.removeItem('pm-session')
    set({ currentUser: null, role: null })
  },

  isPM: () => get().currentUser?.role === 'pm',

  can: (permission) => {
    const user = get().currentUser
    if (!user) return false
    if (user.role === 'pm') return true
    return user.permissions?.[permission] ?? false
  },
}))
