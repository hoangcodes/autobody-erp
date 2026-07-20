import { create } from 'zustand'
import type { AuthMeResponse } from '@/types'

interface AuthState {
  me: AuthMeResponse | null
  currentLocationId: string | null
  devMode: boolean
  setMe: (me: AuthMeResponse) => void
  setCurrentLocationId: (locationId: string) => void
  setDevMode: (on: boolean) => void
}

const STORAGE_KEY = 'autosuite.locationId'

export const useAuthStore = create<AuthState>((set) => ({
  me: null,
  currentLocationId: typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null,
  devMode: typeof window !== 'undefined' ? window.localStorage.getItem('autosuite.devMode') === '1' : false,
  setMe: (me) =>
    set((state) => {
      const currentLocationId = state.currentLocationId ?? me.locationId
      if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, currentLocationId)
      return { me, currentLocationId }
    }),
  setCurrentLocationId: (locationId) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, locationId)
    set({ currentLocationId: locationId })
  },
  setDevMode: (on) => {
    if (typeof window !== 'undefined') window.localStorage.setItem('autosuite.devMode', on ? '1' : '0')
    set({ devMode: on })
  },
}))

/** Non-hook accessor for the current location id, for use in the API client. */
export function getCurrentLocationId(): string | null {
  return useAuthStore.getState().currentLocationId
}
