/**
 * Todoist API client — all endpoints are on /api/v1/ (the official v1 REST API).
 *
 * Correct endpoint paths (verified from @doist/todoist-sdk v8 source):
 *   Active tasks:      GET /api/v1/tasks
 *   Projects:          GET /api/v1/projects
 *   Completed tasks:   GET /api/v1/tasks/completed/by_completion_date
 *   Productivity stats:GET /api/v1/tasks/completed/stats
 *
 * Field naming: the v1 API uses camelCase (completedAt, projectId, daysItems, dailyGoal).
 * The old sync/v9 used snake_case — that API is gone (410).
 *
 * The /tasks endpoint returns { results: T[], nextCursor } when a filter is used,
 * or a plain array otherwise. unwrapArray() handles both.
 */

const API_KEY = process.env.TODOIST_API_KEY!
const BASE = 'https://api.todoist.com/api/v1'

function headers() {
  return {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  }
}

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}${path}`)
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  }
  const res = await fetch(url.toString(), { headers: headers(), cache: 'no-store' })
  if (!res.ok) throw new Error(`Todoist error ${res.status} ${path}: ${await res.text()}`)
  return res.json() as Promise<T>
}

/** Unwrap either a plain array or { results: T[] } paginated response. */
function unwrapArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object' && 'results' in data) {
    const r = (data as { results: unknown }).results
    if (Array.isArray(r)) return r as T[]
  }
  return []
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TodoistTask {
  id: string
  content: string
  description: string
  projectId: string
  sectionId: string | null
  parentId: string | null
  priority: number   // 1=p4 (lowest) … 4=p1 (highest)
  due: { date: string; datetime?: string; string: string; isRecurring: boolean } | null
  deadline: { date: string } | null
  duration: { amount: number; unit: 'minute' | 'day' } | null
  labels: string[]
  order: number
  isCompleted: boolean
  completedAt: string | null
  createdAt: string
}

export interface TodoistCompletedTask {
  id: string
  content: string
  projectId: string
  completedAt: string
}

export interface TodoistProject {
  id: string
  name: string
  parentId: string | null
  color: string
  isFavorite: boolean
  isInboxProject: boolean
}

export interface TodoistStats {
  karma: number
  karmaTrend: string
  daysItems: Array<{ date: string; totalCompleted: number }>
  weekItems: Array<{ from: string; to: string; totalCompleted: number }>
  goals: {
    dailyGoal: number
    weeklyGoal: number
    ignoreDays: number[]
  }
}

/** Convert API priority number → readable string (p1 = most urgent). */
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
  const data = await get<unknown>('/tasks', params)
  return unwrapArray<TodoistTask>(data)
}

export async function getTodayTasks(): Promise<TodoistTask[]> {
  return getActiveTasks('today | overdue')
}

export async function getOverdueTasks(): Promise<TodoistTask[]> {
  return getActiveTasks('overdue')
}

export async function getProjects(): Promise<TodoistProject[]> {
  const data = await get<unknown>('/projects')
  return unwrapArray<TodoistProject>(data)
}

/** Completed tasks since `sinceDate` (ISO datetime string). */
export async function getCompletedTasks(sinceDate: string): Promise<TodoistCompletedTask[]> {
  const data = await get<{ items: TodoistCompletedTask[] }>(
    '/tasks/completed/by_completion_date',
    { since: sinceDate, limit: '200' },
  )
  return data.items ?? []
}

/** Karma, goals, and daily/weekly completion counts. */
export async function getProductivityStats(): Promise<TodoistStats> {
  return get<TodoistStats>('/tasks/completed/stats')
}

/** Update a task (partial). */
export async function updateTask(
  taskId: string,
  updates: { dueDate?: string; priority?: number; labels?: string[] },
): Promise<void> {
  await fetch(`${BASE}/tasks/${taskId}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(updates),
  })
}

/** Delete a task. */
export async function deleteTask(taskId: string): Promise<void> {
  await fetch(`${BASE}/tasks/${taskId}`, { method: 'DELETE', headers: headers() })
}

/** Close (complete) a task. */
export async function closeTask(taskId: string): Promise<void> {
  await fetch(`${BASE}/tasks/${taskId}/close`, { method: 'POST', headers: headers() })
}
