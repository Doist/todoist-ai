import type { Section } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { formatNextSteps } from '../utils/response-builders.js'
import { ToolNames } from '../utils/tool-names.js'

const { TASKS_ADD_MULTIPLE, TASKS_LIST_FOR_CONTAINER, OVERVIEW, SECTIONS_SEARCH } = ToolNames

const ArgsSchema = {
    id: z
        .string()
        .min(1)
        .optional()
        .describe(
            'The ID of the section to update. If provided, updates the section. If omitted, creates a new section.',
        ),
    name: z.string().min(1).describe('The name of the section.'),
    projectId: z
        .string()
        .min(1)
        .optional()
        .describe(
            'The ID of the project to add the section to. Required when creating a new section (when id is not provided).',
        ),
}

const sectionsManage = {
    name: ToolNames.SECTIONS_MANAGE,
    description:
        'Add a new section to a project or update an existing section. If id is provided, updates the section. If id is omitted, creates a new section (requires projectId).',
    parameters: ArgsSchema,
    async execute(args, client) {
        if (args.id) {
            // Update existing section
            const section = await client.updateSection(args.id, { name: args.name })
            const textContent = generateTextContent({ section, operation: 'updated' })

            return getToolOutput({
                textContent,
                structuredContent: {
                    section,
                    operation: 'updated',
                },
            })
        }

        // Create new section - projectId is required
        if (!args.projectId) {
            throw new Error(
                'Error: projectId is required when creating a new section (when id is not provided).',
            )
        }

        const section = await client.addSection({
            name: args.name,
            projectId: args.projectId,
        })

        const textContent = generateTextContent({ section, operation: 'created' })

        return getToolOutput({
            textContent,
            structuredContent: {
                section,
                operation: 'created',
            },
        })
    },
} satisfies TodoistTool<typeof ArgsSchema>

function generateTextContent({
    section,
    operation,
}: {
    section: Section
    operation: 'created' | 'updated'
}): string {
    const action = operation === 'created' ? 'Created' : 'Updated'
    const summary = `${action} section: ${section.name} • id=${section.id}`

    // Workflow-aware next steps based on operation and section context
    const nextSteps: string[] = []

    if (operation === 'created') {
        // For new sections, suggest immediate setup workflow
        nextSteps.push(
            `Use ${TASKS_ADD_MULTIPLE} with sectionId=${section.id} to add your first tasks`,
        )
        nextSteps.push(
            `Use ${TASKS_LIST_FOR_CONTAINER} with type=section and id=${section.id} to verify setup`,
        )

        // Suggest related organization
        if (section.projectId) {
            nextSteps.push(
                `Use ${OVERVIEW} with projectId=${section.projectId} to see project organization`,
            )
        }
    } else {
        // For updated sections, suggest review and management
        nextSteps.push(
            `Use ${TASKS_LIST_FOR_CONTAINER} with type=section and id=${section.id} to see existing tasks`,
        )
        nextSteps.push(`Use ${SECTIONS_SEARCH} to see all sections in this project`)

        // Suggest task updates if section was renamed
        nextSteps.push('Consider updating task descriptions if section purpose changed')
    }

    const next = formatNextSteps(nextSteps)
    return `${summary}\n${next}`
}

export { sectionsManage }
