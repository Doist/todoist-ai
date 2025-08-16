import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { getTasksByFilter } from '../tool-helpers.js'
import { generateTaskNextSteps, previewTasks, summarizeList } from '../utils/response-builders.js'
import { TOOL_NAMES } from '../utils/tool-names.js'

const ArgsSchema = {
    searchText: z.string().min(1).describe('The text to search for in tasks.'),
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

const tasksSearch = {
    name: TOOL_NAMES.TASKS_SEARCH,
    description: "Search tasks by text using Todoist's filter query.",
    parameters: ArgsSchema,
    async execute(args, client) {
        const result = await getTasksByFilter({
            client,
            query: `search: ${args.searchText}`,
            cursor: args.cursor,
            limit: args.limit,
        })

        const textContent = generateTextContent({
            tasks: result.tasks,
            args,
            nextCursor: result.nextCursor,
        })

        return getToolOutput({
            textContent,
            structuredContent: {
                tasks: result.tasks,
                nextCursor: result.nextCursor,
                totalCount: result.tasks.length,
                hasMore: Boolean(result.nextCursor),
                appliedFilters: {
                    searchText: args.searchText,
                    limit: args.limit,
                    cursor: args.cursor,
                },
                searchQuery: `search: ${args.searchText}`,
            },
        })
    },
} satisfies TodoistTool<typeof ArgsSchema>

function generateTextContent({
    tasks,
    args,
    nextCursor,
}: {
    tasks: Awaited<ReturnType<typeof getTasksByFilter>>['tasks']
    args: z.infer<z.ZodObject<typeof ArgsSchema>>
    nextCursor: string | null
}) {
    // Generate filter description
    const filterHints = [`matching "${args.searchText}"`]

    // Generate helpful suggestions for empty results
    const zeroReasonHints: string[] = []
    if (tasks.length === 0) {
        zeroReasonHints.push('Try broader search terms')
        zeroReasonHints.push('Check completed tasks with tasks-list-completed')
        zeroReasonHints.push('Verify spelling and try partial words')
    }

    // Generate contextual next steps
    const nextSteps = generateTaskNextSteps('listed', tasks, {
        hasToday: tasks.some((task) => task.dueDate === new Date().toISOString().split('T')[0]),
        hasOverdue: tasks.some((task) => task.dueDate && new Date(task.dueDate) < new Date()),
    })

    return summarizeList({
        subject: `Search results for "${args.searchText}"`,
        count: tasks.length,
        limit: args.limit,
        nextCursor: nextCursor ?? undefined,
        filterHints,
        previewLines: previewTasks(tasks),
        zeroReasonHints,
        nextSteps,
    })
}

export { tasksSearch }
