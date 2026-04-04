/**
 * Todoist API client — wrapper over the REST v2 + API v1 (formerly Sync v9) APIs.
 *
 * Todoist deprecated their sync/v9 endpoints in 2025. The replacement is /api/v1/
 * for previously-sync-only endpoints (completed tasks, stats, user info).
 *
 * The REST v2 tasks endpoint now returns a paginated object { results, next_cursor }
 * instead of a plain array when using filter queries, so we unwrap it explicitly.
 */

const API_KEY = process.env.TODOIST_API_KEY!
const REST_BASE = 'https://api.todoist.com/api/v2'
const API_V1_BASE = 'https://api.todoist.com/api/v1'

function restHeaders() {
  return {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  }
}

/** Unwrap either a plain array or a paginated { results: T[] } response. */
function unwrapArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object' && 'results' in data && Array.isArray((data as { results: unknown }).results)) {
    return (data as { results: T[] }).results
  }
  return []
}

async function restGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${REST_BASE}${path}`)
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  }
  const res = await fetch(url.toString(), { headers: restHeaders(), cache: 'no-store' })
  if (!res.ok) throw new Error(`Todoist REST error ${res.status}: ${await res.text()}`)
  return res.json() as Promise<T>
}

async function v1Get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_V1_BASE}${path}`)
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  }
  const res = await fetch(url.toString(), { headers: restHeaders(), cache: 'no-store' })
  if (!res.ok) throw new Error(`Todoist API v1 error ${res.status}: ${await res.text()}`)
  return res.json() as Promise<T>
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TodoistTask {
  id: string
  content: string
  description: string
  project_id: string
  section_id: string | null
  parent_id: string | null
  priority: number // 1=p4, 2=p3, 3=p2, 4=p1
  due: { date: string; datetime?: string; string: string; is_recurring: boolean } | null
  deadline: { date: string } | null
  duration: { amount: number; unit: 'minute' | 'day' } | null
  labels: string[]
  order: number
  is_completed: boolean
  created_at: string
}

export interface TodoistCompletedTask {
  id: string
  task_id: string
  content: string
  project_id: string
  completed_at: string
  due?: { date: string }
}

export interface TodoistProject {
  id: string
  name: string
  parent_id: string | null
  color: string
  is_favorite: boolean
  is_inbox_project: boolean
}

export interface TodoistStats {
  days_items: Array<{ date: string; total_completed: number; items: unknown[] }>
  week_items: Array<{ date: string; total_completed: number; items: unknown[] }>
  karma: number
  karma_trend: string
  goals: {
    daily_goal: number
    weekly_goal: number
    ignore_days: number[]
  }
}

// Normalised priority string (p1–p4)
export function normalizePriority(apiPriority: number): 'p1' | 'p2' | 'p3' | 'p4' {
  switch (apiPriority) {
    case 4: return 'p1'
    case 3: return 'p2'
    case 2: return 'p3'
    default: return 'p4'
  }
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function getActiveTasks(filter?: string): Promise<TodoistTask[]> {
  const params: Record<string, string> = {}
  if (filter) params.filter = filter
  // REST v2 tasks may return { results: [...] } with cursor pagination
  const data = await restGet<unknown>('/tasks', params)
  return unwrapArray<TodoistTask>(data)
}

export async function getTodayTasks(): Promise<TodoistTask[]> {
  return getActiveTasks('today | overdue')
}

export async function getOverdueTasks(): Promise<TodoistTask[]> {
  return getActiveTasks('overdue')
}

export async function getProjects(): Promise<TodoistProject[]> {
  const data = await restGet<unknown>('/projects')
  return unwrapArray<TodoistProject>(data)
}

/** Returns completed tasks since `sinceDate` (ISO string).
 *  Uses /api/v1/ — the replacement for the deprecated sync/v9 endpoint. */
export async function getCompletedTasks(sinceDate: string): Promise<TodoistCompletedTask[]> {
  const data = await v1Get<{ items: TodoistCompletedTask[] }>(
    '/items/completed/get_all',
    { since: sinceDate, limit: '200' },
  )
  return data.items ?? []
}

/** Uses /api/v1/ — the replacement for the deprecated sync/v9 endpoint. */
export async function getProductivityStats(): Promise<TodoistStats> {
  return v1Get<TodoistStats>('/user/productivity_stats')
}

export async function getUserInfo(): Promise<{ full_name: string; email: string; timezone: string; karma: number }> {
  const data = await v1Get<{ user: { full_name: string; email: string; timezone: string; karma: number } }>(
    '/sync',
    { resource_types: '["user"]' },
  )
  return data.user
}

/** Update a task (partial update). */
export async function updateTask(taskId: string, updates: Partial<Pick<TodoistTask, 'priority' | 'due' | 'duration' | 'labels'>>): Promise<void> {
  await fetch(`${REST_BASE}/tasks/${taskId}`, {
    method: 'POST',
    headers: restHeaders(),
    body: JSON.stringify(updates),
  })
}
