import { NextResponse } from 'next/server'
import { getActiveTasks, getProjects, normalizePriority, type TodoistTask } from '@/lib/todoist'
import { generateJSON } from '@/lib/ai'
import { format, subDays, parseISO, differenceInDays } from 'date-fns'

export type SuggestionAction = 'delete' | 'archive' | 'reschedule_next_week' | 'reschedule_someday' | 'break_into_subtasks' | 'keep'

export interface TaskSuggestion {
  taskId: string
  content: string
  projectName: string
  priority: string
  dueDate: string | null
  daysSinceDue: number | null
  action: SuggestionAction
  reason: string
  newDueDate?: string // for reschedule actions
}

export interface ChiefOfStaffReport {
  summary: string
  totalAnalyzed: number
  suggestions: TaskSuggestion[]
  overdueCluster: string // AI insight on overdue patterns
  duplicatesFound: Array<{ task1: string; task2: string; reason: string }>
  quickWins: string[] // tasks that could be done in <5 min
  motivationalNote: string
}

export async function GET() {
  try {
    const [tasks, projects] = await Promise.all([getActiveTasks(), getProjects()])
    const projectMap = new Map(projects.map((p) => [p.id, p.name]))
    const today = new Date()
    const twoWeeksAgo = subDays(today, 14)

    // Find stale/overdue tasks
    const enriched = tasks.map((t) => {
      const dueDate = t.due?.date ?? null
      const daysSinceDue = dueDate
        ? differenceInDays(today, parseISO(dueDate))
        : null
      return {
        id: t.id,
        content: t.content,
        description: t.description,
        priority: normalizePriority(t.priority),
        dueDate,
        daysSinceDue,
        isOverdue: daysSinceDue !== null && daysSinceDue > 0,
        createdAt: t.createdAt,
        labels: t.labels,
        projectName: projectMap.get(t.projectId) ?? 'Inbox',
      }
    })

    // Send to AI for triage recommendations
    // Limit to tasks that need attention (overdue or very old)
    const tasksNeedingAttention = enriched
      .filter((t) => t.isOverdue || (t.daysSinceDue !== null && t.daysSinceDue > 7))
      .slice(0, 60)

    const prompt = `You are a personal Chief of Staff performing a life admin triage session.
Your job is to help the user get their Todoist under control — no task should be ignored indefinitely.

Today: ${format(today, 'yyyy-MM-dd')}

Tasks needing attention (${tasksNeedingAttention.length} total):
${JSON.stringify(tasksNeedingAttention, null, 2)}

All tasks context (${enriched.length} total active tasks):
${JSON.stringify(enriched.slice(0, 100).map((t) => ({ content: t.content, project: t.projectName, priority: t.priority, dueDate: t.dueDate })), null, 2)}

For each task needing attention, recommend ONE action:
- "delete": Task is clearly obsolete (time-sensitive info that's passed, duplicate effort, no longer relevant)
- "archive": Task had value but its window has passed; keep for records but not active
- "reschedule_next_week": Task is still relevant and should be done soon
- "reschedule_someday": Task is good but not urgent — put in a "Someday/Maybe" bucket
- "break_into_subtasks": Task is too vague or big — needs breakdown to be actionable
- "keep": Task is fine as-is

Also identify:
1. Patterns in why tasks are overdue (procrastination signals)
2. Any apparent duplicate tasks
3. "Quick wins" — tasks that could be done in under 5 minutes

Next week's Monday date: ${format(subDays(today, today.getDay() - 8), 'yyyy-MM-dd')}

Return exactly this JSON:
{
  "summary": "2–3 sentence overview of the task health situation",
  "totalAnalyzed": ${tasksNeedingAttention.length},
  "suggestions": [
    {
      "taskId": "...",
      "content": "...",
      "projectName": "...",
      "priority": "p1|p2|p3|p4",
      "dueDate": "...|null",
      "daysSinceDue": N|null,
      "action": "delete|archive|reschedule_next_week|reschedule_someday|break_into_subtasks|keep",
      "reason": "specific reason for this recommendation",
      "newDueDate": "yyyy-MM-dd (only for reschedule actions)"
    }
  ],
  "overdueCluster": "Insight about the pattern of overdue tasks",
  "duplicatesFound": [
    { "task1": "...", "task2": "...", "reason": "why they appear to be duplicates" }
  ],
  "quickWins": ["task content that could be done in <5 min"],
  "motivationalNote": "Honest, specific note about the task situation"
}`

    const report = await generateJSON<ChiefOfStaffReport>(prompt)
    return NextResponse.json(report)
  } catch (error) {
    console.error('Chief of Staff error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate report' },
      { status: 500 },
    )
  }
}
