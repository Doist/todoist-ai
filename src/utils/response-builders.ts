import { DisplayLimits } from './constants.js'
import { ToolNames } from './tool-names.js'

/**
 * Helper function to get date string in YYYY-MM-DD format
 */
export function getDateString(date: Date = new Date()): string {
    const parts = date.toISOString().split('T')
    return parts[0] ?? ''
}

const {
    TASKS_LIST_BY_DATE,
    TASKS_ADD_MULTIPLE,
    TASKS_UPDATE_MULTIPLE,
    TASKS_COMPLETE_MULTIPLE,
    OVERVIEW,
} = ToolNames

type TaskLike = {
    id?: string
    content?: string
    title?: string
    dueDate?: string
    priority?: number
    projectName?: string
}

type ProjectLike = {
    id: string
    name: string
    color?: string
    isFavorite?: boolean
    isShared?: boolean
    parentId?: string | null
    inboxProject?: boolean
    viewStyle?: string
}

type TaskOperationOptions = {
    nextSteps?: string[]
    context?: string
    showDetails?: boolean
}

type BatchOperationParams = {
    action: string
    success: number
    total: number
    successItems?: string[]
    failures?: Array<{
        item: string
        error: string
        code?: string
    }>
    nextSteps?: string[]
}

/**
 * Creates concise, actionable summaries for task operations instead of raw JSON
 */
export function summarizeTaskOperation(
    action: string,
    tasks: TaskLike[],
    options: TaskOperationOptions = {},
): string {
    const { nextSteps, context, showDetails = false } = options
    const count = tasks.length
    const bits: string[] = []

    // Main action summary
    const taskOrTasks = count === 1 ? 'task' : 'tasks'
    const actionSummary = `${action} ${count} ${taskOrTasks}${context ? ` ${context}` : ''}.`
    bits.push(actionSummary)

    // Task details preview (if requested or small batch)
    const smallBatchLimit = 5
    if (showDetails || count <= smallBatchLimit) {
        const previews = previewTasks(tasks, smallBatchLimit)
        if (previews.length > 0) {
            const moreInfo = count > smallBatchLimit ? `, +${count - smallBatchLimit} more` : ''
            bits.push(`Tasks:\n${previews}${moreInfo}.`)
        }
    }

    // Next steps guidance
    if (nextSteps?.length) {
        bits.push(formatNextSteps(nextSteps))
    }

    return bits.join('\n')
}

/**
 * Creates batch operation summaries with success/failure breakdown
 */
export function summarizeBatch(params: BatchOperationParams): string {
    const { action, success, total, successItems, failures, nextSteps } = params
    const bits: string[] = []

    // Main result summary
    const successBit = `${action}: ${success}/${total} successful.`
    bits.push(successBit)

    // Success items (if provided and reasonable count)
    if (successItems?.length && successItems.length <= 5) {
        bits.push(`Completed:\n${successItems.map((item) => `    ${item}`).join('\n')}.`)
    }

    // Failure details (if any)
    if (failures?.length) {
        const failureCount = failures.length
        const failureBit = `Failed (${failureCount}):\n${failures
            .slice(0, DisplayLimits.MAX_FAILURES_SHOWN)
            .map((f) => `    ${f.item} (Error: ${f.error}${f.code ? ` [${f.code}]` : ''})`)
            .join(
                '\n',
            )}${failureCount > DisplayLimits.MAX_FAILURES_SHOWN ? `, +${failureCount - DisplayLimits.MAX_FAILURES_SHOWN} more` : ''}.`
        bits.push(failureBit)
    }

    // Next steps
    if (nextSteps?.length) {
        bits.push(formatNextSteps(nextSteps))
    }

    return bits.join('\n')
}

/**
 * Formats a single task-like object into a readable preview line
 */
function formatTaskPreview(task: TaskLike): string {
    const content = task.content || task.title || 'Untitled'
    const due = task.dueDate ? ` • due ${task.dueDate}` : ''
    const priority = task.priority && task.priority < 4 ? ` • P${task.priority}` : ''
    const project = task.projectName ? ` • ${task.projectName}` : ''
    const id = task.id ? ` • id=${task.id}` : ''
    return `    ${content}${due}${priority}${project}${id}`
}

/**
 * Formats a single project-like object into a readable preview line
 */
export function formatProjectPreview(project: ProjectLike): string {
    const isInbox = project.inboxProject ? ' • Inbox' : ''
    const isFavorite = project.isFavorite ? ' • ⭐' : ''
    const isShared = project.isShared ? ' • Shared' : ''
    const viewStyle =
        project.viewStyle && project.viewStyle !== 'list' ? ` • ${project.viewStyle}` : ''
    const id = ` • id=${project.id}`
    return `    ${project.name}${isInbox}${isFavorite}${isShared}${viewStyle}${id}`
}

/**
 * Creates preview lines for task lists
 */
export function previewTasks(tasks: TaskLike[], limit = 5): string {
    return tasks.slice(0, limit).map(formatTaskPreview).join('\n')
}

interface SummarizeListParams {
    subject: string
    count: number
    limit?: number
    nextCursor?: string
    filterHints?: string[]
    previewLines?: string
    zeroReasonHints?: string[]
    nextSteps?: string[]
}

/**
 * Creates list summaries with counts, filters, and guidance
 */
export function summarizeList({
    subject,
    count,
    limit,
    nextCursor,
    filterHints,
    previewLines,
    zeroReasonHints,
    nextSteps,
}: SummarizeListParams): string {
    const bits: string[] = []

    // Header with count and pagination info
    const header = `${subject}: ${count}${
        typeof limit === 'number' ? ` (limit ${limit})` : ''
    }${nextCursor ? ', more available' : ''}.`
    bits.push(header)

    // Filter information
    if (filterHints?.length) {
        bits.push(`Filter: ${filterHints.join('; ')}.`)
    }

    // Preview of items
    if (previewLines?.length) {
        bits.push(`Preview:\n${previewLines}`)
    }

    // Help for empty results
    if (!count && zeroReasonHints?.length) {
        bits.push(`No results. ${zeroReasonHints.join('; ')}.`)
    }

    // Next steps guidance
    if (nextSteps?.length || nextCursor) {
        bits.push(formatNextSteps(nextSteps || [], nextCursor))
    }

    return bits.join('\n')
}

/**
 * Formats next steps array into a consistent "Next:" section
 * If nextCursor is provided, adds cursor instruction to the steps
 */
export function formatNextSteps(nextSteps: string[], nextCursor?: string): string {
    const allSteps = [...nextSteps]
    if (nextCursor) {
        allSteps.push(`Pass cursor '${nextCursor}' to fetch more results.`)
    }
    return `Next:\n${allSteps.map((step) => `- ${step}`).join('\n')}`
}

/**
 * Helper to generate contextual next steps based on task operations
 */
export function generateTaskNextSteps(
    operation: 'added' | 'updated' | 'listed' | 'completed' | 'organized',
    tasks: TaskLike[],
    context?: {
        hasToday?: boolean
        hasOverdue?: boolean
        hasHighPriority?: boolean
        projectName?: string
        count?: number
        timeOfDay?: 'morning' | 'afternoon' | 'evening'
        isEmptyResult?: boolean
    },
): string[] {
    const nextSteps: string[] = []
    const count = context?.count ?? tasks.length

    switch (operation.toLowerCase()) {
        case 'added':
            // Context-aware suggestions for newly added tasks
            if (context?.hasToday) {
                nextSteps.push(
                    `Use ${TASKS_LIST_BY_DATE}('today') to review today's updated schedule`,
                )
            } else if (context?.hasOverdue) {
                nextSteps.push(`Use ${TASKS_LIST_BY_DATE}('overdue') to prioritize past-due items`)
            } else if (context?.projectName) {
                nextSteps.push(
                    `Use ${OVERVIEW} with projectId to see ${context.projectName} structure`,
                )
            } else {
                nextSteps.push(`Use ${OVERVIEW} to see your updated project organization`)
            }

            // Time-based suggestions
            if (context?.timeOfDay === 'morning') {
                nextSteps.push(`Use ${TASKS_LIST_BY_DATE}('today') to plan your day`)
            }
            break

        case 'updated':
        case 'organized':
            if (context?.hasToday) {
                nextSteps.push(
                    `Use ${TASKS_LIST_BY_DATE}('today') to see your prioritized schedule`,
                )
            } else if (context?.hasHighPriority) {
                nextSteps.push(
                    `Use ${TASKS_LIST_BY_DATE} with filter to focus on high-priority items`,
                )
            } else {
                nextSteps.push(`Use ${OVERVIEW} to see your updated project structure`)
            }
            break

        case 'completed':
            if (context?.timeOfDay === 'evening') {
                nextSteps.push(`Use ${TASKS_LIST_BY_DATE}('tomorrow') to plan upcoming work`)
            } else if (context?.hasOverdue) {
                nextSteps.push(
                    `Use ${TASKS_LIST_BY_DATE}('overdue') to tackle remaining past-due items`,
                )
            } else {
                nextSteps.push(`Use ${TASKS_LIST_BY_DATE}('today') to see remaining work`)
            }
            break

        case 'listed':
            if (context?.isEmptyResult) {
                nextSteps.push(`Use ${TASKS_ADD_MULTIPLE} to add tasks for this timeframe`)
                nextSteps.push(`Use ${OVERVIEW} with projectId to see tasks in other projects`)
            } else if (count > 0) {
                // Tailor suggestions based on result size
                if (count > DisplayLimits.BATCH_OPERATION_THRESHOLD) {
                    nextSteps.push(
                        `Use ${TASKS_UPDATE_MULTIPLE} to batch-update priorities or dates`,
                    )
                    nextSteps.push('Consider breaking large tasks into subtasks')
                } else {
                    nextSteps.push(`Use ${TASKS_UPDATE_MULTIPLE} to modify priorities or due dates`)
                }
                nextSteps.push(`Use ${TASKS_COMPLETE_MULTIPLE} to mark finished tasks`)

                // Time-sensitive suggestions
                if (context?.hasOverdue) {
                    nextSteps.push('Focus on overdue items first to get back on track')
                }
            }
            break
    }

    return nextSteps
}
