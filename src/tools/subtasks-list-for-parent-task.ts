import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool'
import { mapTask } from './shared'

const ArgsSchema = {
    parentId: z.string().min(1).describe('The ID of the parent task to get subtasks for.'),
    limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(10)
        .describe('The maximum number of subtasks to return.'),
    cursor: z
        .string()
        .optional()
        .describe('The cursor to get the next page of subtasks (from previous call).'),
}

const subtasksListForParentTask = {
    name: 'subtasks-list-for-parent-task',
    description: 'List subtasks for a given parent task.',
    parameters: ArgsSchema,
    async execute(args, client) {
        const { parentId, limit, cursor } = args
        const { results, nextCursor } = await client.getTasks({
            parentId,
            limit,
            cursor: cursor ?? null,
        })
        return {
            tasks: results.map(mapTask),
            nextCursor,
        }
    },
} satisfies TodoistTool<typeof ArgsSchema>

export { subtasksListForParentTask }
