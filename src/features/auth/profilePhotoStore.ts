import { create } from 'zustand'

// ---------------------------------------------------------------------------
// Per-user profile photo store. Maps a userId -> uploaded photo data-URL and
// persists the whole map to localStorage so an uploaded avatar survives reloads
// (session/local only — there is no backend). Users without an entry fall back
// to their initials wherever the avatar is rendered.
//
// NOTE: basename is intentionally `profilePhotoStore` (not `profilePhoto`) to
// avoid a case-insensitive collision with any future `ProfilePhoto` component.
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'autosuite.profilePhotos'

type PhotoMap = Record<string, string>

function load(): PhotoMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PhotoMap) : {}
  } catch {
    return {}
  }
}

function persist(photos: PhotoMap) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(photos))
  } catch {
    // Ignore quota / serialization errors — the in-memory map still works.
  }
}

interface ProfilePhotoState {
  /** userId -> data-URL. */
  photos: PhotoMap
  setPhoto: (userId: string, dataUrl: string) => void
  removePhoto: (userId: string) => void
}

export const useProfilePhotos = create<ProfilePhotoState>((set) => ({
  photos: load(),
  setPhoto: (userId, dataUrl) =>
    set((s) => {
      const photos = { ...s.photos, [userId]: dataUrl }
      persist(photos)
      return { photos }
    }),
  removePhoto: (userId) =>
    set((s) => {
      const { [userId]: _removed, ...rest } = s.photos
      persist(rest)
      return { photos: rest }
    }),
}))
