import type { Task } from '@doist/todoist-sdk'
import { createCommand } from '@doist/todoist-sdk'
import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool.js'
import { mapTask } from '../tool-helpers.js'
import { TaskSchema as TaskOutputSchema } from '../utils/output-schemas.js'
import { summarizeTaskOperation } from '../utils/response-builders.js'
import { ToolNames } from '../utils/tool-names.js'

const TaskRescheduleSchema = z.object({
    id: z.string().min(1).describe('The ID of the task to reschedule.'),
    date: z
        .string()
        .min(1)
        .describe(
            'The new date for the task. Use YYYY-MM-DD for date-only, or YYYY-MM-DDTHH:MM:SS for datetime. ' +
                'If date-only is provided and the task already has a specific time, the existing time is preserved.',
        ),
})

const ArgsSchema = {
    tasks: z
        .array(TaskRescheduleSchema)
        .min(1)
        .describe('The tasks to reschedule with their new dates.'),
}

const OutputSchema = {
    tasks: z.array(TaskOutputSchema).describe('The rescheduled tasks.'),
    totalCount: z.number().describe('The total number of tasks rescheduled.'),
    rescheduledTaskIds: z.array(z.string()).describe('The IDs of the rescheduled tasks.'),
}

const rescheduleTasks = {
    name: ToolNames.RESCHEDULE_TASKS,
    description:
        'Reschedule tasks to new dates while preserving recurring schedules. ' +
        'Unlike update-tasks (which replaces the entire due string and can wipe recurrence), ' +
        'this tool changes only the date, keeping recurrence patterns intact. ' +
        'Use this when moving recurring tasks to a different date without altering their repeat pattern.',
    parameters: ArgsSchema,
    outputSchema: OutputSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    async execute(args, client) {
        const { tasks: taskInputs } = args

        // Fetch all tasks in parallel to get current due date info
        const existingTasks = await Promise.all(
            taskInputs.map(async (input) => {
                const task = await client.getTask(input.id)
                return { input, task }
            }),
        )

        // Validate all tasks have due dates and build sync commands
        const commands = existingTasks.map(({ input, task }) => {
            if (!task.due) {
                throw new Error(
                    `Task "${task.content}" (${task.id}) has no due date. Rescheduling requires an existing due date.`,
                )
            }

            const newDate = buildRescheduleDate(input.date, task.due)

            return createCommand('item_update', {
                id: input.id,
                due: {
                    date: newDate,
                    string: task.due.string,
                    isRecurring: task.due.isRecurring,
                    timezone: task.due.timezone ?? undefined,
                    lang: task.due.lang ?? undefined,
                },
            })
        })

        // Execute all reschedules in a single sync request.
        // The SDK throws TodoistRequestError if any syncStatus entry is non-ok,
        // so we catch and rethrow with task-scoped context.
        try {
            await client.sync({ commands })
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            throw new Error(`Reschedule failed: ${message}`)
        }

        // Re-fetch tasks via REST to get consistent output format
        const updatedTasks = await Promise.all(taskInputs.map((input) => client.getTask(input.id)))

        const mappedTasks = updatedTasks.map(mapTask)

        const textContent = summarizeTaskOperation('Rescheduled', mappedTasks, {
            showDetails: mappedTasks.length <= 5,
        })

        return {
            textContent,
            structuredContent: {
                tasks: mappedTasks,
                totalCount: mappedTasks.length,
                rescheduledTaskIds: updatedTasks.map((task) => task.id),
            },
        }
    },
} satisfies TodoistTool<typeof ArgsSchema, typeof OutputSchema>

function buildRescheduleDate(inputDate: string, existingDue: NonNullable<Task['due']>): string {
    const isInputDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(inputDate)

    if (isInputDateOnly && existingDue.datetime) {
        // Preserve existing time when only a new date is provided
        const timePart = existingDue.datetime.substring(10)
        return inputDate + timePart
    }

    return inputDate
}

export { buildRescheduleDate, rescheduleTasks }
