import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Project, TeamMember, Task, Milestone, Contractor, ProjectExport } from '@/types'
import { generateId } from '@/lib/utils'
import { runScheduler } from '@/lib/scheduler'

interface ProjectState {
  project: Project | null
  members: TeamMember[]
  tasks: Task[]
  milestones: Milestone[]
  contractors: Contractor[]

  // Projekt
  setProject: (project: Project) => void
  updateProject: (data: Partial<Project>) => void
  clearProject: () => void

  // Zespół / Użytkownicy
  addMember: (member: Omit<TeamMember, 'id'>) => void
  updateMember: (id: string, data: Partial<TeamMember>) => void
  deleteMember: (id: string) => void

  // Kontrahenci (firmy)
  addContractor: (contractor: Omit<Contractor, 'id'>) => void
  updateContractor: (id: string, data: Partial<Contractor>) => void
  deleteContractor: (id: string) => void

  // Zadania
  addTask: (task: Omit<Task, 'id'>) => void
  updateTask: (id: string, data: Partial<Task>) => void
  deleteTask: (id: string) => void
  moveTask: (taskId: string, newParentId: string | null, newPosition: number) => void
  setTaskDates: (id: string, startDate: string | null, endDate: string | null) => void
  addTaskDependency: (taskId: string, dep: Task['dependencies'][number]) => void

  // Milestone'y
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
      contractors: [],

      // ─── Projekt ─────────────────────────────────────────────────────────
      setProject: (project) => set({ project }),

      updateProject: (data) =>
        set((state) => ({
          project: state.project ? { ...state.project, ...data } : null,
        })),

      clearProject: () =>
        set({ project: null, members: [], tasks: [], milestones: [], contractors: [] }),

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

      // ─── Kontrahenci ──────────────────────────────────────────────────────
      addContractor: (data) =>
        set((state) => ({
          contractors: [...state.contractors, { ...data, id: generateId() }],
        })),

      updateContractor: (id, data) =>
        set((state) => ({
          contractors: state.contractors.map((c) =>
            c.id === id ? { ...c, ...data } : c
          ),
        })),

      deleteContractor: (id) =>
        set((state) => ({
          contractors: state.contractors.filter((c) => c.id !== id),
          members: state.members.map((m) =>
            m.contractorId === id ? { ...m, contractorId: undefined } : m
          ),
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

      setTaskDates: (id, startDate, endDate) =>
        set((state) => {
          const updated = state.tasks.map((t) =>
            t.id === id ? { ...t, startDate, endDate } : t
          )
          if (!startDate || !endDate) return { tasks: updated }
          const schedUpdates = runScheduler(updated, id)
          return {
            tasks: updated.map((t) => {
              const u = schedUpdates.get(t.id)
              return u ? { ...t, ...u } : t
            }),
          }
        }),

      addTaskDependency: (taskId, dep) =>
        set((state) => {
          const withDep = state.tasks.map((t) =>
            t.id === taskId ? { ...t, dependencies: [...t.dependencies, dep] } : t
          )
          const pred = withDep.find((t) => t.id === dep.taskId)
          if (!pred?.startDate || !pred?.endDate) return { tasks: withDep }
          const schedUpdates = runScheduler(withDep, dep.taskId)
          return {
            tasks: withDep.map((t) => {
              const u = schedUpdates.get(t.id)
              return u ? { ...t, ...u } : t
            }),
          }
        }),

      moveTask: (taskId, newParentId, newPosition) =>
        set((state) => {
          const dragged = state.tasks.find((t) => t.id === taskId)
          if (!dragged) return {}
          const oldParentId = dragged.parentId

          const newSiblings = state.tasks
            .filter((t) => t.parentId === newParentId && t.id !== taskId)
            .sort((a, b) => a.position - b.position)

          newSiblings.splice(newPosition, 0, dragged)

          const updates: Record<string, { parentId: string | null; position: number }> = {}
          newSiblings.forEach((t, i) => {
            updates[t.id] = { parentId: newParentId, position: i }
          })

          if (oldParentId !== newParentId) {
            state.tasks
              .filter((t) => t.parentId === oldParentId && t.id !== taskId)
              .sort((a, b) => a.position - b.position)
              .forEach((t, i) => {
                if (!updates[t.id]) updates[t.id] = { parentId: t.parentId, position: i }
                else updates[t.id].position = i
              })
          }

          return {
            tasks: state.tasks.map((t) =>
              updates[t.id] ? { ...t, ...updates[t.id] } : t
            ),
          }
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
          version: '1.2',
          exportedAt: new Date().toISOString(),
          project: state.project,
          members: state.members,
          tasks: state.tasks,
          milestones: state.milestones,
          contractors: state.contractors,
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
            contractors: data.contractors ?? [],
          })
          return true
        } catch {
          return false
        }
      },
    }),
    {
      name: 'project-manager-storage',
      version: 5,
      migrate: (persistedState, version) => {
        const s = persistedState as Record<string, unknown>
        if (version < 2 && Array.isArray(s.persons)) {
          s.members = s.members ?? []
          delete s.persons
        }
        if (version < 3 && Array.isArray(s.tasks)) {
          s.tasks = (s.tasks as Record<string, unknown>[]).map((t) => {
            const assignments = ((t.assignments as Record<string, unknown>[]) ?? []).map((a) => ({
              personId: a.personId,
              estimatedHours: Number(a.estimatedHours ?? a.allocatedHours ?? 0),
              actualHours: a.actualHours != null ? Number(a.actualHours) : null,
            }))
            const { estimatedHours: _drop, ...rest } = t as Record<string, unknown>
            void _drop
            return { ...rest, assignments }
          })
        }
        if (version < 4) {
          s.contractors = s.contractors ?? []
        }
        // v4 → v5: usdExchangeRate on project, contractCurrency on contractors
        if (version < 5) {
          if (s.project && typeof s.project === 'object') {
            const p = s.project as Record<string, unknown>
            p.usdExchangeRate = p.usdExchangeRate ?? 1.08
          }
          if (Array.isArray(s.contractors)) {
            s.contractors = (s.contractors as Record<string, unknown>[]).map((c) => ({
              ...c,
              contractCurrency: c.contractCurrency ?? 'EUR',
            }))
          }
        }
        return s
      },
    }
  )
)
