import { useProjectStore } from '@/store/projectStore'

const API_URL = '/api/state.php'
const API_KEY = import.meta.env.VITE_API_KEY ?? ''

// ─── Load from server ──────────────────────────────────────────────────────────

export async function loadFromServer(): Promise<boolean> {
  try {
    const res = await fetch(API_URL, {
      headers: { 'X-API-Key': API_KEY },
    })
    if (!res.ok) return false

    const data = await res.json()
    if (!data || typeof data !== 'object') return false

    // Pusty stan – baza pusta, nowy projekt do stworzenia
    if (!data.project) return true

    useProjectStore.setState({
      project:    data.project    ?? null,
      members:    data.members    ?? [],
      tasks:      data.tasks      ?? [],
      milestones: data.milestones ?? [],
    })
    return true
  } catch {
    return false
  }
}

// ─── Auto-sync on state change ────────────────────────────────────────────────

let syncTimer: ReturnType<typeof setTimeout> | null = null

async function pushToServer() {
  const { project, members, tasks, milestones } = useProjectStore.getState()
  try {
    await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({ project, members, tasks, milestones }),
    })
  } catch {
    // Cichy błąd – spróbuje przy następnej zmianie
  }
}

export function setupAutoSync() {
  useProjectStore.subscribe(() => {
    if (syncTimer) clearTimeout(syncTimer)
    syncTimer = setTimeout(pushToServer, 1000)
  })
}
