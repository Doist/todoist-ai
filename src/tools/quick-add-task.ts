// Quick Add Task tool for Todoist MCP

import type { QuickAddTaskArgs, Task, TodoistApi } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { mapTask } from '../tool-helpers.js'
import { ToolNames } from '../utils/tool-names.js'

const QuickAddTaskSchema = z.object({
    text: z.string().min(1).describe('Write what the task is. This is required.'),
    note: z.string().optional().describe('Add a note to the task if you want.'),
    reminder: z.string().optional().describe('Set a reminder for the task if needed.'),
    autoReminder: z
        .boolean()
        .optional()
        .describe('If true, a default reminder is added when there is a due time.'),
    meta: z
        .boolean()
        .optional()
        .describe('If true, extra information about the task will be returned.'),
})

const ArgsSchema = {
    tasks: z.array(QuickAddTaskSchema).min(1).describe('List of tasks to quick add.'),
}

const quickAddTask = {
    name: ToolNames.QUICK_ADD_TASK,
    description: 'Quickly add one or more tasks using Todoist natural language input',
    parameters: ArgsSchema,

    async execute({ tasks }, client: TodoistApi) {
        const addTaskPromises = tasks.map((task) => processQuickAddTask(task, client))
        const newTasks = await Promise.all(addTaskPromises)
        const mappedTasks = newTasks.map(mapTask)

        return getToolOutput({
            textContent: generateTextContent(mappedTasks),
            structuredContent: {
                tasks: mappedTasks,
                totalCount: mappedTasks.length,
            },
        })
    },
} satisfies TodoistTool<typeof ArgsSchema>

async function processQuickAddTask(
    task: z.infer<typeof QuickAddTaskSchema>,
    client: TodoistApi,
): Promise<Task> {
    const apiArgs: QuickAddTaskArgs = { text: task.text }

    if (typeof task.note === 'string' && task.note.length > 0) apiArgs.note = task.note
    if (typeof task.reminder === 'string' && task.reminder.length > 0)
        apiArgs.reminder = task.reminder
    if (typeof task.autoReminder === 'boolean') apiArgs.autoReminder = task.autoReminder
    if (typeof task.meta === 'boolean') apiArgs.meta = task.meta

    return await client.quickAddTask(apiArgs)
}

function generateTextContent(tasks: ReturnType<typeof mapTask>[]) {
    const count = tasks.length
    const taskOrTasks = count === 1 ? 'task' : 'tasks'
    let summary = `Quick added ${count} ${taskOrTasks}.\n`
    summary += 'Tasks:\n'
    for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i]!
        summary += `  - ${t.content}`
        if (t.dueDate) summary += ` | due: ${t.dueDate}`
        if (t.priority && t.priority !== 1) summary += ` | priority: P${t.priority}`
        summary += '\n'
    }
    return summary
}

export { quickAddTask }
