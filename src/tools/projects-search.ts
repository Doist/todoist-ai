import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool'
import { mapProject } from './shared'

const ArgsSchema = {
    search: z
        .string()
        .optional()
        .describe(
            'Search for a project by name (partial and case insensitive match). If omitted, all projects are returned.',
        ),
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

const projectsSearch = {
    name: 'projects-search',
    description: 'Search for projects by name or other criteria.',
    parameters: ArgsSchema,
    async execute(args, client) {
        const { results, nextCursor } = await client.getProjects({
            limit: args.limit,
            cursor: args.cursor ?? null,
        })
        const searchLower = args.search ? args.search.toLowerCase() : undefined
        const filtered = searchLower
            ? results.filter((project) => project.name.toLowerCase().includes(searchLower))
            : results
        return {
            projects: filtered.map(mapProject),
            nextCursor,
        }
    },
} satisfies TodoistTool<typeof ArgsSchema>

export { projectsSearch }
