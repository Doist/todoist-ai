import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool'
import { getTasksByFilter } from './shared'

const ArgsSchema = {
    limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(10)
        .describe('The maximum number of overdue tasks to return.'),
    cursor: z
        .string()
        .optional()
        .describe(
            'The cursor to get the next page of overdue tasks (cursor is obtained from the previous call to this tool, with the same parameters).',
        ),
}

const tasksListOverdue = {
    name: 'tasks-list-overdue',
    description: 'Get overdue tasks.',
    parameters: ArgsSchema,
    async execute(args, client) {
        return await getTasksByFilter({
            client,
            query: 'overdue',
            cursor: args.cursor,
            limit: args.limit,
        })
    },
} satisfies TodoistTool<typeof ArgsSchema>

export { tasksListOverdue }
