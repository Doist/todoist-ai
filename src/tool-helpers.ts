import {
    type PersonalProject,
    type Task,
    type TodoistApi,
    type WorkspaceProject,
    getSanitizedContent,
} from '@doist/todoist-api-typescript'
import z from 'zod'

export type Project = PersonalProject | WorkspaceProject

export function isPersonalProject(project: Project): project is PersonalProject {
    return 'inboxProject' in project
}

export function isWorkspaceProject(project: Project): project is WorkspaceProject {
    return 'accessLevel' in project
}

/**
 * Map a single Todoist task to a more structured format, for LLM consumption.
 * @param task - The task to map.
 * @returns The mapped task.
 */
function mapTask(task: Task) {
    return {
        id: task.id,
        content: getSanitizedContent(task.content),
        description: getSanitizedContent(task.description),
        dueDate: task.due?.date,
        recurring: task.due?.isRecurring && task.due.string ? task.due.string : false,
        priority: task.priority,
        projectId: task.projectId,
        sectionId: task.sectionId,
        parentId: task.parentId,
        labels: task.labels,
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
        const { results, nextCursor } = await client.getTasksByFilter({
            query,
            cursor,
            limit,
        })

        return {
            tasks: results.map(mapTask),
            nextCursor,
        }
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

export { getTasksByFilter, mapTask, mapProject }
