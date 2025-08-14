import type { Section } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool.js'

const ArgsSchema = {
    projectId: z.string().min(1).describe('The ID of the project to search sections in.'),
    search: z
        .string()
        .optional()
        .describe(
            'Search for a section by name (partial and case insensitive match). If omitted, all sections in the project are returned.',
        ),
}

const sectionsSearch = {
    name: 'sections-search',
    description: 'Search for sections by name or other criteria in a project.',
    parameters: ArgsSchema,
    async execute(args, client) {
        const { results } = await client.getSections({
            projectId: args.projectId,
        })
        const searchLower = args.search ? args.search.toLowerCase() : undefined
        const filtered = searchLower
            ? results.filter((section: Section) => section.name.toLowerCase().includes(searchLower))
            : results
        return filtered.map((section: Section) => ({
            id: section.id,
            name: section.name,
        }))
    },
} satisfies TodoistTool<typeof ArgsSchema>

export { sectionsSearch }
