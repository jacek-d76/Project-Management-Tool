// ─── Projekt ────────────────────────────────────────────────────────────────

export type Currency = 'EUR' | 'PLN'

export interface Project {
  id: string
  name: string
  description: string
  startDate: string   // ISO date string "YYYY-MM-DD"
  endDate: string
  currency: Currency  // waluta bazowa stawek
  exchangeRate: number // 1 EUR = X PLN
}

// ─── Zespół ─────────────────────────────────────────────────────────────────

export interface Person {
  id: string
  name: string
  role: string
  weeklyHours: number   // dostępność h/tydzień
  hourlyRate: number    // stawka w walucie bazowej projektu
}

// ─── Zadania ─────────────────────────────────────────────────────────────────

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type PricingMode = 'hourly' | 'fixed'
export type DependencyType = 'FS' | 'SS'

export interface TaskAssignment {
  personId: string
  allocatedHours?: number // opcjonalne: ile godzin ta osoba na tym zadaniu
}

export interface TaskDependency {
  taskId: string           // ID poprzednika
  type: DependencyType
  lagDays: number          // opóźnienie w dniach (może być ujemne = wyprzedzenie)
}

export interface Task {
  id: string
  projectId: string
  parentId: string | null  // null = zadanie główne
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  startDate: string | null   // "YYYY-MM-DD"
  endDate: string | null
  estimatedHours: number
  progress: number           // 0-100
  pricingMode: PricingMode
  fixedPrice: number | null  // w walucie bazowej, jeśli pricingMode = 'fixed'
  assignments: TaskAssignment[]
  dependencies: TaskDependency[]
  position: number           // kolejność wyświetlania
}

// ─── Milestone'y ─────────────────────────────────────────────────────────────

export type MilestoneStatus = 'OK' | 'AT_RISK' | 'BREACHED'
export type EvidenceType = 'url' | 'network_path'

export interface MilestoneEvidence {
  id: string
  type: EvidenceType
  link: string
  description: string
  addedBy: string   // imię osoby (nie ID - dla prostoty)
  addedAt: string   // ISO datetime
}

export interface Milestone {
  id: string
  projectId: string
  name: string
  date: string       // "YYYY-MM-DD"
  description: string // notatki PM
  status: MilestoneStatus
  linkedTaskIds: string[]
  evidence: MilestoneEvidence[]
}

// ─── Użytkownicy aplikacji ────────────────────────────────────────────────────

export type AppUserRole = 'member' | 'viewer'

export interface AppUser {
  id: string
  name: string        // wyświetlana nazwa
  username: string    // login (unikalny)
  password: string    // plain text (Etap 8: serwer z hashowaniem)
  role: AppUserRole
  personId: string | null  // powiązanie z Person w projekcie (workload, przypisania)
  isActive: boolean
}

// ─── Sesja ───────────────────────────────────────────────────────────────────

export type UserRole = 'pm' | 'member' | 'viewer' | null

export interface SessionUser {
  username: string
  name: string
  role: UserRole
  personId: string | null  // null dla PM
}

// ─── Pełny eksport JSON ──────────────────────────────────────────────────────

export interface ProjectExport {
  version: string
  exportedAt: string
  project: Project
  persons: Person[]
  tasks: Task[]
  milestones: Milestone[]
}
