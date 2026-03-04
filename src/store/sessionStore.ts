/// <reference types="vite/client" />
import { create } from 'zustand'
import type { UserRole } from '@/types'

// Hasła zakodowane w buildzie - zmień przed deployem!
// W Etapie 8 (serwer) weryfikacja przeniesie się na backend.
const PM_PASSWORD = import.meta.env.VITE_PM_PASSWORD ?? 'pm2026'
const TEAM_PASSWORD = import.meta.env.VITE_TEAM_PASSWORD ?? 'team2026'

interface SessionState {
  role: UserRole
  login: (password: string) => boolean
  logout: () => void
  isPM: () => boolean
}

export const useSessionStore = create<SessionState>()((set, get) => ({
  role: sessionStorage.getItem('pm-role') as UserRole ?? null,

  login: (password) => {
    if (password === PM_PASSWORD) {
      sessionStorage.setItem('pm-role', 'pm')
      set({ role: 'pm' })
      return true
    }
    if (password === TEAM_PASSWORD) {
      sessionStorage.setItem('pm-role', 'team')
      set({ role: 'team' })
      return true
    }
    return false
  },

  logout: () => {
    sessionStorage.removeItem('pm-role')
    set({ role: null })
  },

  isPM: () => get().role === 'pm',
}))
