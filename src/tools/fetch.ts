import { z } from 'zod'
import { getErrorOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { buildTodoistUrl, mapProject, mapTask } from '../tool-helpers.js'
import { ToolNames } from '../utils/tool-names.js'

const ArgsSchema = {
    id: z
        .string()
        .min(1)
        .describe(
            'A unique identifier for the document in the format "task:{id}" or "project:{id}".',
        ),
}

type FetchResult = {
    id: string
    title: string
    text: string
    url: string
    metadata?: Record<string, unknown>
}

type FetchToolOutput = {
    content: { type: 'text'; text: string }[]
    isError?: boolean
}

/**
 * OpenAI MCP fetch tool - retrieves the full contents of a task or project by ID.
 *
 * This tool follows the OpenAI MCP fetch tool specification:
 * @see https://platform.openai.com/docs/mcp#fetch-tool
 */
const fetch = {
    name: ToolNames.FETCH,
    description:
        'Fetch the full contents of a task or project by its ID. The ID should be in the format "task:{id}" or "project:{id}".',
    parameters: ArgsSchema,
    async execute(args, client): Promise<FetchToolOutput> {
        try {
            const { id } = args

            // Parse the composite ID
            const [type, objectId] = id.split(':', 2)

            if (!objectId || (type !== 'task' && type !== 'project')) {
                throw new Error(
                    'Invalid ID format. Expected "task:{id}" or "project:{id}". Example: "task:8485093748" or "project:6cfCcrrCFg2xP94Q"',
                )
            }

            let result: FetchResult

            if (type === 'task') {
                // Fetch task
                const task = await client.getTask(objectId)
                const mappedTask = mapTask(task)

                // Build text content
                const textParts = [mappedTask.content]
                if (mappedTask.description) {
                    textParts.push(`\n\nDescription: ${mappedTask.description}`)
                }
                if (mappedTask.dueDate) {
                    textParts.push(`\nDue: ${mappedTask.dueDate}`)
                }
                if (mappedTask.labels.length > 0) {
                    textParts.push(`\nLabels: ${mappedTask.labels.join(', ')}`)
                }

                result = {
                    id: `task:${mappedTask.id}`,
                    title: mappedTask.content,
                    text: textParts.join(''),
                    url: buildTodoistUrl('task', mappedTask.id),
                    metadata: {
                        priority: mappedTask.priority,
                        projectId: mappedTask.projectId,
                        sectionId: mappedTask.sectionId,
                        parentId: mappedTask.parentId,
                        recurring: mappedTask.recurring,
                        duration: mappedTask.duration,
                        responsibleUid: mappedTask.responsibleUid,
                        assignedByUid: mappedTask.assignedByUid,
                    },
                }
            } else {
                // Fetch project
                const project = await client.getProject(objectId)
                const mappedProject = mapProject(project)

                // Build text content
                const textParts = [mappedProject.name]
                if (mappedProject.isShared) {
                    textParts.push('\n\nShared project')
                }
                if (mappedProject.isFavorite) {
                    textParts.push('\nFavorite: Yes')
                }

                result = {
                    id: `project:${mappedProject.id}`,
                    title: mappedProject.name,
                    text: textParts.join(''),
                    url: buildTodoistUrl('project', mappedProject.id),
                    metadata: {
                        color: mappedProject.color,
                        isFavorite: mappedProject.isFavorite,
                        isShared: mappedProject.isShared,
                        parentId: mappedProject.parentId,
                        inboxProject: mappedProject.inboxProject,
                        viewStyle: mappedProject.viewStyle,
                    },
                }
            }

            // Return as JSON-encoded string in a text content item (OpenAI MCP spec)
            const jsonText = JSON.stringify(result)
            return { content: [{ type: 'text' as const, text: jsonText }] }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred'
            return getErrorOutput(message)
        }
    },
} satisfies TodoistTool<typeof ArgsSchema>

export { fetch }
