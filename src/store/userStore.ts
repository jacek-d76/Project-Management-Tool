import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppUser, AppUserRole } from '@/types'
import { generateId } from '@/lib/utils'

interface UserStore {
  users: AppUser[]
  addUser: (data: { name: string; username: string; password: string; role: AppUserRole; personId: string | null }) => void
  updateUser: (id: string, data: Partial<Omit<AppUser, 'id'>>) => void
  deleteUser: (id: string) => void
  findByUsername: (username: string) => AppUser | undefined
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      users: [],

      addUser: (data) =>
        set((state) => ({
          users: [
            ...state.users,
            { ...data, id: generateId(), isActive: true },
          ],
        })),

      updateUser: (id, data) =>
        set((state) => ({
          users: state.users.map((u) => (u.id === id ? { ...u, ...data } : u)),
        })),

      deleteUser: (id) =>
        set((state) => ({
          users: state.users.filter((u) => u.id !== id),
        })),

      findByUsername: (username) =>
        get().users.find((u) => u.username.toLowerCase() === username.toLowerCase()),
    }),
    { name: 'pm-users-storage' }
  )
)
