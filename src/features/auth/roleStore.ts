import { create } from 'zustand'

// ---------------------------------------------------------------------------
// Current UI role. Display + selection only for now (no RBAC enforcement yet).
// Maps to `Role.name` (via `UserLocationAccess.roleId`) on the backend.
// ---------------------------------------------------------------------------

export type AppRole = 'View Only' | 'Edit Only' | 'Administrator'

/** The three selectable roles, in display order. */
export const APP_ROLES: AppRole[] = ['View Only', 'Edit Only', 'Administrator']

const STORAGE_KEY = 'autosuite.role'

const DEFAULT_ROLE: AppRole = 'Administrator'

function readStored(): AppRole {
  if (typeof window === 'undefined') return DEFAULT_ROLE
  const raw = window.localStorage.getItem(STORAGE_KEY)
  return (APP_ROLES as string[]).includes(raw ?? '') ? (raw as AppRole) : DEFAULT_ROLE
}

interface RoleState {
  role: AppRole
  setRole: (role: AppRole) => void
}

export const useRoleStore = create<RoleState>((set) => ({
  role: readStored(),
  setRole: (role) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, role)
    set({ role })
  },
}))
