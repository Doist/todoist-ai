import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool'

const ArgsSchema = {
    id: z.string().min(1).describe('The ID of the task to delete.'),
}

const tasksDeleteOne = {
    name: 'tasks-delete-one',
    description: 'Delete a task by its ID.',
    parameters: ArgsSchema,
    async execute(args, client) {
        await client.deleteTask(args.id)
        return { success: true }
    },
} satisfies TodoistTool<typeof ArgsSchema>

export { tasksDeleteOne }
