import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool'
import { getTasksByFilter } from './shared'

const ArgsSchema = {
    searchText: z.string().min(1).describe('The text to search for in tasks.'),
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

const tasksSearch = {
    name: 'tasks-search',
    description: "Search tasks by text using Todoist's filter query.",
    parameters: ArgsSchema,
    async execute(args, client) {
        return await getTasksByFilter({
            client,
            query: `search: ${args.searchText}`,
            cursor: args.cursor,
            limit: args.limit,
        })
    },
} satisfies TodoistTool<typeof ArgsSchema>

export { tasksSearch }
