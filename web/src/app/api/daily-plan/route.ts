import { NextResponse } from 'next/server'
import { getTodayTasks, getProjects, normalizePriority, type TodoistTask } from '@/lib/todoist'
import { generateJSON } from '@/lib/ai'
import { format } from 'date-fns'

export interface TimeBlock {
  startTime: string
  endTime: string
  type: 'deep_work' | 'admin' | 'break' | 'meeting'
  title: string
  tasks: Array<{
    id: string
    content: string
    priority: 'p1' | 'p2' | 'p3' | 'p4'
    dueDate: string | null
    isOverdue: boolean
    durationMinutes: number | null
    labels: string[]
    projectName?: string
  }>
}

export interface DayPlan {
  date: string
  summary: string
  blocks: TimeBlock[]
  stats: {
    totalTasks: number
    deepWorkHours: number
    adminHours: number
    overdueCount: number
    highPriorityCount: number
  }
  motivationalNote: string
}

function estimateDuration(task: TodoistTask): number | null {
  if (task.duration) {
    return task.duration.unit === 'minute' ? task.duration.amount : task.duration.amount * 60 * 24
  }
  return null
}

function isOverdue(task: TodoistTask): boolean {
  if (!task.due) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(task.due.date)
  dueDate.setHours(0, 0, 0, 0)
  return dueDate < today
}

export async function GET() {
  try {
    const [tasks, projects] = await Promise.all([getTodayTasks(), getProjects()])

    const projectMap = new Map(projects.map((p) => [p.id, p.name]))
    const today = new Date()
    const todayStr = format(today, 'yyyy-MM-dd')
    const workStart = parseInt(process.env.WORK_START_HOUR ?? '9')
    const workEnd = parseInt(process.env.WORK_END_HOUR ?? '18')

    const enrichedTasks = tasks.map((t) => ({
      id: t.id,
      content: t.content,
      description: t.description,
      priority: normalizePriority(t.priority),
      dueDate: t.due?.date ?? null,
      deadlineDate: t.deadline?.date ?? null,
      isOverdue: isOverdue(t),
      durationMinutes: estimateDuration(t),
      labels: t.labels,
      projectName: projectMap.get(t.projectId) ?? 'Inbox',
    }))

    const overdueCount = enrichedTasks.filter((t) => t.isOverdue).length
    const highPriorityCount = enrichedTasks.filter((t) => t.priority === 'p1' || t.priority === 'p2').length

    const prompt = `You are an expert personal productivity coach and calendar optimizer.

Today's date: ${todayStr} (${format(today, 'EEEE')})
Work hours: ${workStart}:00 to ${workEnd}:00
Total tasks to schedule: ${enrichedTasks.length}

Tasks (JSON):
${JSON.stringify(enrichedTasks, null, 2)}

Create an optimized time-blocked schedule for today following these rules:
1. Schedule deep work (analytical, creative, writing tasks) in the MORNING — this is when cognitive energy is highest.
2. Group admin tasks (emails, quick replies, expense reports, scheduling) together into an "admin batch".
3. Include a lunch break around 13:00 (30 min).
4. Include a short break mid-morning (~10:30, 15 min) if work hours permit.
5. Prioritize p1 and p2 tasks first. Overdue tasks get priority over non-overdue.
6. If a task has a durationMinutes value, respect it. If not, estimate:
   - Simple admin tasks: 10–20 min
   - Writing/analysis: 60–90 min
   - Research tasks: 45–60 min
   - Quick tasks: 5–15 min
7. Don't schedule tasks beyond ${workEnd}:00.
8. If there are more tasks than time allows, note the overflow in the summary.
9. Use projectName and labels as context clues for task classification.

Return a JSON object exactly matching this TypeScript type:
{
  date: string,           // "${todayStr}"
  summary: string,        // 2–3 sentence overview of the day plan
  blocks: Array<{
    startTime: string,    // "09:00"
    endTime: string,      // "10:30"
    type: "deep_work" | "admin" | "break" | "meeting",
    title: string,        // e.g. "Deep Work — Strategy & Analysis"
    tasks: Array<{
      id: string,
      content: string,
      priority: "p1" | "p2" | "p3" | "p4",
      dueDate: string | null,
      isOverdue: boolean,
      durationMinutes: number | null,
      labels: string[],
      projectName?: string
    }>
  }>,
  stats: {
    totalTasks: number,
    deepWorkHours: number,
    adminHours: number,
    overdueCount: number,   // ${overdueCount}
    highPriorityCount: number  // ${highPriorityCount}
  },
  motivationalNote: string  // short, specific, non-generic motivational note based on today's tasks
}`

    const plan = await generateJSON<DayPlan>(prompt)
    return NextResponse.json(plan)
  } catch (error) {
    console.error('Daily plan error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate plan' },
      { status: 500 },
    )
  }
}
