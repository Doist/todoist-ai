import type { Section } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { formatNextSteps } from '../utils/response-builders.js'
import { ToolNames } from '../utils/tool-names.js'

const { FIND_TASKS, GET_OVERVIEW, FIND_SECTIONS } = ToolNames

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

function generateNextSteps(sections: Section[]): string[] {
    // Handle empty sections first (early return)
    if (sections.length === 0) {
        return [`Use ${FIND_SECTIONS} to see current sections`]
    }

    // Handle single section case
    if (sections.length === 1) {
        const section = sections[0]
        if (!section) return []

        return [
            `Use ${FIND_TASKS} with sectionId=${section.id} to see existing tasks`,
            `Use ${GET_OVERVIEW} with projectId=${section.projectId} to see project structure`,
            'Consider updating task descriptions if section purpose changed',
        ]
    }

    // Handle multiple sections case
    const projectIds = [...new Set(sections.map((s) => s.projectId))]
    const steps = [`Use ${FIND_SECTIONS} to see all sections with updated names`]

    if (projectIds.length === 1) {
        steps.push(
            `Use ${GET_OVERVIEW} with projectId=${projectIds[0]} to see updated project structure`,
        )
    } else {
        steps.push(`Use ${GET_OVERVIEW} to see updated project structures`)
    }

    steps.push('Consider updating task descriptions if section purposes changed')
    return steps
}

function generateTextContent({
    sections,
}: {
    sections: Section[]
}) {
    const count = sections.length
    const sectionList = sections
        .map((section) => `• ${section.name} (id=${section.id}, projectId=${section.projectId})`)
        .join('\n')

    const summary = `Updated ${count} section${count === 1 ? '' : 's'}:\n${sectionList}`

    const nextSteps = generateNextSteps(sections)

    const next = formatNextSteps(nextSteps)
    return `${summary}\n${next}`
}

export { updateSections }
