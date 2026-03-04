import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Project, Person, Task, Milestone, ProjectExport } from '@/types'
import { generateId } from '@/lib/utils'

interface ProjectState {
  project: Project | null
  persons: Person[]
  tasks: Task[]
  milestones: Milestone[]

  // Projekt
  setProject: (project: Project) => void
  updateProject: (data: Partial<Project>) => void
  clearProject: () => void

  // Zespół
  addPerson: (person: Omit<Person, 'id'>) => void
  updatePerson: (id: string, data: Partial<Person>) => void
  deletePerson: (id: string) => void

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
      persons: [],
      tasks: [],
      milestones: [],

      // ─── Projekt ─────────────────────────────────────────────────────────
      setProject: (project) => set({ project }),

      updateProject: (data) =>
        set((state) => ({
          project: state.project ? { ...state.project, ...data } : null,
        })),

      clearProject: () =>
        set({ project: null, persons: [], tasks: [], milestones: [] }),

      // ─── Zespół ──────────────────────────────────────────────────────────
      addPerson: (personData) =>
        set((state) => ({
          persons: [...state.persons, { ...personData, id: generateId() }],
        })),

      updatePerson: (id, data) =>
        set((state) => ({
          persons: state.persons.map((p) =>
            p.id === id ? { ...p, ...data } : p
          ),
        })),

      deletePerson: (id) =>
        set((state) => ({
          persons: state.persons.filter((p) => p.id !== id),
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
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
          // usuń też podzadania
          // tasks: state.tasks.filter((t) => t.id !== id && t.parentId !== id),
        })),

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
          version: '1.0',
          exportedAt: new Date().toISOString(),
          project: state.project,
          persons: state.persons,
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
            persons: data.persons ?? [],
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
    }
  )
)
