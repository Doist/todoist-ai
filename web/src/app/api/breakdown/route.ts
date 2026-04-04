import { NextResponse, type NextRequest } from 'next/server'
import { generateJSON } from '@/lib/ai'

const API_KEY = process.env.TODOIST_API_KEY!
const REST_BASE = 'https://api.todoist.com/api/v1'

interface BreakdownRequest {
  taskId: string
  content: string
  description?: string
  projectId: string
}

interface BreakdownResult {
  subtasks: Array<{ content: string; order: number }>
  reasoning: string
}

export interface BreakdownResponse {
  subtasks: Array<{ content: string; order: number }>
  reasoning: string
  created?: number
}

export async function POST(req: NextRequest) {
  try {
    const { taskId, content, description, projectId }: BreakdownRequest = await req.json()

    const prompt = `You are a GTD productivity coach. Break this vague task into 3–7 concrete, actionable subtasks. Each subtask should be completable in one sitting.

Task: "${content}"
${description ? `Context: "${description}"` : ''}

Rules:
- Start each subtask with an action verb (Write, Research, Schedule, Review, Send, Call, etc.)
- Be specific — avoid vague words like "finalize" or "handle"
- Order logically (prerequisite steps first)
- Max 7 subtasks; prefer 4–5 for most tasks

Return JSON:
{
  "subtasks": [
    { "content": "...", "order": 1 },
    { "content": "...", "order": 2 }
  ],
  "reasoning": "One sentence explaining the breakdown approach"
}`

    const result = await generateJSON<BreakdownResult>(prompt)
    return NextResponse.json({ subtasks: result.subtasks, reasoning: result.reasoning })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to break down task' },
      { status: 500 },
    )
  }
}

// Separate endpoint to actually create the subtasks after user confirms
export async function PUT(req: NextRequest) {
  try {
    const { taskId, projectId, subtasks }: {
      taskId: string
      projectId: string
      subtasks: Array<{ content: string; order: number }>
    } = await req.json()

    const created: string[] = []
    for (const subtask of subtasks) {
      const res = await fetch(`${REST_BASE}/tasks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: subtask.content,
          parentId: taskId,
          projectId,
          order: subtask.order,
        }),
      })
      if (res.ok) created.push(subtask.content)
    }

    return NextResponse.json({ created: created.length })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create subtasks' },
      { status: 500 },
    )
  }
}
