import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool'

const ArgsSchema = {
    ids: z.array(z.string().min(1)).min(1).describe('The IDs of the tasks to complete.'),
}

const tasksCompleteMultiple = {
    name: 'tasks-complete-multiple',
    description: 'Complete one or more tasks by their IDs.',
    parameters: ArgsSchema,
    async execute(args, client) {
        const completed: string[] = []
        for (const id of args.ids) {
            try {
                await client.closeTask(id)
                completed.push(id)
            } catch {
                // Ignore errors for individual tasks, continue with others
            }
        }
        return { success: true, completed }
    },
} satisfies TodoistTool<typeof ArgsSchema>

export { tasksCompleteMultiple }
