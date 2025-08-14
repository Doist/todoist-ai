import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool.js'
import { createMoveTaskArgs } from '../tool-helpers.js'

const TaskUpdateSchema = z.object({
    id: z.string().min(1).describe('The ID of the task to update.'),
    projectId: z.string().optional().describe('The new project ID for the task.'),
    sectionId: z.string().optional().describe('The new section ID for the task.'),
    parentId: z.string().optional().describe('The new parent task ID (for subtasks).'),
    order: z.number().optional().describe('The new order of the task within its parent/section.'),
})

const ArgsSchema = {
    tasks: z.array(TaskUpdateSchema).min(1).describe('Array of task updates to apply.'),
}

const tasksOrganizeMultiple = {
    name: 'tasks-organize-multiple',
    description: 'Organize multiple tasks (move, reorder, etc.) in bulk.',
    parameters: ArgsSchema,
    async execute(args, client) {
        const results = []

        // Process each task individually for move operations
        for (const update of args.tasks) {
            const { id, projectId, sectionId, parentId } = update
            if (!projectId && !sectionId && !parentId) {
                continue
            }

            // Create and validate move arguments using helper
            const moveArgs = createMoveTaskArgs(id, projectId, sectionId, parentId)

            // Move each task individually to avoid bulk operation issues
            const movedTasks = await client.moveTasks([id], moveArgs)
            results.push(...movedTasks)
        }

        return results
    },
} satisfies TodoistTool<typeof ArgsSchema>

export { tasksOrganizeMultiple }
