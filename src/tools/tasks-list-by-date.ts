import { addDays, formatISO } from 'date-fns'
import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool'
import { getTasksByFilter } from './shared'

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
    name: 'tasks-list-by-date',
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

        return await getTasksByFilter({
            client,
            query,
            cursor: args.cursor,
            limit: args.limit,
        })
    },
} satisfies TodoistTool<typeof ArgsSchema>

export { tasksListByDate }
