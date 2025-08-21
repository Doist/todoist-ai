import { GetTasksArgs } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { getTasksByFilter, mapTask } from '../tool-helpers.js'
import { ApiLimits } from '../utils/constants.js'
import {
    generateTaskNextSteps,
    getDateString,
    previewTasks,
    summarizeList,
} from '../utils/response-builders.js'
import { MappedTask } from '../utils/test-helpers.js'
import { ToolNames } from '../utils/tool-names.js'

const { FIND_COMPLETED_TASKS, ADD_TASKS } = ToolNames

const ArgsSchema = {
    searchText: z.string().optional().describe('The text to search for in tasks.'),
    projectId: z.string().optional().describe('Find tasks in this project.'),
    sectionId: z.string().optional().describe('Find tasks in this section.'),
    parentId: z.string().optional().describe('Find subtasks of this parent task.'),
    limit: z
        .number()
        .int()
        .min(1)
        .max(ApiLimits.TASKS_MAX)
        .default(ApiLimits.TASKS_DEFAULT)
        .describe('The maximum number of tasks to return.'),
    cursor: z
        .string()
        .optional()
        .describe(
            'The cursor to get the next page of tasks (cursor is obtained from the previous call to this tool, with the same parameters).',
        ),
}

const findTasks = {
    name: ToolNames.FIND_TASKS,
    description:
        'Find tasks by text search, or by project/section/parent container. At least one filter must be provided.',
    parameters: ArgsSchema,
    async execute(args, client) {
        const { searchText, projectId, sectionId, parentId, limit, cursor } = args

        // Validate at least one filter is provided
        if (!searchText && !projectId && !sectionId && !parentId) {
            throw new Error(
                'At least one filter must be provided: searchText, projectId, sectionId, or parentId',
            )
        }

        // If using container-based filtering, use direct API
        if (projectId || sectionId || parentId) {
            const taskParams: GetTasksArgs = {
                limit,
                cursor: cursor ?? null,
            }

            if (projectId) taskParams.projectId = projectId
            if (sectionId) taskParams.sectionId = sectionId
            if (parentId) taskParams.parentId = parentId

            const { results, nextCursor } = await client.getTasks(taskParams)
            const mappedTasks = results.map(mapTask)

            // If also has searchText, filter the results
            const finalTasks = searchText
                ? mappedTasks.filter(
                      (task) =>
                          task.content.toLowerCase().includes(searchText.toLowerCase()) ||
                          task.description?.toLowerCase().includes(searchText.toLowerCase()),
                  )
                : mappedTasks

            const textContent = generateTextContent({
                tasks: finalTasks,
                args,
                nextCursor,
                isContainerSearch: true,
            })

            return getToolOutput({
                textContent,
                structuredContent: {
                    tasks: finalTasks,
                    nextCursor,
                    totalCount: finalTasks.length,
                    hasMore: Boolean(nextCursor),
                    appliedFilters: args,
                },
            })
        }

        // Text-only search using filter query
        const result = await getTasksByFilter({
            client,
            query: `search: ${searchText}`,
            cursor: args.cursor,
            limit: args.limit,
        })

        const textContent = generateTextContent({
            tasks: result.tasks,
            args,
            nextCursor: result.nextCursor,
            isContainerSearch: false,
        })

        return getToolOutput({
            textContent,
            structuredContent: {
                tasks: result.tasks,
                nextCursor: result.nextCursor,
                totalCount: result.tasks.length,
                hasMore: Boolean(result.nextCursor),
                appliedFilters: args,
            },
        })
    },
} satisfies TodoistTool<typeof ArgsSchema>

function getContainerZeroReasonHints(args: z.infer<z.ZodObject<typeof ArgsSchema>>): string[] {
    if (args.projectId) {
        const hints = [
            args.searchText ? 'No tasks in project match search' : 'Project has no tasks yet',
        ]
        if (!args.searchText) {
            hints.push(`Use ${ADD_TASKS} to create tasks`)
        }
        return hints
    }

    if (args.sectionId) {
        const hints = [args.searchText ? 'No tasks in section match search' : 'Section is empty']
        if (!args.searchText) {
            hints.push('Tasks may be in other sections of the project')
        }
        return hints
    }

    if (args.parentId) {
        const hints = [args.searchText ? 'No subtasks match search' : 'No subtasks created yet']
        if (!args.searchText) {
            hints.push(`Use ${ADD_TASKS} with parentId to add subtasks`)
        }
        return hints
    }

    return []
}

function generateTextContent({
    tasks,
    args,
    nextCursor,
    isContainerSearch,
}: {
    tasks: MappedTask[]
    args: z.infer<z.ZodObject<typeof ArgsSchema>>
    nextCursor: string | null
    isContainerSearch: boolean
}) {
    // Generate subject and filter descriptions based on search type
    let subject: string
    const filterHints: string[] = []
    const zeroReasonHints: string[] = []

    if (isContainerSearch) {
        // Container-based search
        if (args.projectId) {
            subject = 'Tasks in project'
            filterHints.push(`in project ${args.projectId}`)
        } else if (args.sectionId) {
            subject = 'Tasks in section'
            filterHints.push(`in section ${args.sectionId}`)
        } else if (args.parentId) {
            subject = 'Subtasks'
            filterHints.push(`subtasks of ${args.parentId}`)
        } else {
            subject = 'Tasks' // fallback, though this shouldn't happen
        }

        // Add search text filter if present
        if (args.searchText) {
            subject += ` matching "${args.searchText}"`
            filterHints.push(`containing "${args.searchText}"`)
        }

        // Container-specific zero result hints
        if (tasks.length === 0) {
            zeroReasonHints.push(...getContainerZeroReasonHints(args))
        }
    } else {
        // Text-only search
        subject = `Search results for "${args.searchText}"`
        filterHints.push(`matching "${args.searchText}"`)

        if (tasks.length === 0) {
            zeroReasonHints.push('Try broader search terms')
            zeroReasonHints.push(`Check completed tasks with ${FIND_COMPLETED_TASKS}`)
            zeroReasonHints.push('Verify spelling and try partial words')
        }
    }

    // Generate contextual next steps
    const now = new Date()
    const todayDateString = getDateString(now)
    const nextSteps = generateTaskNextSteps('listed', tasks, {
        hasToday: tasks.some((task) => task.dueDate === todayDateString),
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

export { findTasks }
