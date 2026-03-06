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

// ─── Uprawnienia użytkownika ──────────────────────────────────────────────────

export interface UserPermissions {
  canEditTasks: boolean       // Edycja zadań (dodawanie, zmiana statusu, dat, opisu)
  canUpdateProgress: boolean  // Zmiana % postępu
  canViewCosts: boolean       // Podgląd kosztów
  canEditMilestones: boolean  // Edycja milestone'ów
  canAddEvidence: boolean     // Dodawanie dowodów dostarczenia
  canManageTeam: boolean      // Zarządzanie zespołem (PM-level)
}

export const DEFAULT_PERMISSIONS: UserPermissions = {
  canEditTasks: false,
  canUpdateProgress: true,
  canViewCosts: false,
  canEditMilestones: false,
  canAddEvidence: true,
  canManageTeam: false,
}

// ─── Kontrahent (firma zewnętrzna z kontraktem fixed-price) ──────────────────

export interface Contractor {
  id: string
  name: string
  contractPrice: number   // kwota kontraktu w walucie bazowej projektu
  description: string     // zakres prac / notatki
}

// ─── Członek zespołu (konto logowania + dane projektowe) ─────────────────────

export interface TeamMember {
  id: string
  name: string
  projectRole: string     // opisowa rola np. "Developer", "Designer"
  weeklyHours: number     // dostępność h/tydzień
  hourlyRate: number      // stawka w walucie bazowej projektu (informacyjna gdy należy do firmy)
  contractorId?: string   // jeśli ustawione → należy do firmy, koszty pokrywa kontrakt firmy
  username: string
  password: string
  isActive: boolean
  permissions: UserPermissions
}

// ─── Zadania ─────────────────────────────────────────────────────────────────

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type PricingMode = 'hourly' | 'fixed'
export type DependencyType = 'FS' | 'SS'

export interface TaskAssignment {
  personId: string
  estimatedHours: number      // PM: planowane godziny dla tej osoby
  actualHours: number | null  // Zespół: faktycznie przepracowane (po zakończeniu)
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

// ─── Sesja ───────────────────────────────────────────────────────────────────

export type UserRole = 'pm' | 'member' | null

export interface SessionUser {
  username: string
  name: string
  role: UserRole
  memberId: string | null       // null dla PM
  permissions: UserPermissions | null  // null dla PM (ma wszystko)
}

// ─── Pełny eksport JSON ──────────────────────────────────────────────────────

export interface ProjectExport {
  version: string
  exportedAt: string
  project: Project
  members: TeamMember[]
  tasks: Task[]
  milestones: Milestone[]
  contractors: Contractor[]
}
