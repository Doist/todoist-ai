import { addDays, formatISO } from 'date-fns'
import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { getTasksByFilter } from '../tool-helpers.js'
import { ApiLimits } from '../utils/constants.js'
import { LabelsSchema, generateLabelsFilter } from '../utils/labels.js'
import {
    generateTaskNextSteps,
    getDateString,
    previewTasks,
    summarizeList,
} from '../utils/response-builders.js'
import { ToolNames } from '../utils/tool-names.js'

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
        .max(ApiLimits.TASKS_MAX)
        .default(ApiLimits.TASKS_DEFAULT)
        .describe('The maximum number of tasks to return.'),
    cursor: z
        .string()
        .optional()
        .describe(
            'The cursor to get the next page of tasks (cursor is obtained from the previous call to this tool, with the same parameters).',
        ),
    ...LabelsSchema,
}

const findTasksByDate = {
    name: ToolNames.FIND_TASKS_BY_DATE,
    description:
        "Get tasks by date range or overdue tasks. Use startDate 'overdue' for overdue tasks, or provide a date/date range.",
    parameters: ArgsSchema,
    async execute(args, client) {
        let query = ''

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

        const labelsFilter = generateLabelsFilter(args.labels, args.labelsOperator)
        if (labelsFilter.length > 0) {
            // If there is already a query, we need to append the & operator first
            if (query.length > 0) query += ' & '
            // Add the labels to the filter
            query += `(${labelsFilter})`
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
                appliedFilters: args,
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
            `${args.startDate}${args.daysCount > 1 ? ` to ${getDateString(addDays(args.startDate, args.daysCount))}` : ''}`,
        )
    }

    // Add label filter information
    if (args.labels && args.labels.length > 0) {
        const labelText = args.labels
            .map((label) => `@${label}`)
            .join(args.labelsOperator === 'and' ? ' & ' : ' | ')
        filterHints.push(`labels: ${labelText}`)
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
    const todayStr = getDateString(now)
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

export { findTasksByDate }
