import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Project, TeamMember, Task, Milestone, ProjectExport } from '@/types'
import { generateId } from '@/lib/utils'

interface ProjectState {
  project: Project | null
  members: TeamMember[]
  tasks: Task[]
  milestones: Milestone[]

  // Projekt
  setProject: (project: Project) => void
  updateProject: (data: Partial<Project>) => void
  clearProject: () => void

  // Zespół / Użytkownicy
  addMember: (member: Omit<TeamMember, 'id'>) => void
  updateMember: (id: string, data: Partial<TeamMember>) => void
  deleteMember: (id: string) => void

  // Zadania (stub - rozbudowane w Etapie 2)
  addTask: (task: Omit<Task, 'id'>) => void
  updateTask: (id: string, data: Partial<Task>) => void
  deleteTask: (id: string) => void

  // Milestone'y (stub - rozbudowane w Etapie 3)
  addMilestone: (milestone: Omit<Milestone, 'id'>) => void
  updateMilestone: (id: string, data: Partial<Milestone>) => void
  deleteMilestone: (id: string) => void

  // Export / Import
  exportJSON: () => void
  importJSON: (jsonString: string) => boolean
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      project: null,
      members: [],
      tasks: [],
      milestones: [],

      // ─── Projekt ─────────────────────────────────────────────────────────
      setProject: (project) => set({ project }),

      updateProject: (data) =>
        set((state) => ({
          project: state.project ? { ...state.project, ...data } : null,
        })),

      clearProject: () =>
        set({ project: null, members: [], tasks: [], milestones: [] }),

      // ─── Zespół / Użytkownicy ─────────────────────────────────────────────
      addMember: (memberData) =>
        set((state) => ({
          members: [...state.members, { ...memberData, id: generateId() }],
        })),

      updateMember: (id, data) =>
        set((state) => ({
          members: state.members.map((m) =>
            m.id === id ? { ...m, ...data } : m
          ),
        })),

      deleteMember: (id) =>
        set((state) => ({
          members: state.members.filter((m) => m.id !== id),
        })),

      // ─── Zadania ─────────────────────────────────────────────────────────
      addTask: (taskData) =>
        set((state) => ({
          tasks: [...state.tasks, { ...taskData, id: generateId() }],
        })),

      updateTask: (id, data) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, ...data } : t
          ),
        })),

      deleteTask: (id) =>
        set((state) => {
          const collectIds = (taskId: string): string[] => {
            const children = state.tasks.filter((t) => t.parentId === taskId)
            return [taskId, ...children.flatMap((c) => collectIds(c.id))]
          }
          const toDelete = new Set(collectIds(id))
          return { tasks: state.tasks.filter((t) => !toDelete.has(t.id)) }
        }),

      // ─── Milestone'y ─────────────────────────────────────────────────────
      addMilestone: (data) =>
        set((state) => ({
          milestones: [...state.milestones, { ...data, id: generateId() }],
        })),

      updateMilestone: (id, data) =>
        set((state) => ({
          milestones: state.milestones.map((m) =>
            m.id === id ? { ...m, ...data } : m
          ),
        })),

      deleteMilestone: (id) =>
        set((state) => ({
          milestones: state.milestones.filter((m) => m.id !== id),
        })),

      // ─── Export / Import ──────────────────────────────────────────────────
      exportJSON: () => {
        const state = get()
        if (!state.project) return

        const exportData: ProjectExport = {
          version: '1.1',
          exportedAt: new Date().toISOString(),
          project: state.project,
          members: state.members,
          tasks: state.tasks,
          milestones: state.milestones,
        }

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json',
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `projekt-${state.project.name.replace(/\s+/g, '-')}-${
          new Date().toISOString().slice(0, 10)
        }.json`
        a.click()
        URL.revokeObjectURL(url)
      },

      importJSON: (jsonString) => {
        try {
          const data: ProjectExport = JSON.parse(jsonString)
          if (!data.project || !data.version) return false
          set({
            project: data.project,
            members: data.members ?? [],
            tasks: data.tasks ?? [],
            milestones: data.milestones ?? [],
          })
          return true
        } catch {
          return false
        }
      },
    }),
    {
      name: 'project-manager-storage',
      version: 2,
      migrate: (persistedState, version) => {
        const s = persistedState as Record<string, unknown>
        // v1 → v2: persons (Person[]) renamed to members (TeamMember[])
        if (version < 2 && Array.isArray(s.persons)) {
          s.members = s.members ?? []
          delete s.persons
        }
        return s
      },
    }
  )
)
