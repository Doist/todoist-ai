import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool'
import { mapTask } from '../tool-helpers'

const ArgsSchema = {
    projectId: z
        .string()
        .min(1)
        .optional()
        .describe(
            'The ID of the project to get tasks for. Exactly one of projectId, sectionId, or parentId must be provided.',
        ),
    sectionId: z
        .string()
        .min(1)
        .optional()
        .describe(
            'The ID of the section to get tasks for. Exactly one of projectId, sectionId, or parentId must be provided.',
        ),
    parentId: z
        .string()
        .min(1)
        .optional()
        .describe(
            'The ID of the parent task to get subtasks for. Exactly one of projectId, sectionId, or parentId must be provided.',
        ),
    limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(10)
        .describe('The maximum number of tasks to return.'),
    cursor: z
        .string()
        .optional()
        .describe(
            'The cursor to get the next page of tasks (cursor is obtained from the previous call to this tool, with the same parameters).',
        ),
}

const tasksListForContainer = {
    name: 'tasks-list-for-container',
    description:
        'Get tasks for a specific project, section, or parent task (subtasks). Provide exactly one of projectId, sectionId, or parentId.',
    parameters: ArgsSchema,
    async execute(args, client) {
        const { projectId, sectionId, parentId, limit, cursor } = args

        // Validate that exactly one ID is provided
        const idCount = [projectId, sectionId, parentId].filter(Boolean).length
        if (idCount === 0) {
            throw new Error('Exactly one of projectId, sectionId, or parentId must be provided')
        }
        if (idCount > 1) {
            throw new Error(
                'Cannot provide multiple IDs. Choose exactly one: projectId, sectionId, or parentId.',
            )
        }

        const { results, nextCursor } = await client.getTasks({
            ...(projectId && { projectId }),
            ...(sectionId && { sectionId }),
            ...(parentId && { parentId }),
            limit,
            cursor: cursor ?? null,
        })

        return {
            tasks: results.map(mapTask),
            nextCursor,
        }
    },
} satisfies TodoistTool<typeof ArgsSchema>

export { tasksListForContainer }
