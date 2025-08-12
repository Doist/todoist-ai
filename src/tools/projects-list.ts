import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool'

const ArgsSchema = {
    limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(50)
        .describe('The maximum number of projects to return.'),
    cursor: z
        .string()
        .optional()
        .describe(
            'The cursor to get the next page of projects (cursor is obtained from the previous call to this tool, with the same parameters).',
        ),
}

const projectsList = {
    name: 'projects-list',
    description: 'List all projects for the user.',
    parameters: ArgsSchema,
    async execute(args, client) {
        const { results, nextCursor } = await client.getProjects({
            limit: args.limit,
            cursor: args.cursor ?? null,
        })
        return {
            projects: results,
            nextCursor,
        }
    },
} satisfies TodoistTool<typeof ArgsSchema>

export { projectsList }
