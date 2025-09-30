import { GetTasksArgs } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { filterTasksByResponsibleUser, getTasksByFilter, mapTask } from '../tool-helpers.js'
import { ApiLimits } from '../utils/constants.js'
import { generateLabelsFilter, LabelsSchema } from '../utils/labels.js'
import {
    generateTaskNextSteps,
    getDateString,
    previewTasks,
    summarizeList,
} from '../utils/response-builders.js'
import { MappedTask } from '../utils/test-helpers.js'
import { ToolNames } from '../utils/tool-names.js'
import { resolveUserNameToId } from '../utils/user-resolver.js'

const { FIND_COMPLETED_TASKS, ADD_TASKS } = ToolNames

const ArgsSchema = {
    searchText: z.string().optional().describe('The text to search for in tasks.'),
    projectId: z.string().optional().describe('Find tasks in this project.'),
    sectionId: z.string().optional().describe('Find tasks in this section.'),
    parentId: z.string().optional().describe('Find subtasks of this parent task.'),
    responsibleUser: z
        .string()
        .optional()
        .describe('Find tasks assigned to this user. Can be a user ID, name, or email address.'),
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

const findTasks = {
    name: ToolNames.FIND_TASKS,
    description:
        'Find tasks by text search, or by project/section/parent container/responsible user. At least one filter must be provided.',
    parameters: ArgsSchema,
    async execute(args, client) {
        const {
            searchText,
            projectId,
            sectionId,
            parentId,
            responsibleUser,
            limit,
            cursor,
            labels,
            labelsOperator,
        } = args

        const todoistUser = await client.getUser()

        // Validate at least one filter is provided
        const hasLabels = labels && labels.length > 0
        if (
            !searchText &&
            !projectId &&
            !sectionId &&
            !parentId &&
            !responsibleUser &&
            !hasLabels
        ) {
            throw new Error(
                'At least one filter must be provided: searchText, projectId, sectionId, parentId, responsibleUser, or labels',
            )
        }

        // Resolve assignee name to user ID if provided
        let resolvedAssigneeId: string | undefined = responsibleUser
        let assigneeDisplayName: string | undefined
        if (responsibleUser) {
            const resolved = await resolveUserNameToId(client, responsibleUser)
            if (resolved) {
                resolvedAssigneeId = resolved.userId
                assigneeDisplayName = resolved.displayName
            } else {
                throw new Error(
                    `Could not find user: "${responsibleUser}". Make sure the user is a collaborator on a shared project.`,
                )
            }
        }

        // If using container-based filtering, use direct API
        if (projectId || sectionId || parentId) {
            const taskParams: GetTasksArgs = {
                limit,
                cursor: cursor ?? null,
            }

            if (projectId) taskParams.projectId = projectId
            if (sectionId) taskParams.sectionId = sectionId
            if (parentId) taskParams.parentId = parentId

            const { results, nextCursor } = await client.getTasks(taskParams)
            const mappedTasks = results.map(mapTask)

            // Apply search text filter
            let filteredTasks = searchText
                ? mappedTasks.filter(
                      (task) =>
                          task.content.toLowerCase().includes(searchText.toLowerCase()) ||
                          task.description?.toLowerCase().includes(searchText.toLowerCase()),
                  )
                : mappedTasks

            // Apply responsibleUid filter
            filteredTasks = filterTasksByResponsibleUser({
                tasks: filteredTasks,
                resolvedAssigneeId,
                currentUserId: todoistUser.id,
            })

            // Apply label filter
            if (labels && labels.length > 0) {
                filteredTasks =
                    labelsOperator === 'and'
                        ? filteredTasks.filter((task) =>
                              labels.every((label) => task.labels.includes(label)),
                          )
                        : filteredTasks.filter((task) =>
                              labels.some((label) => task.labels.includes(label)),
                          )
            }

            const textContent = generateTextContent({
                tasks: filteredTasks,
                args,
                nextCursor,
                isContainerSearch: true,
                assigneeDisplayName,
            })

            return getToolOutput({
                textContent,
                structuredContent: {
                    tasks: filteredTasks,
                    nextCursor,
                    totalCount: filteredTasks.length,
                    hasMore: Boolean(nextCursor),
                    appliedFilters: args,
                },
            })
        }

        // If only responsibleUid is provided (without containers), use assignee filter
        if (resolvedAssigneeId && !searchText && !hasLabels) {
            const tasks = await client.getTasksByFilter({
                query: `assigned to: ${assigneeDisplayName}`,
                lang: 'en',
                limit,
                cursor: cursor ?? null,
            })

            const mappedTasks = tasks.results.map(mapTask)

            const textContent = generateTextContent({
                tasks: mappedTasks,
                args,
                nextCursor: tasks.nextCursor,
                isContainerSearch: false,
                assigneeDisplayName,
            })

            return getToolOutput({
                textContent,
                structuredContent: {
                    tasks: mappedTasks,
                    nextCursor: tasks.nextCursor,
                    totalCount: mappedTasks.length,
                    hasMore: Boolean(tasks.nextCursor),
                    appliedFilters: args,
                },
            })
        }

        // Handle search text and/or labels using filter query (responsibleUid filtering done client-side)
        let query = ''

        // Add search text component
        if (searchText) {
            query = `search: ${searchText}`
        }

        // Add labels component
        const labelsFilter = generateLabelsFilter(labels, labelsOperator)
        if (labelsFilter.length > 0) {
            if (query.length > 0) {
                query += ` & ${labelsFilter}`
            } else {
                query = labelsFilter
            }
        }

        // Execute filter query
        const result = await getTasksByFilter({
            client,
            query,
            cursor: args.cursor,
            limit: args.limit,
        })

        const tasks = filterTasksByResponsibleUser({
            tasks: result.tasks,
            resolvedAssigneeId,
            currentUserId: todoistUser.id,
        })

        const textContent = generateTextContent({
            tasks,
            args,
            nextCursor: result.nextCursor,
            isContainerSearch: false,
            assigneeDisplayName,
        })

        return getToolOutput({
            textContent,
            structuredContent: {
                tasks,
                nextCursor: result.nextCursor,
                totalCount: tasks.length,
                hasMore: Boolean(result.nextCursor),
                appliedFilters: args,
            },
        })
    },
} satisfies TodoistTool<typeof ArgsSchema>

function getContainerZeroReasonHints(args: z.infer<z.ZodObject<typeof ArgsSchema>>): string[] {
    if (args.projectId) {
        const hints = [
            args.searchText ? 'No tasks in project match search' : 'Project has no tasks yet',
        ]
        if (!args.searchText) {
            hints.push(`Use ${ADD_TASKS} to create tasks`)
        }
        return hints
    }

    if (args.sectionId) {
        const hints = [args.searchText ? 'No tasks in section match search' : 'Section is empty']
        if (!args.searchText) {
            hints.push('Tasks may be in other sections of the project')
        }
        return hints
    }

    if (args.parentId) {
        const hints = [args.searchText ? 'No subtasks match search' : 'No subtasks created yet']
        if (!args.searchText) {
            hints.push(`Use ${ADD_TASKS} with parentId to add subtasks`)
        }
        return hints
    }

    return []
}

function generateTextContent({
    tasks,
    args,
    nextCursor,
    isContainerSearch,
    assigneeDisplayName,
}: {
    tasks: MappedTask[]
    args: z.infer<z.ZodObject<typeof ArgsSchema>>
    nextCursor: string | null
    isContainerSearch: boolean
    assigneeDisplayName?: string
}) {
    // Generate subject and filter descriptions based on search type
    let subject = 'Tasks'
    const filterHints: string[] = []
    const zeroReasonHints: string[] = []

    if (isContainerSearch) {
        // Container-based search
        if (args.projectId) {
            subject = 'Tasks in project'
            filterHints.push(`in project ${args.projectId}`)
        } else if (args.sectionId) {
            subject = 'Tasks in section'
            filterHints.push(`in section ${args.sectionId}`)
        } else if (args.parentId) {
            subject = 'Subtasks'
            filterHints.push(`subtasks of ${args.parentId}`)
        } else {
            subject = 'Tasks' // fallback, though this shouldn't happen
        }

        // Add search text filter if present
        if (args.searchText) {
            subject += ` matching "${args.searchText}"`
            filterHints.push(`containing "${args.searchText}"`)
        }

        // Add responsibleUid filter if present
        if (args.responsibleUser) {
            const displayName = assigneeDisplayName || args.responsibleUser
            subject += ` assigned to ${displayName}`
            filterHints.push(`assigned to ${displayName}`)
        }

        // Add label filter information
        if (args.labels && args.labels.length > 0) {
            const labelText = args.labels
                .map((label) => `@${label}`)
                .join(args.labelsOperator === 'and' ? ' & ' : ' | ')
            filterHints.push(`labels: ${labelText}`)
        }

        // Container-specific zero result hints
        if (tasks.length === 0) {
            zeroReasonHints.push(...getContainerZeroReasonHints(args))
        }
    } else {
        // Text, responsibleUid, or labels search
        const displayName = assigneeDisplayName || args.responsibleUser

        // Build subject based on filters
        const subjectParts = []
        if (args.searchText) {
            subjectParts.push(`"${args.searchText}"`)
        }
        if (args.responsibleUser) {
            subjectParts.push(`assigned to ${displayName}`)
        }
        if (args.labels && args.labels.length > 0) {
            const labelText = args.labels
                .map((label) => `@${label}`)
                .join(args.labelsOperator === 'and' ? ' & ' : ' | ')
            subjectParts.push(`with labels: ${labelText}`)
        }

        if (args.searchText) {
            subject = `Search results for ${subjectParts.join(' ')}`
            filterHints.push(`matching "${args.searchText}"`)
        } else if (args.responsibleUser && (!args.labels || args.labels.length === 0)) {
            subject = `Tasks assigned to ${displayName}`
        } else if (args.labels && args.labels.length > 0 && !args.responsibleUser) {
            const labelText = args.labels
                .map((label) => `@${label}`)
                .join(args.labelsOperator === 'and' ? ' & ' : ' | ')
            subject = `Tasks with labels: ${labelText}`
        } else {
            subject = `Tasks ${subjectParts.join(' ')}`
        }

        // Add filter hints
        if (args.responsibleUser) {
            filterHints.push(`assigned to ${displayName}`)
        }
        if (args.labels && args.labels.length > 0) {
            const labelText = args.labels
                .map((label) => `@${label}`)
                .join(args.labelsOperator === 'and' ? ' & ' : ' | ')
            filterHints.push(`labels: ${labelText}`)
        }

        if (tasks.length === 0) {
            if (args.responsibleUser) {
                const displayName = assigneeDisplayName || args.responsibleUser
                zeroReasonHints.push(`No tasks assigned to ${displayName}`)
                zeroReasonHints.push('Check if the user name is correct')
                zeroReasonHints.push(`Check completed tasks with ${FIND_COMPLETED_TASKS}`)
            }
            if (args.searchText) {
                zeroReasonHints.push('Try broader search terms')
                zeroReasonHints.push('Verify spelling and try partial words')
                if (!args.responsibleUser) {
                    zeroReasonHints.push(`Check completed tasks with ${FIND_COMPLETED_TASKS}`)
                }
            }
        }
    }

    // Generate contextual next steps
    const now = new Date()
    const todayDateString = getDateString(now)
    const nextSteps = generateTaskNextSteps('listed', tasks, {
        hasToday: tasks.some((task) => task.dueDate === todayDateString),
        hasOverdue: tasks.some((task) => task.dueDate && new Date(task.dueDate) < now),
    })

    return summarizeList({
        subject,
        count: tasks.length,
        limit: args.limit,
        nextCursor: nextCursor ?? undefined,
        filterHints,
        previewLines: previewTasks(tasks, Math.min(tasks.length, args.limit)),
        zeroReasonHints,
        nextSteps,
    })
}

export { findTasks }
