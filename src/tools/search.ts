import { z } from 'zod'
import { getErrorOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { buildTodoistUrl, getTasksByFilter } from '../tool-helpers.js'
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

type SearchToolOutput = {
    content: { type: 'text'; text: string }[]
    isError?: boolean
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
    async execute(args, client): Promise<SearchToolOutput> {
        try {
            const { query } = args

            // Search both tasks and projects in parallel
            // Use TASKS_MAX for search since this tool doesn't support pagination
            const [tasksResult, projectsResponse] = await Promise.all([
                getTasksByFilter({
                    client,
                    query: `search: ${query}`,
                    limit: ApiLimits.TASKS_MAX,
                    cursor: undefined,
                }),
                client.getProjects({ limit: ApiLimits.PROJECTS_MAX }),
            ])

            // Filter projects by search query (case-insensitive)
            const searchLower = query.toLowerCase()
            const matchingProjects = projectsResponse.results.filter((project) =>
                project.name.toLowerCase().includes(searchLower),
            )

            // Build results array
            const results: SearchResult[] = []

            // Add task results with composite IDs
            for (const task of tasksResult.tasks) {
                results.push({
                    id: `task:${task.id}`,
                    title: task.content,
                    url: buildTodoistUrl('task', task.id),
                })
            }

            // Add project results with composite IDs
            for (const project of matchingProjects) {
                results.push({
                    id: `project:${project.id}`,
                    title: project.name,
                    url: buildTodoistUrl('project', project.id),
                })
            }

            // Return as JSON-encoded string in a text content item (OpenAI MCP spec)
            const jsonText = JSON.stringify({ results })
            return { content: [{ type: 'text' as const, text: jsonText }] }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred'
            return getErrorOutput(message)
        }
    },
} satisfies TodoistTool<typeof ArgsSchema>

export { search }
