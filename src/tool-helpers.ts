import type {
    ActivityEvent,
    MoveTaskArgs,
    PersonalProject,
    Task,
    TodoistApi,
    WorkspaceProject,
} from '@doist/todoist-api-typescript'
import z from 'zod'
import { formatDuration } from './utils/duration-parser.js'

// Re-export filter helpers for backward compatibility
export {
    appendToQuery,
    buildResponsibleUserQueryFilter,
    filterTasksByResponsibleUser,
    RESPONSIBLE_USER_FILTERING,
    type ResponsibleUserFiltering,
    resolveResponsibleUser,
} from './filter-helpers.js'

export type Project = PersonalProject | WorkspaceProject

export function isPersonalProject(project: Project): project is PersonalProject {
    return 'inboxProject' in project
}

export function isWorkspaceProject(project: Project): project is WorkspaceProject {
    return 'accessLevel' in project
}

/**
 * Creates a MoveTaskArgs object from move parameters, validating that exactly one is provided.
 * @param taskId - The task ID (used for error messages)
 * @param projectId - Optional project ID to move to
 * @param sectionId - Optional section ID to move to
 * @param parentId - Optional parent ID to move to
 * @returns MoveTaskArgs object with exactly one destination
 * @throws Error if multiple move parameters are provided or none are provided
 */
export function createMoveTaskArgs(
    taskId: string,
    projectId?: string,
    sectionId?: string,
    parentId?: string,
): MoveTaskArgs {
    // Validate that only one move parameter is provided (RequireExactlyOne constraint)
    const moveParams = [projectId, sectionId, parentId].filter(Boolean)
    if (moveParams.length > 1) {
        throw new Error(
            `Task ${taskId}: Only one of projectId, sectionId, or parentId can be specified at a time. The Todoist API requires exactly one destination for move operations.`,
        )
    }

    if (moveParams.length === 0) {
        throw new Error(
            `Task ${taskId}: At least one of projectId, sectionId, or parentId must be provided for move operations.`,
        )
    }

    // Build moveArgs with the single defined value
    if (projectId) return { projectId }
    if (sectionId) return { sectionId }
    if (parentId) return { parentId }

    // This should never be reached due to the validation above
    throw new Error('Unexpected error: No valid move parameter found')
}

/**
 * Map a single Todoist task to a more structured format, for LLM consumption.
 * @param task - The task to map.
 * @returns The mapped task.
 */
function mapTask(task: Task) {
    return {
        id: task.id,
        content: task.content,
        description: task.description,
        dueDate: task.due?.date,
        recurring: task.due?.isRecurring && task.due.string ? task.due.string : false,
        priority: task.priority,
        projectId: task.projectId,
        sectionId: task.sectionId,
        parentId: task.parentId,
        labels: task.labels,
        duration: task.duration ? formatDuration(task.duration.amount) : null,
        responsibleUid: task.responsibleUid,
        assignedByUid: task.assignedByUid,
        checked: task.checked,
        completedAt: task.completedAt,
    }
}

/**
 * Map a single Todoist project to a more structured format, for LLM consumption.
 * @param project - The project to map.
 * @returns The mapped project.
 */
function mapProject(project: Project) {
    return {
        id: project.id,
        name: project.name,
        color: project.color,
        isFavorite: project.isFavorite,
        isShared: project.isShared,
        parentId: isPersonalProject(project) ? (project.parentId ?? null) : null,
        inboxProject: isPersonalProject(project) ? (project.inboxProject ?? false) : false,
        viewStyle: project.viewStyle,
    }
}

/**
 * Map a single Todoist activity event to a more structured format, for LLM consumption.
 * @param event - The activity event to map.
 * @returns The mapped activity event.
 */
function mapActivityEvent(event: ActivityEvent) {
    return {
        id: event.id,
        objectType: event.objectType,
        objectId: event.objectId,
        eventType: event.eventType,
        eventDate: event.eventDate,
        parentProjectId: event.parentProjectId,
        parentItemId: event.parentItemId,
        initiatorId: event.initiatorId,
        extraData: event.extraData,
    }
}

const ErrorSchema = z.object({
    httpStatusCode: z.number(),
    responseData: z.object({
        error: z.string(),
        errorCode: z.number(),
        errorTag: z.string(),
    }),
})

async function getTasksByFilter({
    client,
    query,
    limit,
    cursor,
}: {
    client: TodoistApi
    query: string
    limit: number | undefined
    cursor: string | undefined
}) {
    try {
        const { results, nextCursor } = await client.getTasksByFilter({ query, cursor, limit })
        const tasks = results.map(mapTask)
        return { tasks, nextCursor }
    } catch (error) {
        const parsedError = ErrorSchema.safeParse(error)
        if (!parsedError.success) {
            throw error
        }
        const { responseData } = parsedError.data
        if (responseData.errorTag === 'INVALID_SEARCH_QUERY') {
            throw new Error(`Invalid filter query: ${query}`)
        }
        throw new Error(
            `${responseData.error} (tag: ${responseData.errorTag}, code: ${responseData.errorCode})`,
        )
    }
}

export { getTasksByFilter, mapActivityEvent, mapProject, mapTask }
