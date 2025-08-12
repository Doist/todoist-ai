import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool'

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
        for (const update of args.tasks) {
            const { id, ...updateArgs } = update
            results.push(await client.updateTask(id, updateArgs))
        }
        return results
    },
} satisfies TodoistTool<typeof ArgsSchema>

export { tasksOrganizeMultiple }
