import type { UpdateTaskArgs } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool'
import { createMoveTaskArgs } from '../tool-helpers'
import { DurationParseError, parseDuration } from '../utils/duration-parser'

const TasksSchema = z.object({
    id: z.string().min(1).describe('The ID of the task to update.'),
    content: z.string().optional().describe('The new content of the task.'),
    description: z.string().optional().describe('The new description of the task.'),
    projectId: z.string().optional().describe('The new project ID for the task.'),
    sectionId: z.string().optional().describe('The new section ID for the task.'),
    parentId: z.string().optional().describe('The new parent task ID (for subtasks).'),
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

const ArgsSchema = {
    tasks: z.array(TasksSchema).min(1).describe('The tasks to update.'),
}

const tasksUpdateMultiple = {
    name: 'tasks-update-multiple',
    description: 'Update multiple existing tasks with new values.',
    parameters: ArgsSchema,
    async execute(args, client) {
        const { tasks } = args
        const updateTasksPromises = tasks.map(async (task) => {
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
        return await Promise.all(updateTasksPromises)
    },
} satisfies TodoistTool<typeof ArgsSchema>

export { tasksUpdateMultiple }
