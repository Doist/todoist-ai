import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool.js'
import { createMoveTaskArgs } from '../tool-helpers.js'

const ArgsSchema = {
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
}

const tasksUpdateOne = {
    name: 'tasks-update-one',
    description: 'Update an existing task with new values.',
    parameters: ArgsSchema,
    async execute(args, client) {
        const { id, projectId, sectionId, parentId, ...updateArgs } = args

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
    },
} satisfies TodoistTool<typeof ArgsSchema>

export { tasksUpdateOne }
