import { GetTasksArgs } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool.js'
import { mapTask } from '../tool-helpers.js'

const ArgsSchema = {
    type: z
        .enum(['project', 'section', 'parent'])
        .describe('The type of container to get tasks for.'),
    id: z.string().min(1).describe('The ID of the container to get tasks for.'),
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
    description: 'Get tasks for a specific project, section, or parent task (subtasks).',
    parameters: ArgsSchema,
    async execute(args, client) {
        const { type, id, limit, cursor } = args

        const taskParams: GetTasksArgs = {
            limit,
            cursor: cursor ?? null,
        }

        switch (type) {
            case 'project':
                taskParams.projectId = id
                break
            case 'section':
                taskParams.sectionId = id
                break
            case 'parent':
                taskParams.parentId = id
                break
        }

        const { results, nextCursor } = await client.getTasks(taskParams)

        return {
            tasks: results.map(mapTask),
            nextCursor,
        }
    },
} satisfies TodoistTool<typeof ArgsSchema>

export { tasksListForContainer }
