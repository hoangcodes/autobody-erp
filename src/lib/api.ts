import type { ApiErrorEnvelope, ApiSuccessEnvelope, PaginationMeta } from '@/types'
import { getAccessToken } from '@/lib/supabase'
import { getCurrentLocationId } from '@/features/auth/authStore'
import { uuid } from '@/lib/utils'

const RAW_BASE = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:4000'
const API_BASE = `${RAW_BASE.replace(/\/$/, '')}/api/v1`

export class ApiError extends Error {
  code: string
  details?: unknown
  status: number

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export interface ListResult<T> {
  items: T[]
  meta: PaginationMeta
}

type QueryValue = string | number | boolean | undefined | null

function buildUrl(path: string, params?: Record<string, QueryValue>): string {
  const url = new URL(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

async function buildHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  }
  const token = await getAccessToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const locationId = getCurrentLocationId()
  if (locationId) headers['x-location-id'] = locationId
  return headers
}

async function handleResponse<T>(res: Response): Promise<T> {
  let body: unknown
  try {
    body = await res.json()
  } catch {
    body = null
  }

  if (!res.ok) {
    const errBody = body as ApiErrorEnvelope | null
    throw new ApiError(
      res.status,
      errBody?.error?.code ?? 'unknown_error',
      errBody?.error?.message ?? res.statusText ?? 'Request failed',
      errBody?.error?.details,
    )
  }

  const envelope = body as ApiSuccessEnvelope<T>
  return envelope.data
}

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  opts?: { params?: Record<string, QueryValue>; body?: unknown; idempotent?: boolean },
): Promise<T> {
  const url = buildUrl(path, opts?.params)
  const extraHeaders: Record<string, string> = {}
  if (opts?.idempotent && (method === 'POST' || method === 'PATCH')) {
    extraHeaders['Idempotency-Key'] = uuid()
  }
  const headers = await buildHeaders(extraHeaders)

  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers,
      body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })
  } catch (err) {
    throw new ApiError(0, 'network_error', err instanceof Error ? err.message : 'Network request failed')
  }

  return handleResponse<T>(res)
}

export const api = {
  get: <T>(path: string, params?: Record<string, QueryValue>) => request<T>('GET', path, { params }),

  /** GET a paginated list endpoint; returns items + pagination meta. */
  list: async <T>(path: string, params?: Record<string, QueryValue>): Promise<ListResult<T>> => {
    const url = buildUrl(path, params)
    const headers = await buildHeaders()
    let res: Response
    try {
      res = await fetch(url, { method: 'GET', headers })
    } catch (err) {
      throw new ApiError(0, 'network_error', err instanceof Error ? err.message : 'Network request failed')
    }
    let body: unknown
    try {
      body = await res.json()
    } catch {
      body = null
    }
    if (!res.ok) {
      const errBody = body as ApiErrorEnvelope | null
      throw new ApiError(
        res.status,
        errBody?.error?.code ?? 'unknown_error',
        errBody?.error?.message ?? res.statusText ?? 'Request failed',
        errBody?.error?.details,
      )
    }
    const envelope = body as ApiSuccessEnvelope<T[]>
    const meta = (envelope.meta as PaginationMeta | undefined) ?? {
      page: 1,
      pageSize: envelope.data?.length ?? 0,
      total: envelope.data?.length ?? 0,
      totalPages: 1,
    }
    return { items: envelope.data ?? [], meta }
  },

  post: <T>(path: string, body?: unknown, opts?: { idempotent?: boolean }) =>
    request<T>('POST', path, { body, idempotent: opts?.idempotent ?? true }),

  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body, idempotent: true }),

  del: <T>(path: string) => request<T>('DELETE', path, {}),
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${RAW_BASE.replace(/\/$/, '')}/health`)
    return res.ok
  } catch {
    return false
  }
}
