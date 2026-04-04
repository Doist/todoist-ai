import { NextResponse } from 'next/server'
import { getActiveTasks, getProjects, normalizePriority } from '@/lib/todoist'
import { generateJSON } from '@/lib/ai'
import { differenceInDays, parseISO } from 'date-fns'
import { format } from 'date-fns'

export type EntropyAction = 'delete' | 'rewrite' | 'add_due_date' | 'break_into_subtasks' | 'move_to_someday'

export interface EntropyTask {
  taskId: string
  content: string
  projectName: string
  entropyScore: number       // 1–10, 10 = most entropic
  signals: string[]          // human-readable reasons (e.g. "45 days old", "no due date")
  suggestedAction: EntropyAction
  rewriteSuggestion?: string // only when suggestedAction === 'rewrite'
}

export interface EntropyResult {
  summary: string
  totalScanned: number
  highEntropyTasks: EntropyTask[]
  cleanTasks: number
  insights: string[]
}

export async function GET() {
  try {
    const [tasks, projects] = await Promise.all([getActiveTasks(), getProjects()])
    const projectMap = new Map(projects.map((p) => [p.id, p.name]))
    const today = new Date()

    const enriched = tasks.map((t) => ({
      id: t.id,
      content: t.content,
      daysOld: differenceInDays(today, parseISO(t.createdAt)),
      hasNoDueDate: !t.due,
      hasShortContent: t.content.split(' ').length <= 2,
      hasNoDescription: !t.description || t.description.trim() === '',
      priority: normalizePriority(t.priority),
      projectName: projectMap.get(t.projectId) ?? 'Inbox',
      labels: t.labels,
    }))

    // Only send tasks with at least one entropy signal to the AI
    const candidates = enriched
      .filter((t) => t.daysOld > 30 || t.hasNoDueDate || t.hasShortContent)
      .slice(0, 80)

    const prompt = `You are a personal productivity coach performing a "task entropy audit."

Entropy = tasks that exist in the system but are not actively being worked on and are making the system harder to navigate.

Today: ${format(today, 'yyyy-MM-dd')}
Total active tasks: ${tasks.length}
Candidate tasks with entropy signals (${candidates.length}):
${JSON.stringify(candidates, null, 2)}

For each task, assess:
- Entropy score (1–10): how problematic is this task's presence in the list?
- Signals: what specific entropy indicators does it have? (e.g., "45 days old", "no due date", "single word")
- Suggested action:
  - "delete": clearly obsolete or irrelevant
  - "rewrite": content is too vague — provide a specific rewriteSuggestion
  - "add_due_date": good task but drifting with no deadline
  - "break_into_subtasks": too complex for a single task
  - "move_to_someday": valid idea but not actionable now

Only include tasks with entropy score >= 6. Focus on the most impactful ones.

Return JSON exactly:
{
  "summary": "2-sentence overall assessment of the task list health",
  "totalScanned": ${candidates.length},
  "highEntropyTasks": [
    {
      "taskId": "...",
      "content": "...",
      "projectName": "...",
      "entropyScore": 8,
      "signals": ["45 days old", "no due date", "vague 1-word content"],
      "suggestedAction": "rewrite",
      "rewriteSuggestion": "Research Q3 ETF rebalancing options and list 3 candidates by Friday"
    }
  ],
  "cleanTasks": ${tasks.length - candidates.length},
  "insights": ["behavioral pattern insight 1", "insight 2", "insight 3"]
}`

    const result = await generateJSON<EntropyResult>(prompt)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Entropy scan error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to scan for entropy' },
      { status: 500 },
    )
  }
}
