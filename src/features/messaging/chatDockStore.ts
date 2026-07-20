import { create } from 'zustand'

// ---------------------------------------------------------------------------
// Facebook-style chat dock state. Tracks which conversations have an open
// docked window (by customerId), which are minimized, and whether the Chats
// dropdown is open. Windows stack side-by-side bottom-right; overflow beyond
// MAX_OPEN_WINDOWS is collapsed into a "+N" pill.
//
// NOTE: this file is intentionally named `chatDockStore` (not `chatDock`) so
// its basename does not collide case-insensitively with the `ChatDock.tsx`
// component on case-insensitive filesystems (Windows/macOS).
// ---------------------------------------------------------------------------

/** Max docked windows shown at once before overflow collapses. */
export const MAX_OPEN_WINDOWS = 3

interface ChatDockState {
  /** Open conversation windows, most-recently-opened FIRST. */
  openChats: string[]
  /** customerId -> minimized? */
  minimized: Record<string, boolean>
  /** Whether the Chats dropdown panel is open. */
  dropdownOpen: boolean
  /** Whether the top-bar Notifications (bell) dropdown is open. Lives here so
   * we can enforce that only ONE of {Chats, Notifications} is open at a time —
   * they share the right-hand space in the top bar. */
  notificationsOpen: boolean
  /** Whether the "New message" compose window is open (Messenger-style). */
  composeOpen: boolean
  openChat: (customerId: string) => void
  closeChat: (customerId: string) => void
  toggleMinimize: (customerId: string) => void
  setDropdownOpen: (open: boolean) => void
  toggleDropdown: () => void
  setNotificationsOpen: (open: boolean) => void
  toggleNotifications: () => void
  /** Begin a brand-new chat: opens the "New message" compose window. */
  openCompose: () => void
  closeCompose: () => void
}

export const useChatDock = create<ChatDockState>((set) => ({
  openChats: [],
  minimized: {},
  dropdownOpen: false,
  notificationsOpen: false,
  composeOpen: false,
  openChat: (customerId) =>
    set((s) => {
      // Bring existing window to front (and un-minimize); otherwise prepend.
      const without = s.openChats.filter((id) => id !== customerId)
      return {
        openChats: [customerId, ...without],
        minimized: { ...s.minimized, [customerId]: false },
        dropdownOpen: false,
        notificationsOpen: false,
      }
    }),
  closeChat: (customerId) =>
    set((s) => {
      const { [customerId]: _removed, ...rest } = s.minimized
      return { openChats: s.openChats.filter((id) => id !== customerId), minimized: rest }
    }),
  toggleMinimize: (customerId) =>
    set((s) => ({ minimized: { ...s.minimized, [customerId]: !s.minimized[customerId] } })),
  // Opening Chats always closes Notifications (mutual exclusion).
  setDropdownOpen: (open) => set((s) => ({ dropdownOpen: open, notificationsOpen: open ? false : s.notificationsOpen })),
  toggleDropdown: () => set((s) => ({ dropdownOpen: !s.dropdownOpen, notificationsOpen: false })),
  // Opening Notifications always closes Chats (mutual exclusion).
  setNotificationsOpen: (open) => set((s) => ({ notificationsOpen: open, dropdownOpen: open ? false : s.dropdownOpen })),
  toggleNotifications: () => set((s) => ({ notificationsOpen: !s.notificationsOpen, dropdownOpen: false })),
  openCompose: () => set({ composeOpen: true, dropdownOpen: false, notificationsOpen: false }),
  closeCompose: () => set({ composeOpen: false }),
}))
