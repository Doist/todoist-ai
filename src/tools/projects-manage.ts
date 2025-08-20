import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { formatNextSteps } from '../utils/response-builders.js'
import { ToolNames } from '../utils/tool-names.js'

const { SECTIONS_MANAGE, TASKS_ADD_MULTIPLE, PROJECTS_LIST, TASKS_LIST_FOR_CONTAINER, OVERVIEW } =
    ToolNames

const ArgsSchema = {
    id: z
        .string()
        .min(1)
        .optional()
        .describe(
            'The ID of the project to update. If provided, updates the project. If omitted, creates a new project.',
        ),
    name: z.string().min(1).describe('The name of the project.'),
}

const projectsManage = {
    name: ToolNames.PROJECTS_MANAGE,
    description:
        'Add a new project or update an existing project. If id is provided, updates the project. If id is omitted, creates a new project.',
    parameters: ArgsSchema,
    async execute(args, client) {
        if (args.id) {
            // Update existing project
            const project = await client.updateProject(args.id, { name: args.name })
            const textContent = generateTextContent({ project, operation: 'updated' })

            return getToolOutput({
                textContent,
                structuredContent: {
                    project,
                    operation: 'updated',
                },
            })
        }

        // Create new project
        const project = await client.addProject({ name: args.name })
        const textContent = generateTextContent({ project, operation: 'created' })

        return getToolOutput({
            textContent,
            structuredContent: {
                project,
                operation: 'created',
            },
        })
    },
} satisfies TodoistTool<typeof ArgsSchema>

function generateTextContent({
    project,
    operation,
}: {
    project: { id: string; name: string }
    operation: 'created' | 'updated'
}): string {
    const action = operation === 'created' ? 'Created' : 'Updated'
    const summary = `${action} project: ${project.name} • id=${project.id}`

    // Context-aware next steps based on operation
    const nextSteps: string[] = []

    if (operation === 'created') {
        // For new projects, suggest logical setup workflow
        nextSteps.push(`Use ${SECTIONS_MANAGE} to organize this project with sections`)
        nextSteps.push(`Use ${TASKS_ADD_MULTIPLE} to add your first tasks`)
        nextSteps.push(`Use ${OVERVIEW} with projectId to see updated project structure.`)
    } else {
        // For updated projects, suggest review and management
        nextSteps.push(`Use ${OVERVIEW} with projectId=${project.id} to see project structure`)
        nextSteps.push(`Use ${PROJECTS_LIST} to see all projects with updated name`)
        nextSteps.push(`Use ${TASKS_LIST_FOR_CONTAINER} to review existing tasks`)
    }

    const next = formatNextSteps(nextSteps)
    return `${summary}\n${next}`
}

export { projectsManage }
