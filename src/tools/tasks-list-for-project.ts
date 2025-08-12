import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool'
import { mapTask } from './shared'

const ArgsSchema = {
    projectId: z.string().min(1).describe('The ID of the project to get tasks for.'),
    limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(10)
        .describe('The maximum number of tasks to return.'),
    cursor: z
        .string()
        .optional()
        .describe(
            'The cursor to get the next page of tasks (cursor is obtained from the previous call to this tool, with the same parameters).',
        ),
}

const tasksListForProject = {
    name: 'tasks-list-for-project',
    description: 'Get tasks by project ID.',
    parameters: ArgsSchema,
    async execute(args, client) {
        const { projectId, limit, cursor } = args
        const { results, nextCursor } = await client.getTasks({
            projectId,
            limit,
            cursor: cursor ?? null,
        })
        return {
            tasks: results.map(mapTask),
            nextCursor,
        }
    },
} satisfies TodoistTool<typeof ArgsSchema>

export { tasksListForProject }
