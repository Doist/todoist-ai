import type { Section } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { summarizeList } from '../utils/response-builders.js'
import { ToolNames } from '../utils/tool-names.js'

const { SECTIONS_MANAGE, TASKS_LIST_FOR_CONTAINER, TASKS_UPDATE_MULTIPLE } = ToolNames

const ArgsSchema = {
    projectId: z.string().min(1).describe('The ID of the project to search sections in.'),
    search: z
        .string()
        .optional()
        .describe(
            'Search for a section by name (partial and case insensitive match). If omitted, all sections in the project are returned.',
        ),
}

type SectionSummary = {
    id: string
    name: string
}

const sectionsSearch = {
    name: ToolNames.SECTIONS_SEARCH,
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

        const sections = filtered.map((section) => ({
            id: section.id,
            name: section.name,
        }))

        const textContent = generateTextContent({
            sections,
            projectId: args.projectId,
            search: args.search,
        })

        return getToolOutput({
            textContent,
            structuredContent: {
                sections,
                totalCount: sections.length,
                appliedFilters: args,
            },
        })
    },
} satisfies TodoistTool<typeof ArgsSchema>

function generateTextContent({
    sections,
    projectId,
    search,
}: {
    sections: SectionSummary[]
    projectId: string
    search?: string
}): string {
    const zeroReasonHints: string[] = []

    if (search) {
        zeroReasonHints.push('Try broader search terms')
        zeroReasonHints.push('Check spelling')
        zeroReasonHints.push('Remove search to see all sections')
    } else {
        zeroReasonHints.push('Project has no sections yet')
        zeroReasonHints.push(`Use ${SECTIONS_MANAGE} to create sections`)
    }

    // Data-driven next steps based on results
    const nextSteps: string[] = []

    if (sections.length > 0) {
        // Suggestions based on number of sections found
        if (sections.length === 1) {
            const sectionId = sections[0]?.id
            nextSteps.push(
                `Use ${TASKS_LIST_FOR_CONTAINER} with type=section and id=${sectionId} to see tasks`,
            )
            nextSteps.push(`Use ${SECTIONS_MANAGE} to create additional sections for organization`)
        } else if (sections.length > 8) {
            nextSteps.push(
                'Consider consolidating sections - many small sections can reduce productivity',
            )
            nextSteps.push(`Use ${TASKS_UPDATE_MULTIPLE} to move tasks between sections`)
            nextSteps.push('Use delete-one with type=section to delete empty sections')
        } else {
            nextSteps.push(
                `Use ${TASKS_LIST_FOR_CONTAINER} with type=section to see tasks in any section`,
            )
            nextSteps.push(`Use ${SECTIONS_MANAGE} to modify section names or order`)
        }

        // Search-specific suggestions
        if (search) {
            nextSteps.push('Remove search parameter to see all sections in this project')
        }
    } else {
        // Empty result suggestions are already handled in zeroReasonHints
        // No additional nextSteps needed for empty results
    }

    const subject = search
        ? `Sections in project ${projectId} matching "${search}"`
        : `Sections in project ${projectId}`

    const previewLines =
        sections.length > 0
            ? sections.map((section) => `    ${section.name} • id=${section.id}`).join('\n')
            : undefined

    return summarizeList({
        subject,
        count: sections.length,
        previewLines,
        zeroReasonHints,
        nextSteps,
    })
}

export { sectionsSearch }
