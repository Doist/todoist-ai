import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool.js'
import { fetchAllProjects, mapProject } from '../tool-helpers.js'
import { ApiLimits } from '../utils/constants.js'
import { ProjectSchema as ProjectOutputSchema } from '../utils/output-schemas.js'
import { formatProjectPreview, summarizeList } from '../utils/response-builders.js'
import { ToolNames } from '../utils/tool-names.js'

const { ADD_PROJECTS } = ToolNames

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
        .max(ApiLimits.PROJECTS_MAX)
        .default(ApiLimits.PROJECTS_DEFAULT)
        .describe('The maximum number of projects to return.'),
    cursor: z
        .string()
        .optional()
        .describe(
            'The cursor to get the next page of projects (cursor is obtained from the previous call to this tool, with the same parameters).',
        ),
}

const OutputSchema = {
    projects: z.array(ProjectOutputSchema).describe('The found projects.'),
    nextCursor: z.string().optional().describe('Cursor for the next page of results.'),
    totalCount: z.number().describe('The total number of projects in this page.'),
    hasMore: z.boolean().describe('Whether there are more results available.'),
    appliedFilters: z.record(z.unknown()).describe('The filters that were applied to the search.'),
}

const findProjects = {
    name: ToolNames.FIND_PROJECTS,
    description:
        'List all projects or search for projects by name. When searching, all matching projects are returned (pagination is ignored). When not searching, projects are returned with pagination.',
    parameters: ArgsSchema,
    outputSchema: OutputSchema,
    async execute(args, client) {
        let results: Awaited<ReturnType<typeof client.getProjects>>['results']
        let nextCursor = null

        if (args.search) {
            // When searching, fetch ALL projects to ensure we don't miss any matches
            results = await fetchAllProjects(client)
            // When searching, we have all results so no pagination
            nextCursor = null
        } else {
            // Normal pagination when not searching
            const response = await client.getProjects({
                limit: args.limit,
                cursor: args.cursor ?? null,
            })
            results = response.results
            nextCursor = response.nextCursor
        }

        const searchLower = args.search ? args.search.toLowerCase() : undefined
        const filtered = searchLower
            ? results.filter((project) => project.name.toLowerCase().includes(searchLower))
            : results
        const projects = filtered.map(mapProject)

        return {
            textContent: generateTextContent({ projects, args, nextCursor }),
            structuredContent: {
                projects,
                nextCursor: nextCursor ?? undefined,
                totalCount: projects.length,
                hasMore: Boolean(nextCursor),
                appliedFilters: args,
            },
        }
    },
} satisfies TodoistTool<typeof ArgsSchema, typeof OutputSchema>

function generateTextContent({
    projects,
    args,
    nextCursor,
}: {
    projects: ReturnType<typeof mapProject>[]
    args: z.infer<z.ZodObject<typeof ArgsSchema>>
    nextCursor: string | null
}) {
    // Generate subject description
    const subject = args.search ? `All projects matching "${args.search}"` : 'Projects'

    // Generate filter hints
    const filterHints: string[] = []
    if (args.search) {
        filterHints.push(`search: "${args.search}"`)
    }

    // Generate project preview lines
    const previewLimit = 10
    const previewProjects = projects.slice(0, previewLimit)
    const previewLines = previewProjects.map(formatProjectPreview).join('\n')
    const remainingCount = projects.length - previewLimit
    const previewWithMore =
        remainingCount > 0 ? `${previewLines}\n    …and ${remainingCount} more` : previewLines

    // Generate helpful suggestions for empty results
    const zeroReasonHints: string[] = []
    if (projects.length === 0) {
        if (args.search) {
            zeroReasonHints.push('Try broader search terms')
            zeroReasonHints.push('Check spelling')
            zeroReasonHints.push('Remove search to see all projects')
        } else {
            zeroReasonHints.push('No projects created yet')
            zeroReasonHints.push(`Use ${ADD_PROJECTS} to create a project`)
        }
    }

    return summarizeList({
        subject,
        count: projects.length,
        limit: args.limit,
        nextCursor: nextCursor ?? undefined,
        filterHints,
        previewLines: previewWithMore,
        zeroReasonHints,
    })
}

export { findProjects }
