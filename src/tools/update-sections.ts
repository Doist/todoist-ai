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

    // Context-aware next steps for updated sections
    const nextSteps: string[] = []

    if (sections.length > 0) {
        if (count === 1) {
            const section = sections[0]
            if (section) {
                nextSteps.push(
                    `Use ${FIND_TASKS} with sectionId=${section.id} to see existing tasks`,
                )
                nextSteps.push(
                    `Use ${GET_OVERVIEW} with projectId=${section.projectId} to see project structure`,
                )
                nextSteps.push('Consider updating task descriptions if section purpose changed')
            }
        } else {
            // Group sections by project for better guidance
            const projectIds = [...new Set(sections.map((s) => s.projectId))]

            nextSteps.push(`Use ${FIND_SECTIONS} to see all sections with updated names`)

            if (projectIds.length === 1) {
                nextSteps.push(
                    `Use ${GET_OVERVIEW} with projectId=${projectIds[0]} to see updated project structure`,
                )
            } else {
                nextSteps.push(`Use ${GET_OVERVIEW} to see updated project structures`)
            }

            nextSteps.push('Consider updating task descriptions if section purposes changed')
        }
    } else {
        nextSteps.push(`Use ${FIND_SECTIONS} to see current sections`)
    }

    const next = formatNextSteps(nextSteps)
    return `${summary}\n${next}`
}

export { updateSections }
