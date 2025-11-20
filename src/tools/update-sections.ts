import type { Section } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool.js'
import { SectionSchema as SectionOutputSchema } from '../utils/output-schemas.js'
import { ToolNames } from '../utils/tool-names.js'

const SectionUpdateSchema = z.object({
    id: z.string().min(1).describe('The ID of the section to update.'),
    name: z.string().min(1).describe('The new name of the section.'),
})

const ArgsSchema = {
    sections: z.array(SectionUpdateSchema).min(1).describe('The sections to update.'),
}

const OutputSchema = {
    sections: z.array(SectionOutputSchema).describe('The updated sections.'),
    totalCount: z.number().describe('The total number of sections updated.'),
    updatedSectionIds: z.array(z.string()).describe('The IDs of the updated sections.'),
}

const updateSections = {
    name: ToolNames.UPDATE_SECTIONS,
    description: 'Update multiple existing sections with new values.',
    parameters: ArgsSchema,
    outputSchema: OutputSchema,
    mutability: 'mutating' as const,
    async execute({ sections }, client) {
        const updatedSections = await Promise.all(
            sections.map((section) => client.updateSection(section.id, { name: section.name })),
        )

        const textContent = generateTextContent({
            sections: updatedSections,
        })

        return {
            textContent,
            structuredContent: {
                sections: updatedSections,
                totalCount: updatedSections.length,
                updatedSectionIds: updatedSections.map((section) => section.id),
            },
        }
    },
} satisfies TodoistTool<typeof ArgsSchema, typeof OutputSchema>

function generateTextContent({ sections }: { sections: Section[] }) {
    const count = sections.length
    const sectionList = sections
        .map((section) => `• ${section.name} (id=${section.id}, projectId=${section.projectId})`)
        .join('\n')

    const summary = `Updated ${count} section${count === 1 ? '' : 's'}:\n${sectionList}`

    return summary
}

export { updateSections }
