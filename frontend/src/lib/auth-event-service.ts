import { api } from '@/lib/api-client'
import type { Quote } from '@/lib/mock-data'

export interface AuthEvent {
  id: string
  authUserId: string
  email: string
  role: string
  event: 'login' | 'logout'
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

export interface AuthEventPage {
  events: AuthEvent[]
  nextCursor: string | null
}

export interface AdminUser {
  id: string
  email: string
  role: string
  createdAt: string
  lastSignInAt: string | null
  /** Present in auth_events but gone from Supabase — kept so old log rows stay attributable. */
  deleted: boolean
  logins: number
  logouts: number
  lastSeen: string | null
}

export interface GlobalMetrics {
  scope: 'global'
  from: string
  to: string
  totalEvents: number
  logins: number
  activeUsers: number
  folders: number
  clients: number
  revisions: number
}

export interface UserMetrics {
  scope: 'user'
  authUserId: string
  from: string
  to: string
  /** All-time, not range-limited: "quiet this month" and "never here" are different answers. */
  lastSeen: string | null
  logins: number
  logouts: number
  folders: number
  categories: number
  clients: number
  revisions: number
  clientsCreated: number
  revisionsCreated: number
  latestRevisions: number
  subTotal: number
  gst: number
  grandTotal: number
}

export interface DateRange {
  from?: string
  to?: string
}

export interface AuthEventQuery extends DateRange {
  limit?: number
  cursor?: string
  authUserId?: string
  event?: 'login' | 'logout'
}

/** Shapes shared with the owner-scoped services, re-declared here to keep the admin read path independent. */
export interface AdminFolder {
  id: string
  name: string
}

export interface AdminCategory {
  id: string
  folderId: string
  name: string
  description: string
  quote: Quote
}

export interface AdminClient {
  id: string
  categoryId: string
  name: string
  email: string
  contactNumber: string
}

export interface AdminRevisionSummary {
  id: string
  clientId: string
  label: string
  position: number
}

export interface AdminRevision extends AdminRevisionSummary {
  quote: Quote
}

function query(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

/** Records the current user's own sign-in/sign-out; the backend derives who from the JWT. */
export function recordAuthEvent(event: 'login' | 'logout'): Promise<void> {
  return api.post<void>('/api/auth-events', { event })
}

// --- admin only (403 for everyone else) ---

export function fetchAdminUsers(options: { refresh?: boolean } = {}): Promise<{ users: AdminUser[] }> {
  return api.get<{ users: AdminUser[] }>(`/api/admin/users${query({ refresh: options.refresh ? '1' : undefined })}`)
}

export function fetchGlobalMetrics(range: DateRange = {}): Promise<GlobalMetrics> {
  return api.get<GlobalMetrics>(`/api/admin/metrics${query({ ...range })}`)
}

export function fetchUserMetrics(authUserId: string, range: DateRange = {}): Promise<UserMetrics> {
  return api.get<UserMetrics>(`/api/admin/metrics${query({ authUserId, ...range })}`)
}

export function fetchAuthEvents(params: AuthEventQuery = {}): Promise<AuthEventPage> {
  return api.get<AuthEventPage>(`/api/admin/auth-events${query({ ...params })}`)
}

// Read-only drill-down. There is no write counterpart to any of these — the
// backend has no route that accepts another user's id for a mutation.

export function fetchUserFolders(userId: string): Promise<AdminFolder[]> {
  return api.get<AdminFolder[]>(`/api/admin/users/${userId}/folders`)
}

export function fetchUserCategories(userId: string, folderId: string): Promise<AdminCategory[]> {
  return api.get<AdminCategory[]>(`/api/admin/users/${userId}/folders/${folderId}/categories`)
}

export function fetchUserClients(userId: string, categoryId: string): Promise<AdminClient[]> {
  return api.get<AdminClient[]>(`/api/admin/users/${userId}/categories/${categoryId}/clients`)
}

export function fetchUserRevisions(userId: string, clientId: string): Promise<AdminRevisionSummary[]> {
  return api.get<AdminRevisionSummary[]>(`/api/admin/users/${userId}/clients/${clientId}/revisions`)
}

export function fetchUserRevision(userId: string, revisionId: string): Promise<AdminRevision> {
  return api.get<AdminRevision>(`/api/admin/users/${userId}/revisions/${revisionId}`)
}
