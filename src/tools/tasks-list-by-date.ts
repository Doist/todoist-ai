import { addDays, formatISO } from 'date-fns'
import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { getTasksByFilter } from '../tool-helpers.js'
import { generateTaskNextSteps, previewTasks, summarizeList } from '../utils/response-builders.js'
import { TOOL_NAMES } from '../utils/tool-names.js'

const ArgsSchema = {
    startDate: z
        .string()
        .regex(/^(\d{4}-\d{2}-\d{2}|today|overdue)$/)
        .describe(
            "The start date to get the tasks for. Format: YYYY-MM-DD, 'today', or 'overdue'.",
        ),
    daysCount: z
        .number()
        .int()
        .min(1)
        .max(30)
        .default(1)
        .describe(
            "The number of days to get the tasks for, starting from the start date. Ignored when startDate is 'overdue'.",
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

const tasksListByDate = {
    name: TOOL_NAMES.TASKS_LIST_BY_DATE,
    description:
        "Get tasks by date range or overdue tasks. Use startDate 'overdue' for overdue tasks, or provide a date/date range.",
    parameters: ArgsSchema,
    async execute(args, client) {
        let query: string

        if (args.startDate === 'overdue') {
            query = 'overdue'
        } else {
            const startDate =
                args.startDate === 'today'
                    ? formatISO(new Date(), { representation: 'date' })
                    : args.startDate
            const endDate = addDays(startDate, args.daysCount + 1)
            const endDateStr = formatISO(endDate, { representation: 'date' })
            query = `(due after: ${startDate} | due: ${startDate}) & due before: ${endDateStr}`
        }

        const result = await getTasksByFilter({
            client,
            query,
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
                    startDate: args.startDate,
                    daysCount: args.daysCount,
                    limit: args.limit,
                    cursor: args.cursor,
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
    tasks: Awaited<ReturnType<typeof getTasksByFilter>>['tasks']
    args: z.infer<z.ZodObject<typeof ArgsSchema>>
    nextCursor: string | null
}) {
    // Generate filter description
    const filterHints: string[] = []
    if (args.startDate === 'overdue') {
        filterHints.push('overdue tasks only')
    } else if (args.startDate === 'today') {
        filterHints.push(`today${args.daysCount > 1 ? ` + ${args.daysCount - 1} more days` : ''}`)
    } else {
        filterHints.push(
            `${args.startDate}${args.daysCount > 1 ? ` to ${addDays(args.startDate, args.daysCount).toISOString().split('T')[0]}` : ''}`,
        )
    }

    // Generate subject description
    const subject =
        args.startDate === 'overdue'
            ? 'Overdue tasks'
            : args.startDate === 'today'
              ? `Today's tasks`
              : `Tasks for ${args.startDate}`

    // Generate helpful suggestions for empty results
    const zeroReasonHints: string[] = []
    if (tasks.length === 0) {
        if (args.startDate === 'overdue') {
            zeroReasonHints.push('Great job! No overdue tasks')
            zeroReasonHints.push("Check today's tasks with startDate='today'")
        } else {
            zeroReasonHints.push("Expand date range with larger 'daysCount'")
            zeroReasonHints.push("Check 'overdue' for past-due items")
        }
    }

    // Generate contextual next steps
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const nextSteps = generateTaskNextSteps('listed', tasks, {
        hasToday: args.startDate === 'today' || tasks.some((task) => task.dueDate === todayStr),
        hasOverdue:
            args.startDate === 'overdue' ||
            tasks.some((task) => task.dueDate && new Date(task.dueDate) < now),
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

export { tasksListByDate }
