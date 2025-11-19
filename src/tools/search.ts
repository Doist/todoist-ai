import { getProjectUrl, getTaskUrl } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool.js'
import { fetchAllProjects, getTasksByFilter } from '../tool-helpers.js'
import { ApiLimits } from '../utils/constants.js'
import { ToolNames } from '../utils/tool-names.js'

const ArgsSchema = {
    query: z.string().min(1).describe('The search query string to find tasks and projects.'),
}

type SearchResult = {
    id: string
    title: string
    url: string
}

const OutputSchema = {
    results: z
        .array(
            z.object({
                id: z.string().describe('The ID of the result.'),
                title: z.string().describe('The title of the result.'),
                url: z.string().describe('The URL of the result.'),
            }),
        )
        .describe('The search results.'),
    totalCount: z.number().describe('Total number of results found.'),
}

/**
 * OpenAI MCP search tool - returns a list of relevant search results from Todoist.
 *
 * This tool follows the OpenAI MCP search tool specification:
 * @see https://platform.openai.com/docs/mcp#search-tool
 */
const search = {
    name: ToolNames.SEARCH,
    description:
        'Search across tasks and projects in Todoist. Returns a list of relevant results with IDs, titles, and URLs.',
    parameters: ArgsSchema,
    outputSchema: OutputSchema,
    async execute(args, client) {
        const { query } = args

        // Search both tasks and projects in parallel
        // Use TASKS_MAX for search since this tool doesn't support pagination
        // For projects, fetch ALL to ensure we don't miss matches beyond first page
        const [tasksResult, allProjects] = await Promise.all([
            getTasksByFilter({
                client,
                query: `search: ${query}`,
                limit: ApiLimits.TASKS_MAX,
                cursor: undefined,
            }),
            fetchAllProjects(client),
        ])

        // Filter projects by search query (case-insensitive)
        const searchLower = query.toLowerCase()
        const matchingProjects = allProjects.filter((project) =>
            project.name.toLowerCase().includes(searchLower),
        )

        // Build results array
        const results: SearchResult[] = []

        // Add task results with composite IDs
        for (const task of tasksResult.tasks) {
            results.push({
                id: `task:${task.id}`,
                title: task.content,
                url: getTaskUrl(task.id),
            })
        }

        // Add project results with composite IDs
        for (const project of matchingProjects) {
            results.push({
                id: `project:${project.id}`,
                title: project.name,
                url: getProjectUrl(project.id),
            })
        }

        return {
            textContent: JSON.stringify({ results }),
            structuredContent: { results, totalCount: results.length },
        }
    },
} satisfies TodoistTool<typeof ArgsSchema, typeof OutputSchema>

export { search }
