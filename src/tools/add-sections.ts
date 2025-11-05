import type { Section } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { ToolNames } from '../utils/tool-names.js'

const SectionSchema = z.object({
    name: z.string().min(1).describe('The name of the section.'),
    projectId: z
        .string()
        .min(1)
        .describe(
            'The ID of the project to add the section to. Project ID should be an ID string, or the text "inbox", for inbox tasks.',
        ),
})

const ArgsSchema = {
    sections: z.array(SectionSchema).min(1).describe('The array of sections to add.'),
}

const addSections = {
    name: ToolNames.ADD_SECTIONS,
    description: 'Add one or more new sections to projects.',
    parameters: ArgsSchema,
    async execute({ sections }, client) {
        // Check if any section needs inbox resolution
        const needsInboxResolution = sections.some((section) => section.projectId === 'inbox')
        const todoistUser = needsInboxResolution ? await client.getUser() : null

        // Resolve inbox project IDs
        const sectionsWithResolvedProjectIds = sections.map((section) => ({
            ...section,
            projectId:
                section.projectId === 'inbox' && todoistUser
                    ? todoistUser.inboxProjectId
                    : section.projectId,
        }))

        const newSections = await Promise.all(
            sectionsWithResolvedProjectIds.map((section) => client.addSection(section)),
        )
        const textContent = generateTextContent({ sections: newSections })

        return getToolOutput({
            textContent,
            structuredContent: {
                sections: newSections,
                totalCount: newSections.length,
            },
        })
    },
} satisfies TodoistTool<typeof ArgsSchema>

function generateTextContent({ sections }: { sections: Section[] }) {
    const count = sections.length
    const sectionList = sections
        .map((section) => `• ${section.name} (id=${section.id}, projectId=${section.projectId})`)
        .join('\n')

    const summary = `Added ${count} section${count === 1 ? '' : 's'}:\n${sectionList}`

    return summary
}

export { addSections }
