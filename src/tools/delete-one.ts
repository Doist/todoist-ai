import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { formatNextSteps } from '../utils/response-builders.js'
import { ToolNames } from '../utils/tool-names.js'

const { PROJECTS_LIST, OVERVIEW, SECTIONS_SEARCH, TASKS_LIST_FOR_CONTAINER, TASKS_LIST_BY_DATE } =
    ToolNames

const ArgsSchema = {
    type: z.enum(['project', 'section', 'task']).describe('The type of entity to delete.'),
    id: z.string().min(1).describe('The ID of the entity to delete.'),
}

const deleteOne = {
    name: ToolNames.DELETE_ONE,
    description: 'Delete a project, section, or task by its ID.',
    parameters: ArgsSchema,
    async execute(args, client) {
        switch (args.type) {
            case 'project':
                await client.deleteProject(args.id)
                break
            case 'section':
                await client.deleteSection(args.id)
                break
            case 'task':
                await client.deleteTask(args.id)
                break
        }

        const textContent = generateTextContent({
            type: args.type,
            id: args.id,
        })

        return getToolOutput({
            textContent,
            structuredContent: {
                deletedEntity: {
                    type: args.type,
                    id: args.id,
                },
                success: true,
            },
        })
    },
} satisfies TodoistTool<typeof ArgsSchema>

function generateTextContent({
    type,
    id,
}: {
    type: 'project' | 'section' | 'task'
    id: string
}): string {
    const summary = `Deleted ${type}: id=${id}`

    // Recovery-focused next steps based on what was deleted
    const nextSteps: string[] = []

    switch (type) {
        case 'project':
            // Help user understand impact and navigate remaining work
            nextSteps.push(`Use ${PROJECTS_LIST} to see remaining projects`)
            nextSteps.push('Note: All tasks and sections in this project were also deleted')
            nextSteps.push(`Use ${OVERVIEW} to review your updated project structure`)
            break

        case 'section':
            // Guide user to reorganize remaining sections and tasks
            nextSteps.push(`Use ${SECTIONS_SEARCH} to see remaining sections in the project`)
            nextSteps.push('Note: Tasks in this section were also deleted')
            nextSteps.push(
                `Use ${TASKS_LIST_FOR_CONTAINER} with type=project to see unorganized tasks`,
            )
            break

        case 'task':
            // Help user stay focused on remaining work
            nextSteps.push(`Use ${TASKS_LIST_BY_DATE} to see remaining tasks for today`)
            nextSteps.push(`Use ${OVERVIEW} to check if this affects any dependent tasks`)
            nextSteps.push('Note: Any subtasks of this task were also deleted')
            break
    }

    const next = formatNextSteps(nextSteps)
    return `${summary}\n${next}`
}

export { deleteOne }
