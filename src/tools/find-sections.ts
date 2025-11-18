import type { Section } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool.js'
import { SectionSchema as SectionOutputSchema } from '../utils/output-schemas.js'
import { summarizeList } from '../utils/response-builders.js'
import { ToolNames } from '../utils/tool-names.js'

const { ADD_SECTIONS } = ToolNames

const ArgsSchema = {
    projectId: z
        .string()
        .min(1)
        .describe(
            'The ID of the project to search sections in. Project ID should be an ID string, or the text "inbox", for inbox tasks.',
        ),
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

const OutputSchema = {
    sections: z.array(SectionOutputSchema).describe('The found sections.'),
    totalCount: z.number().describe('The total number of sections found.'),
    appliedFilters: z.record(z.unknown()).describe('The filters that were applied to the search.'),
}

const findSections = {
    name: ToolNames.FIND_SECTIONS,
    description: 'Search for sections by name or other criteria in a project.',
    parameters: ArgsSchema,
    outputSchema: OutputSchema,
    annotations: {
        readOnlyHint: true,
    },
    async execute(args, client) {
        // Resolve "inbox" to actual inbox project ID if needed
        const resolvedProjectId =
            args.projectId === 'inbox' ? (await client.getUser()).inboxProjectId : args.projectId

        const { results } = await client.getSections({
            projectId: resolvedProjectId,
        })
        const searchLower = args.search ? args.search.toLowerCase() : undefined
        const filtered = searchLower
            ? results.filter((section: Section) => section.name.toLowerCase().includes(searchLower))
            : results

        const sections = filtered.map(({ id, name }) => ({ id, name }))

        const textContent = generateTextContent({
            sections,
            projectId: args.projectId,
            search: args.search,
        })

        return {
            textContent,
            structuredContent: {
                sections,
                totalCount: sections.length,
                appliedFilters: args,
            },
        }
    },
} satisfies TodoistTool<typeof ArgsSchema, typeof OutputSchema>

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
        zeroReasonHints.push(`Use ${ADD_SECTIONS} to create sections`)
    }

    // Data-driven next steps based on results
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
    })
}

export { findSections }
