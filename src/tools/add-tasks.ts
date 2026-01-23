import type { AddTaskArgs, Task, TodoistApi } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool.js'
import { mapTask, resolveInboxProjectId } from '../tool-helpers.js'
import { assignmentValidator } from '../utils/assignment-validator.js'
import { DurationParseError, parseDuration } from '../utils/duration-parser.js'
import { TaskSchema as TaskOutputSchema } from '../utils/output-schemas.js'
import { convertPriorityToNumber, PrioritySchema } from '../utils/priorities.js'
import { summarizeTaskOperation } from '../utils/response-builders.js'
import { ToolNames } from '../utils/tool-names.js'

const TaskSchema = z.object({
    content: z
        .string()
        .min(1)
        .describe(
            'The task name/title. Should be concise and actionable (e.g., "Review PR #123", "Call dentist"). For longer content, use the description field instead. Supports Markdown.',
        ),
    description: z
        .string()
        .optional()
        .describe(
            'Additional details, notes, or context for the task. Use this for longer content rather than putting it in the task name. Supports Markdown.',
        ),
    priority: PrioritySchema.optional().describe(
        'The priority of the task: p1 (highest), p2 (high), p3 (medium), p4 (lowest/default).',
    ),
    dueString: z.string().optional().describe('The due date for the task, in natural language.'),
    deadlineDate: z
        .string()
        .optional()
        .describe(
            'The deadline date for the task in ISO 8601 format (YYYY-MM-DD, e.g., "2025-12-31"). Deadlines are immovable constraints shown with a different indicator than due dates.',
        ),
    duration: z
        .string()
        .optional()
        .describe(
            'The duration of the task. Use format: "2h" (hours), "90m" (minutes), "2h30m" (combined), or "1.5h" (decimal hours). Max 24h.',
        ),
    labels: z.array(z.string()).optional().describe('The labels to attach to the task.'),
    projectId: z
        .string()
        .optional()
        .describe(
            'The project ID to add this task to. Project ID should be an ID string, or the text "inbox", for inbox tasks.',
        ),
    sectionId: z.string().optional().describe('The section ID to add this task to.'),
    parentId: z.string().optional().describe('The parent task ID (for subtasks).'),
    order: z
        .number()
        .optional()
        .describe('Position of the task among sibling tasks under the same parent/section.'),
    responsibleUser: z
        .string()
        .optional()
        .describe(
            'Assign task to this user. Can be a user ID, name, or email address. User must be a collaborator on the target project.',
        ),
    isUncompletable: z
        .boolean()
        .optional()
        .describe(
            'Whether this task should be uncompletable (organizational header). Tasks with isUncompletable: true appear as organizational headers and cannot be completed.',
        ),
})

const ArgsSchema = {
    tasks: z.array(TaskSchema).min(1).describe('The array of tasks to add.'),
}

const OutputSchema = {
    tasks: z.array(TaskOutputSchema).describe('The created tasks.'),
    totalCount: z.number().describe('The total number of tasks created.'),
}

const addTasks = {
    name: ToolNames.ADD_TASKS,
    description:
        'Add one or more tasks to a project, section, or parent. Supports assignment to project collaborators.',
    parameters: ArgsSchema,
    outputSchema: OutputSchema,
    mutability: 'additive' as const,
    async execute({ tasks }, client) {
        const newTasks: Task[] = []
        for (const task of tasks) {
            newTasks.push(await processTask(task, client))
        }
        const mappedTasks = newTasks.map(mapTask)

        const textContent = generateTextContent({
            tasks: mappedTasks,
            args: { tasks },
        })

        return {
            textContent,
            structuredContent: {
                tasks: mappedTasks,
                totalCount: mappedTasks.length,
            },
        }
    },
} satisfies TodoistTool<typeof ArgsSchema, typeof OutputSchema>

async function processTask(task: z.infer<typeof TaskSchema>, client: TodoistApi): Promise<Task> {
    const {
        duration: durationStr,
        projectId,
        sectionId,
        parentId,
        order,
        responsibleUser,
        priority,
        labels,
        deadlineDate,
        ...otherTaskArgs
    } = task

    // Resolve "inbox" to actual inbox project ID if needed
    const resolvedProjectId = await resolveInboxProjectId({
        projectId,
        client,
    })

    let taskArgs: AddTaskArgs = {
        ...otherTaskArgs,
        projectId: resolvedProjectId,
        sectionId,
        parentId,
        order,
        labels,
        deadlineDate,
    }

    // Handle priority conversion if provided
    if (priority) {
        taskArgs.priority = convertPriorityToNumber(priority)
    }

    // Only prevent assignment (not task creation) without sufficient project context
    if (responsibleUser && !resolvedProjectId && !sectionId && !parentId) {
        throw new Error(
            `Task "${task.content}": Cannot assign tasks without specifying project context. Please specify a projectId, sectionId, or parentId.`,
        )
    }

    // Parse duration if provided
    if (durationStr) {
        try {
            const { minutes } = parseDuration(durationStr)
            taskArgs = {
                ...taskArgs,
                duration: minutes,
                durationUnit: 'minute',
            }
        } catch (error) {
            if (error instanceof DurationParseError) {
                throw new Error(`Task "${task.content}": ${error.message}`)
            }
            throw error
        }
    }

    // Handle assignment if provided
    if (responsibleUser) {
        // Resolve target project for validation
        let targetProjectId = resolvedProjectId
        if (!targetProjectId && parentId) {
            // For subtasks, get project from parent task
            try {
                const parentTask = await client.getTask(parentId)
                targetProjectId = parentTask.projectId
            } catch (_error) {
                throw new Error(`Task "${task.content}": Parent task "${parentId}" not found`)
            }
        } else if (!targetProjectId && sectionId) {
            // For section tasks, we need to find the project - this is a limitation
            // For now, we'll require explicit projectId when using assignments with sections
            throw new Error(
                `Task "${task.content}": When assigning tasks to sections, please also specify projectId`,
            )
        }

        if (!targetProjectId) {
            throw new Error(
                `Task "${task.content}": Cannot determine target project for assignment validation`,
            )
        }

        // Validate assignment using comprehensive validator
        const validation = await assignmentValidator.validateTaskCreationAssignment(
            client,
            targetProjectId,
            responsibleUser,
        )

        if (!validation.isValid) {
            const errorMsg = validation.error?.message || 'Assignment validation failed'
            const suggestions = validation.error?.suggestions?.join('. ') || ''
            throw new Error(
                `Task "${task.content}": ${errorMsg}${suggestions ? `. ${suggestions}` : ''}`,
            )
        }

        // Use the validated assignee ID
        taskArgs.assigneeId = validation.resolvedUser?.userId
    }

    return await client.addTask(taskArgs)
}

function generateTextContent({
    tasks,
    args,
}: {
    tasks: ReturnType<typeof mapTask>[]
    args: z.infer<z.ZodObject<typeof ArgsSchema>>
}) {
    // Generate context description for mixed contexts
    const contextTypes = new Set<string>()
    for (const task of args.tasks) {
        if (task.projectId) contextTypes.add('projects')
        else if (task.sectionId) contextTypes.add('sections')
        else if (task.parentId) contextTypes.add('subtasks')
        else contextTypes.add('inbox')
    }

    let projectContext = ''
    if (contextTypes.size === 1) {
        const contextType = Array.from(contextTypes)[0]
        projectContext = contextType === 'inbox' ? '' : `to ${contextType}`
    } else if (contextTypes.size > 1) {
        projectContext = 'to multiple contexts'
    }

    return summarizeTaskOperation('Added', tasks, {
        context: projectContext,
        showDetails: true,
    })
}

export { addTasks }
