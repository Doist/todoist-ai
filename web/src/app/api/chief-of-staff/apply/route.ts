import { NextResponse, type NextRequest } from 'next/server'
import type { TaskSuggestion } from '../route'

const API_KEY = process.env.TODOIST_API_KEY!
const REST_BASE = 'https://api.todoist.com/api/v1'

function headers() {
  return { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }
}

async function deleteTask(id: string) {
  await fetch(`${REST_BASE}/tasks/${id}`, { method: 'DELETE', headers: headers() })
}

async function closeTask(id: string) {
  await fetch(`${REST_BASE}/tasks/${id}/close`, { method: 'POST', headers: headers() })
}

async function rescheduleTask(id: string, dueDate: string) {
  await fetch(`${REST_BASE}/tasks/${id}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ due_date: dueDate }),
  })
}

export async function POST(req: NextRequest) {
  try {
    const { suggestions }: { suggestions: TaskSuggestion[] } = await req.json()
    let applied = 0
    const errors: string[] = []

    for (const s of suggestions) {
      try {
        switch (s.action) {
          case 'delete':
            await deleteTask(s.taskId)
            applied++
            break
          case 'archive':
            // Close the task (marks as completed = archived in Todoist)
            await closeTask(s.taskId)
            applied++
            break
          case 'reschedule_next_week':
          case 'reschedule_someday':
            if (s.newDueDate) {
              await rescheduleTask(s.taskId, s.newDueDate)
              applied++
            }
            break
          case 'keep':
            // No-op
            applied++
            break
          case 'break_into_subtasks':
            // No-op via API (user needs to do this manually or we extend later)
            applied++
            break
        }
      } catch (e) {
        errors.push(`${s.content}: ${e instanceof Error ? e.message : 'failed'}`)
      }
    }

    return NextResponse.json({ applied, errors })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to apply actions' },
      { status: 500 },
    )
  }
}
