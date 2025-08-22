import type { AddTaskArgs, Task, TodoistApi } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { mapTask } from '../tool-helpers.js'
import { DurationParseError, parseDuration } from '../utils/duration-parser.js'
import {
    generateTaskNextSteps,
    getDateString,
    summarizeTaskOperation,
} from '../utils/response-builders.js'
import { ToolNames } from '../utils/tool-names.js'

const TaskSchema = z.object({
    content: z.string().min(1).describe('The content of the task to create.'),
    description: z.string().optional().describe('The description of the task.'),
    priority: z.number().int().min(1).max(4).optional().describe('The priority of the task (1-4).'),
    dueString: z.string().optional().describe('The due date for the task, in natural language.'),
    duration: z
        .string()
        .optional()
        .describe(
            'The duration of the task. Use format: "2h" (hours), "90m" (minutes), "2h30m" (combined), or "1.5h" (decimal hours). Max 24h.',
        ),
    projectId: z.string().optional().describe('The project ID to add this task to.'),
    sectionId: z.string().optional().describe('The section ID to add this task to.'),
    parentId: z.string().optional().describe('The parent task ID (for subtasks).'),
})

const ArgsSchema = {
    tasks: z.array(TaskSchema).min(1).describe('The array of tasks to add.'),
}

const addTasks = {
    name: ToolNames.ADD_TASKS,
    description: 'Add one or more tasks to a project, section, or parent.',
    parameters: ArgsSchema,
    async execute({ tasks }, client) {
        const addTaskPromises = tasks.map((task) => processTask(task, client))
        const newTasks = await Promise.all(addTaskPromises)
        const mappedTasks = newTasks.map(mapTask)

        const textContent = generateTextContent({
            tasks: mappedTasks,
            args: { tasks },
        })

        return getToolOutput({
            textContent,
            structuredContent: {
                tasks: mappedTasks,
                totalCount: mappedTasks.length,
            },
        })
    },
} satisfies TodoistTool<typeof ArgsSchema>

async function processTask(task: z.infer<typeof TaskSchema>, client: TodoistApi): Promise<Task> {
    const { duration: durationStr, projectId, sectionId, parentId, ...otherTaskArgs } = task

    let taskArgs: AddTaskArgs = { ...otherTaskArgs, projectId, sectionId, parentId }

    // Parse duration if provided
    if (durationStr) {
        try {
            const { minutes } = parseDuration(durationStr)
            taskArgs = {
                ...taskArgs,
                duration: minutes,
                durationUnit: 'minute',
            }
        } catch (error) {
            if (error instanceof DurationParseError) {
                throw new Error(`Task "${task.content}": ${error.message}`)
            }
            throw error
        }
    }

    return await client.addTask(taskArgs)
}

function generateTextContent({
    tasks,
    args,
}: {
    tasks: ReturnType<typeof mapTask>[]
    args: z.infer<z.ZodObject<typeof ArgsSchema>>
}) {
    // Get context for smart next steps
    const todayStr = getDateString()
    const hasToday = tasks.some((task) => task.dueDate === todayStr)

    // Generate context description for mixed contexts
    const contextTypes = new Set<string>()
    for (const task of args.tasks) {
        if (task.projectId) contextTypes.add('projects')
        else if (task.sectionId) contextTypes.add('sections')
        else if (task.parentId) contextTypes.add('subtasks')
        else contextTypes.add('inbox')
    }

    let projectContext = ''
    if (contextTypes.size === 1) {
        const contextType = Array.from(contextTypes)[0]
        projectContext = contextType === 'inbox' ? '' : `to ${contextType}`
    } else if (contextTypes.size > 1) {
        projectContext = 'to multiple contexts'
    }

    return summarizeTaskOperation('Added', tasks, {
        context: projectContext,
        nextSteps: generateTaskNextSteps('added', tasks, { hasToday }),
        showDetails: true,
    })
}

export { addTasks }
