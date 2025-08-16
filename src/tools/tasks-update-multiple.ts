import type { Task, UpdateTaskArgs } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { createMoveTaskArgs, mapTask } from '../tool-helpers.js'
import { DurationParseError, parseDuration } from '../utils/duration-parser.js'
import { summarizeTaskOperation } from '../utils/response-builders.js'
import { TOOL_NAMES } from '../utils/tool-names.js'

const TasksUpdateSchema = z.object({
    id: z.string().min(1).describe('The ID of the task to update.'),
    content: z.string().optional().describe('The new content of the task.'),
    description: z.string().optional().describe('The new description of the task.'),
    projectId: z.string().optional().describe('The new project ID for the task.'),
    sectionId: z.string().optional().describe('The new section ID for the task.'),
    parentId: z.string().optional().describe('The new parent task ID (for subtasks).'),
    order: z.number().optional().describe('The new order of the task within its parent/section.'),
    priority: z
        .number()
        .int()
        .min(1)
        .max(4)
        .optional()
        .describe('The new priority of the task (1-4).'),
    dueString: z
        .string()
        .optional()
        .describe("The new due date for the task, in natural language (e.g., 'tomorrow at 5pm')."),
    duration: z
        .string()
        .optional()
        .describe(
            'The duration of the task. Use format: "2h" (hours), "90m" (minutes), "2h30m" (combined), or "1.5h" (decimal hours). Max 24h.',
        ),
})

type TaskUpdate = z.infer<typeof TasksUpdateSchema>

const ArgsSchema = {
    tasks: z.array(TasksUpdateSchema).min(1).describe('The tasks to update.'),
}

const tasksUpdateMultiple = {
    name: TOOL_NAMES.TASKS_UPDATE_MULTIPLE,
    description: 'Update multiple existing tasks with new values.',
    parameters: ArgsSchema,
    async execute(args, client) {
        const { tasks } = args
        const updateTasksPromises = tasks.map(async (task) => {
            if (!hasUpdatesToMake(task)) {
                return undefined
            }

            const {
                id,
                projectId,
                sectionId,
                parentId,
                duration: durationStr,
                ...otherUpdateArgs
            } = task

            let updateArgs: UpdateTaskArgs = { ...otherUpdateArgs }

            // Parse duration if provided
            if (durationStr) {
                try {
                    const { minutes } = parseDuration(durationStr)
                    updateArgs = {
                        ...updateArgs,
                        duration: minutes,
                        durationUnit: 'minute',
                    }
                } catch (error) {
                    if (error instanceof DurationParseError) {
                        throw new Error(`Task ${id}: ${error.message}`)
                    }
                    throw error
                }
            }

            // If no move parameters are provided, use updateTask without moveTasks
            if (!projectId && !sectionId && !parentId) {
                return await client.updateTask(id, updateArgs)
            }

            const moveArgs = createMoveTaskArgs(id, projectId, sectionId, parentId)
            const movedTasks = await client.moveTasks([id], moveArgs)

            if (Object.keys(updateArgs).length > 0) {
                return await client.updateTask(id, updateArgs)
            }

            return movedTasks[0]
        })
        const updatedTasks = (await Promise.all(updateTasksPromises)).filter(
            (task): task is Task => task !== undefined,
        )

        const mappedTasks = updatedTasks.map(mapTask)

        const textContent = generateTextContent({
            tasks: mappedTasks,
            args,
        })

        return getToolOutput({
            textContent,
            structuredContent: {
                tasks: mappedTasks,
                totalCount: mappedTasks.length,
                updatedTaskIds: updatedTasks.map((task) => task.id),
                appliedOperations: {
                    updateCount: mappedTasks.length,
                    skippedCount: tasks.length - mappedTasks.length,
                },
            },
        })
    },
} satisfies TodoistTool<typeof ArgsSchema>

function generateTextContent({
    tasks,
    args,
}: {
    tasks: ReturnType<typeof mapTask>[]
    args: z.infer<z.ZodObject<typeof ArgsSchema>>
}) {
    const totalRequested = args.tasks.length
    const actuallyUpdated = tasks.length
    const skipped = totalRequested - actuallyUpdated

    let context = ''
    if (skipped > 0) {
        context = ` (${skipped} skipped - no changes)`
    }

    const nextSteps: string[] = []
    if (tasks.length > 0) {
        nextSteps.push('Use tasks-list-by-date to see your updated schedule')
        nextSteps.push('Use overview to see updated project organization')
    } else {
        nextSteps.push('Use tasks-list-by-date to see current tasks')
    }

    return summarizeTaskOperation('Updated', tasks, {
        context,
        nextSteps,
        showDetails: tasks.length <= 5,
    })
}

function hasUpdatesToMake({ id, ...otherUpdateArgs }: TaskUpdate) {
    return Object.keys(otherUpdateArgs).length > 0
}

export { tasksUpdateMultiple }
