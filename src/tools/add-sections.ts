import type { Section } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { formatNextSteps } from '../utils/response-builders.js'
import { ToolNames } from '../utils/tool-names.js'

const { ADD_TASKS, FIND_TASKS, GET_OVERVIEW, FIND_SECTIONS } = ToolNames

const SectionSchema = z.object({
    name: z.string().min(1).describe('The name of the section.'),
    projectId: z.string().min(1).describe('The ID of the project to add the section to.'),
})

const ArgsSchema = {
    sections: z.array(SectionSchema).min(1).describe('The array of sections to add.'),
}

const addSections = {
    name: ToolNames.ADD_SECTIONS,
    description: 'Add one or more new sections to projects.',
    parameters: ArgsSchema,
    async execute({ sections }, client) {
        const newSections = await Promise.all(sections.map((section) => client.addSection(section)))
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

function generateTextContent({
    sections,
}: {
    sections: Section[]
}) {
    const count = sections.length
    const sectionList = sections
        .map((section) => `• ${section.name} (id=${section.id}, projectId=${section.projectId})`)
        .join('\n')

    const summary = `Added ${count} section${count === 1 ? '' : 's'}:\n${sectionList}`

    // Context-aware next steps for new sections
    const nextSteps: string[] = []

    if (count === 1) {
        const section = sections[0]
        if (section) {
            nextSteps.push(`Use ${ADD_TASKS} with sectionId=${section.id} to add your first tasks`)
            nextSteps.push(`Use ${FIND_TASKS} with sectionId=${section.id} to verify setup`)
            nextSteps.push(
                `Use ${GET_OVERVIEW} with projectId=${section.projectId} to see project organization`,
            )
        }
    } else {
        // Group sections by project for better guidance
        const projectIds = [...new Set(sections.map((s) => s.projectId))]

        nextSteps.push(`Use ${ADD_TASKS} to add tasks to these new sections`)

        if (projectIds.length === 1) {
            nextSteps.push(
                `Use ${GET_OVERVIEW} with projectId=${projectIds[0]} to see updated project structure`,
            )
            nextSteps.push(
                `Use ${FIND_SECTIONS} with projectId=${projectIds[0]} to see all sections`,
            )
        } else {
            nextSteps.push(`Use ${GET_OVERVIEW} to see updated project structures`)
            nextSteps.push(`Use ${FIND_SECTIONS} to see sections in specific projects`)
        }
    }

    const next = formatNextSteps(nextSteps)
    return `${summary}\n${next}`
}

export { addSections }
