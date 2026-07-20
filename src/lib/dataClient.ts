// ---------------------------------------------------------------------------
// The single data seam. Hooks import `dataClient` (not `api` directly) so we
// can swap between the real REST client and the in-memory mock with one env
// flag while the backend isn't up.
//
//   VITE_USE_MOCKS = 'true'  (default) -> in-memory mock API (src/mocks)
//   VITE_USE_MOCKS = 'false'           -> real REST client   (src/lib/api.ts)
//
// To go live later: set VITE_USE_MOCKS=false in your .env (and point
// VITE_API_URL at the backend). No hook or component changes required.
// ---------------------------------------------------------------------------

import { api, type ListResult } from '@/lib/api'
import { mockApi } from '@/mocks/mockApi'

export type { ListResult }

/** True unless explicitly disabled. Default-on so every screen renders today. */
export const USE_MOCKS = String(import.meta.env.VITE_USE_MOCKS ?? 'true') !== 'false'

/** The active data client. Structurally identical to `api`. */
export const dataClient: typeof api = USE_MOCKS ? (mockApi as unknown as typeof api) : api
