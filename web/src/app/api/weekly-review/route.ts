import { NextResponse } from 'next/server'
import { getCompletedTasks, getOverdueTasks, getProjects, getProductivityStats, normalizePriority } from '@/lib/todoist'
import { generateJSON } from '@/lib/ai'
import { format, subDays, startOfWeek } from 'date-fns'

export interface WeeklyReport {
  weekStart: string
  weekEnd: string
  summary: string
  stats: {
    completed: number
    overdue: number
    completionRate: string
    mostActiveProject: string
    karmaScore: number
    dailyGoal: number
    weeklyGoal: number
  }
  wins: string[]
  overdueAnalysis: string
  projectHighlights: Array<{
    name: string
    completed: number
    overdue: number
    status: 'on_track' | 'needs_attention' | 'blocked'
  }>
  focusAreas: Array<{
    title: string
    reason: string
    suggestedTasks?: string[]
  }>
  insights: string[]
  motivationalNote: string
}

export async function GET() {
  try {
    const today = new Date()
    const weekStart = subDays(today, 7)
    const weekStartStr = format(weekStart, "yyyy-MM-dd'T'00:00:00")
    const todayStr = format(today, 'yyyy-MM-dd')
    const weekStartLabel = format(weekStart, 'MMM d')
    const weekEndLabel = format(today, 'MMM d, yyyy')

    const [completedItems, overdueTasks, projects, stats] = await Promise.all([
      getCompletedTasks(weekStartStr),
      getOverdueTasks(),
      getProjects(),
      getProductivityStats(),
    ])

    const projectMap = new Map(projects.map((p) => [p.id, p.name]))

    // Count completions per project
    const completedByProject = new Map<string, number>()
    for (const item of completedItems) {
      const name = projectMap.get(item.projectId) ?? 'Inbox'
      completedByProject.set(name, (completedByProject.get(name) ?? 0) + 1)
    }

    // Count overdue per project
    const overdueByProject = new Map<string, number>()
    for (const task of overdueTasks) {
      const name = projectMap.get(task.projectId) ?? 'Inbox'
      overdueByProject.set(name, (overdueByProject.get(name) ?? 0) + 1)
    }

    const allProjectNames = new Set(
      Array.from(completedByProject.keys()).concat(Array.from(overdueByProject.keys())),
    )
    const projectSummary = Array.from(allProjectNames).map((name) => ({
      name,
      completed: completedByProject.get(name) ?? 0,
      overdue: overdueByProject.get(name) ?? 0,
    }))

    const mostActiveProject =
      Array.from(completedByProject.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'None'

    const overdueEnriched = overdueTasks.slice(0, 30).map((t) => ({
      content: t.content,
      priority: normalizePriority(t.priority),
      dueDate: t.due?.date ?? null,
      project: projectMap.get(t.projectId) ?? 'Inbox',
      labels: t.labels,
    }))

    const recentCompleted = completedItems.slice(0, 50).map((t) => ({
      content: t.content,
      completedAt: t.completedAt,
      project: projectMap.get(t.projectId) ?? 'Inbox',
    }))

    const prompt = `You are a GTD (Getting Things Done) coach performing a weekly review. Be insightful, specific, and constructive.

Review period: ${weekStartLabel} – ${weekEndLabel}
Today: ${todayStr}

DATA:

Completed tasks (${completedItems.length} total, showing top 50):
${JSON.stringify(recentCompleted, null, 2)}

Overdue tasks (${overdueTasks.length} total, showing top 30):
${JSON.stringify(overdueEnriched, null, 2)}

Project breakdown:
${JSON.stringify(projectSummary, null, 2)}

Productivity stats:
- Karma score: ${stats.karma}
- Daily goal: ${stats.goals?.dailyGoal ?? 'N/A'} tasks/day
- Weekly goal: ${stats.goals?.weeklyGoal ?? 'N/A'} tasks/week
- Last 7 days completions: ${stats.daysItems?.slice(-7).map((d) => d.totalCompleted).join(', ') ?? 'N/A'}

Generate a GTD-style weekly review. Be specific and reference actual task names and projects where possible.

Return exactly this JSON:
{
  "weekStart": "${weekStartLabel}",
  "weekEnd": "${weekEndLabel}",
  "summary": "2–3 sentences summarising the week",
  "stats": {
    "completed": ${completedItems.length},
    "overdue": ${overdueTasks.length},
    "completionRate": "string like 75%",
    "mostActiveProject": "${mostActiveProject}",
    "karmaScore": ${stats.karma},
    "dailyGoal": ${stats.goals?.dailyGoal ?? 0},
    "weeklyGoal": ${stats.goals?.weeklyGoal ?? 0}
  },
  "wins": ["specific win 1", "specific win 2", "specific win 3"],
  "overdueAnalysis": "Honest 2–3 sentence analysis of overdue patterns and what they reveal",
  "projectHighlights": [
    { "name": "...", "completed": N, "overdue": N, "status": "on_track" | "needs_attention" | "blocked" }
  ],
  "focusAreas": [
    { "title": "...", "reason": "why this deserves focus next week", "suggestedTasks": ["..."] }
  ],
  "insights": ["behavioral insight 1", "insight 2", "insight 3"],
  "motivationalNote": "A specific, non-generic closing note based on the actual data"
}`

    const report = await generateJSON<WeeklyReport>(prompt)
    return NextResponse.json(report)
  } catch (error) {
    console.error('Weekly review error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate review' },
      { status: 500 },
    )
  }
}
