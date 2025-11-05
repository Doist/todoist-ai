import type { Section } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { ToolNames } from '../utils/tool-names.js'

const SectionUpdateSchema = z.object({
    id: z.string().min(1).describe('The ID of the section to update.'),
    name: z.string().min(1).describe('The new name of the section.'),
})

const ArgsSchema = {
    sections: z.array(SectionUpdateSchema).min(1).describe('The sections to update.'),
}

const updateSections = {
    name: ToolNames.UPDATE_SECTIONS,
    description: 'Update multiple existing sections with new values.',
    parameters: ArgsSchema,
    async execute({ sections }, client) {
        const updatedSections = await Promise.all(
            sections.map((section) => client.updateSection(section.id, { name: section.name })),
        )

        const textContent = generateTextContent({
            sections: updatedSections,
        })

        return getToolOutput({
            textContent,
            structuredContent: {
                sections: updatedSections,
                totalCount: updatedSections.length,
                updatedSectionIds: updatedSections.map((section) => section.id),
            },
        })
    },
} satisfies TodoistTool<typeof ArgsSchema>

function generateTextContent({ sections }: { sections: Section[] }) {
    const count = sections.length
    const sectionList = sections
        .map((section) => `• ${section.name} (id=${section.id}, projectId=${section.projectId})`)
        .join('\n')

    const summary = `Updated ${count} section${count === 1 ? '' : 's'}:\n${sectionList}`

    return summary
}

export { updateSections }
