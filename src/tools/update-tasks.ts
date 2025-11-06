import type { Task, UpdateTaskArgs } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool.js'
import { createMoveTaskArgs, mapTask } from '../tool-helpers.js'
import { assignmentValidator } from '../utils/assignment-validator.js'
import { DurationParseError, parseDuration } from '../utils/duration-parser.js'
import { TaskSchema as TaskOutputSchema } from '../utils/output-schemas.js'
import { convertPriorityToNumber, PrioritySchema } from '../utils/priorities.js'
import { summarizeTaskOperation } from '../utils/response-builders.js'
import { ToolNames } from '../utils/tool-names.js'

const TasksUpdateSchema = z.object({
    id: z.string().min(1).describe('The ID of the task to update.'),
    content: z
        .string()
        .optional()
        .describe(
            'The new task name/title. Should be concise and actionable (e.g., "Review PR #123", "Call dentist"). For longer content, use the description field instead. Supports Markdown.',
        ),
    description: z
        .string()
        .optional()
        .describe(
            'New additional details, notes, or context for the task. Use this for longer content rather than putting it in the task name. Supports Markdown.',
        ),
    projectId: z
        .string()
        .optional()
        .describe(
            'The new project ID for the task. Project ID should be an ID string, or the text "inbox", for inbox tasks.',
        ),
    sectionId: z.string().optional().describe('The new section ID for the task.'),
    parentId: z.string().optional().describe('The new parent task ID (for subtasks).'),
    order: z.number().optional().describe('The new order of the task within its parent/section.'),
    priority: PrioritySchema.optional().describe(
        'The new priority of the task: p1 (highest), p2 (high), p3 (medium), p4 (lowest/default).',
    ),
    dueString: z
        .string()
        .optional()
        .describe("The new due date for the task, in natural language (e.g., 'tomorrow at 5pm')."),
    deadlineDate: z
        .string()
        .optional()
        .describe(
            'The new deadline date for the task in ISO 8601 format (YYYY-MM-DD, e.g., "2025-12-31"). Deadlines are immovable constraints shown with a different indicator than due dates. Use "remove" to clear the deadline.',
        ),
    duration: z
        .string()
        .optional()
        .describe(
            'The duration of the task. Use format: "2h" (hours), "90m" (minutes), "2h30m" (combined), or "1.5h" (decimal hours). Max 24h.',
        ),
    responsibleUser: z
        .string()
        .optional()
        .describe(
            'Change task assignment. Use "unassign" to remove assignment. Can be user ID, name, or email. User must be a project collaborator.',
        ),
    labels: z
        .array(z.string())
        .optional()
        .describe('The new labels for the task. Replaces all existing labels.'),
})

type TaskUpdate = z.infer<typeof TasksUpdateSchema>

const ArgsSchema = {
    tasks: z.array(TasksUpdateSchema).min(1).describe('The tasks to update.'),
}

const OutputSchema = {
    tasks: z.array(TaskOutputSchema).describe('The updated tasks.'),
    totalCount: z.number().describe('The total number of tasks updated.'),
    updatedTaskIds: z.array(z.string()).describe('The IDs of the updated tasks.'),
    appliedOperations: z
        .object({
            updateCount: z.number().describe('The number of tasks actually updated.'),
            skippedCount: z.number().describe('The number of tasks skipped (no changes).'),
        })
        .describe('Summary of operations performed.'),
}

const updateTasks = {
    name: ToolNames.UPDATE_TASKS,
    description: 'Update existing tasks including content, dates, priorities, and assignments.',
    parameters: ArgsSchema,
    outputSchema: OutputSchema,
    async execute(args, client) {
        const { tasks } = args
        const updateTasksPromises = tasks.map(async (task) => {
            if (!hasUpdatesToMake(task)) {
                return undefined
            }

            const {
                id,
                projectId,
                sectionId,
                parentId,
                duration: durationStr,
                responsibleUser,
                priority,
                labels,
                deadlineDate,
                ...otherUpdateArgs
            } = task

            // Resolve "inbox" to actual inbox project ID if needed
            let resolvedProjectId = projectId
            if (projectId === 'inbox') {
                const todoistUser = await client.getUser()
                resolvedProjectId = todoistUser.inboxProjectId
            }

            let updateArgs: UpdateTaskArgs = {
                ...otherUpdateArgs,
                ...(labels !== undefined && { labels }),
            }

            // Handle priority conversion if provided
            if (priority) {
                updateArgs.priority = convertPriorityToNumber(priority)
            }

            // Handle deadline changes if provided
            if (deadlineDate !== undefined) {
                if (deadlineDate === null || deadlineDate === 'remove') {
                    // Remove deadline - support both legacy null and new "remove" string
                    updateArgs = { ...updateArgs, deadlineDate: null }
                } else {
                    // Set new deadline
                    updateArgs = { ...updateArgs, deadlineDate }
                }
            }

            // Parse duration if provided
            if (durationStr) {
                try {
                    const { minutes } = parseDuration(durationStr)
                    updateArgs = {
                        ...updateArgs,
                        duration: minutes,
                        durationUnit: 'minute',
                    }
                } catch (error) {
                    if (error instanceof DurationParseError) {
                        throw new Error(`Task ${id}: ${error.message}`)
                    }
                    throw error
                }
            }

            // Handle assignment changes if provided
            if (responsibleUser !== undefined) {
                if (responsibleUser === null || responsibleUser === 'unassign') {
                    // Unassign task - no validation needed
                    updateArgs = { ...updateArgs, assigneeId: null }
                } else {
                    // Validate assignment using comprehensive validator
                    const validation = await assignmentValidator.validateTaskUpdateAssignment(
                        client,
                        id,
                        responsibleUser,
                    )

                    if (!validation.isValid) {
                        const errorMsg = validation.error?.message || 'Assignment validation failed'
                        const suggestions = validation.error?.suggestions?.join('. ') || ''
                        throw new Error(
                            `Task ${id}: ${errorMsg}${suggestions ? `. ${suggestions}` : ''}`,
                        )
                    }

                    // Use the validated assignee ID
                    updateArgs = { ...updateArgs, assigneeId: validation.resolvedUser?.userId }
                }
            }

            // If no move parameters are provided, use updateTask without moveTask
            if (!resolvedProjectId && !sectionId && !parentId) {
                return await client.updateTask(id, updateArgs)
            }

            const moveArgs = createMoveTaskArgs(id, resolvedProjectId, sectionId, parentId)
            const movedTask = await client.moveTask(id, moveArgs)

            if (Object.keys(updateArgs).length > 0) {
                return await client.updateTask(id, updateArgs)
            }

            return movedTask
        })
        const updatedTasks = (await Promise.all(updateTasksPromises)).filter(
            (task): task is Task => task !== undefined,
        )

        const mappedTasks = updatedTasks.map(mapTask)

        const textContent = generateTextContent({
            tasks: mappedTasks,
            args,
        })

        return {
            textContent,
            structuredContent: {
                tasks: mappedTasks,
                totalCount: mappedTasks.length,
                updatedTaskIds: updatedTasks.map((task) => task.id),
                appliedOperations: {
                    updateCount: mappedTasks.length,
                    skippedCount: tasks.length - mappedTasks.length,
                },
            },
        }
    },
} satisfies TodoistTool<typeof ArgsSchema, typeof OutputSchema>

function generateTextContent({
    tasks,
    args,
}: {
    tasks: ReturnType<typeof mapTask>[]
    args: z.infer<z.ZodObject<typeof ArgsSchema>>
}) {
    const totalRequested = args.tasks.length
    const actuallyUpdated = tasks.length
    const skipped = totalRequested - actuallyUpdated

    let context = ''
    if (skipped > 0) {
        context = ` (${skipped} skipped - no changes)`
    }

    return summarizeTaskOperation('Updated', tasks, {
        context,
        showDetails: tasks.length <= 5,
    })
}

function hasUpdatesToMake({ id, ...otherUpdateArgs }: TaskUpdate) {
    return Object.keys(otherUpdateArgs).length > 0
}

export { updateTasks }
