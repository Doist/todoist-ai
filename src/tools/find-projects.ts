import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { mapProject } from '../tool-helpers.js'
import { ApiLimits } from '../utils/constants.js'
import { formatProjectPreview, summarizeList } from '../utils/response-builders.js'
import { ToolNames } from '../utils/tool-names.js'

const { ADD_PROJECTS, FIND_TASKS } = ToolNames

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

const findProjects = {
    name: ToolNames.FIND_PROJECTS,
    description:
        'List all projects or search for projects by name. If search parameter is omitted, all projects are returned.',
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
        const projects = filtered.map(mapProject)

        return getToolOutput({
            textContent: generateTextContent({
                projects,
                args,
                nextCursor,
            }),
            structuredContent: {
                projects,
                nextCursor,
                totalCount: projects.length,
                hasMore: Boolean(nextCursor),
                appliedFilters: args,
            },
        })
    },
} satisfies TodoistTool<typeof ArgsSchema>

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
    const subject = args.search ? `Projects matching "${args.search}"` : 'Projects'

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

    // Generate contextual next steps
    const nextSteps: string[] = []
    if (projects.length > 0) {
        nextSteps.push(`Use ${FIND_TASKS} with projectId to see tasks in specific projects.`)
        if (projects.some((p) => p.isFavorite)) {
            nextSteps.push('Favorite projects appear first in most Todoist views.')
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
        nextSteps,
    })
}

export { findProjects }
