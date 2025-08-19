import { GetTasksArgs } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { mapTask } from '../tool-helpers.js'
import { generateTaskNextSteps, previewTasks, summarizeList } from '../utils/response-builders.js'
import { TOOL_NAMES } from '../utils/tool-names.js'

const { TASKS_ADD_MULTIPLE } = TOOL_NAMES

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
    name: TOOL_NAMES.TASKS_LIST_FOR_CONTAINER,
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
        const mappedTasks = results.map(mapTask)

        const textContent = generateTextContent({
            tasks: mappedTasks,
            args,
            nextCursor,
        })

        return getToolOutput({
            textContent,
            structuredContent: {
                tasks: mappedTasks,
                nextCursor,
                totalCount: mappedTasks.length,
                hasMore: Boolean(nextCursor),
                appliedFilters: {
                    type: args.type,
                    id: args.id,
                    limit: args.limit,
                    cursor: args.cursor,
                },
                containerInfo: {
                    type: args.type,
                    id: args.id,
                },
            },
        })
    },
} satisfies TodoistTool<typeof ArgsSchema>

function generateTextContent({
    tasks,
    args,
    nextCursor,
}: {
    tasks: ReturnType<typeof mapTask>[]
    args: z.infer<z.ZodObject<typeof ArgsSchema>>
    nextCursor: string | null
}) {
    // Generate container descriptions without API calls
    let subject: string
    let filterHints: string[] = []

    switch (args.type) {
        case 'project':
            subject = 'Tasks in project'
            filterHints = [`in project ${args.id}`]
            break
        case 'section':
            subject = 'Tasks in section'
            filterHints = [`in section ${args.id}`]
            break
        case 'parent':
            subject = 'Subtasks'
            filterHints = [`subtasks of ${args.id}`]
            break
    }

    // Generate helpful suggestions for empty results
    const zeroReasonHints: string[] = []
    if (tasks.length === 0) {
        if (args.type === 'project') {
            zeroReasonHints.push('Project has no tasks yet')
            zeroReasonHints.push(`Use ${TASKS_ADD_MULTIPLE} to create tasks`)
        } else if (args.type === 'section') {
            zeroReasonHints.push('Section is empty')
            zeroReasonHints.push('Tasks may be in other sections of the project')
        } else {
            zeroReasonHints.push('No subtasks created yet')
            zeroReasonHints.push(`Use ${TASKS_ADD_MULTIPLE} with parentId to add subtasks`)
        }
    }

    // Generate contextual next steps
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const nextSteps = generateTaskNextSteps('listed', tasks, {
        hasToday: tasks.some((task) => task.dueDate === todayStr),
        hasOverdue: tasks.some((task) => task.dueDate && new Date(task.dueDate) < now),
    })

    return summarizeList({
        subject,
        count: tasks.length,
        limit: args.limit,
        nextCursor: nextCursor ?? undefined,
        filterHints,
        previewLines: previewTasks(tasks),
        zeroReasonHints,
        nextSteps,
    })
}

export { tasksListForContainer }
