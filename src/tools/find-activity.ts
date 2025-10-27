import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { mapActivityEvent } from '../tool-helpers.js'
import { ApiLimits } from '../utils/constants.js'
import { summarizeList } from '../utils/response-builders.js'
import { ToolNames } from '../utils/tool-names.js'

const { FIND_TASKS, USER_INFO } = ToolNames

const ArgsSchema = {
    objectType: z
        .enum(['task', 'project', 'comment'])
        .optional()
        .describe('Type of object to filter by.'),

    objectId: z
        .string()
        .optional()
        .describe('Filter by specific object ID (task, project, or comment).'),

    eventType: z
        .enum([
            'added',
            'updated',
            'deleted',
            'completed',
            'uncompleted',
            'archived',
            'unarchived',
            'shared',
            'left',
        ])
        .optional()
        .describe('Type of event to filter by.'),

    projectId: z.string().optional().describe('Filter events by parent project ID.'),

    taskId: z.string().optional().describe('Filter events by parent task ID (for subtask events).'),

    initiatorId: z.string().optional().describe('Filter by the user ID who initiated the event.'),

    limit: z
        .number()
        .int()
        .min(1)
        .max(ApiLimits.ACTIVITY_MAX)
        .default(ApiLimits.ACTIVITY_DEFAULT)
        .describe('Maximum number of activity events to return.'),

    cursor: z
        .string()
        .optional()
        .describe('Pagination cursor for retrieving the next page of results.'),
}

const findActivity = {
    name: ToolNames.FIND_ACTIVITY,
    description:
        'Retrieve recent activity logs to monitor and audit changes in Todoist. Shows events from all users by default (use initiatorId to filter by specific user). Track task completions, updates, deletions, project changes, and more with flexible filtering. Note: Date-based filtering is not supported by the Todoist API.',
    parameters: ArgsSchema,
    async execute(args, client) {
        const { objectType, objectId, eventType, projectId, taskId, initiatorId, limit, cursor } =
            args

        // Build API arguments
        const apiArgs: Parameters<typeof client.getActivityLogs>[0] = {
            limit,
            cursor: cursor ?? null,
        }

        // Add optional filters
        if (objectType) apiArgs.objectType = objectType
        if (objectId && objectId !== 'remove') apiArgs.objectId = objectId
        if (eventType) apiArgs.eventType = eventType
        if (projectId) apiArgs.parentProjectId = projectId
        if (taskId) apiArgs.parentItemId = taskId
        if (initiatorId) apiArgs.initiatorId = initiatorId

        // Fetch activity logs from API
        const { results, nextCursor } = await client.getActivityLogs(apiArgs)
        const events = results.map(mapActivityEvent)

        // Generate text content
        const textContent = generateTextContent({
            events,
            args,
            nextCursor,
        })

        return getToolOutput({
            textContent,
            structuredContent: {
                events,
                nextCursor,
                totalCount: events.length,
                hasMore: Boolean(nextCursor),
                appliedFilters: args,
            },
        })
    },
} satisfies TodoistTool<typeof ArgsSchema>

function generateTextContent({
    events,
    args,
    nextCursor,
}: {
    events: ReturnType<typeof mapActivityEvent>[]
    args: z.infer<z.ZodObject<typeof ArgsSchema>>
    nextCursor: string | null
}) {
    // Generate subject description
    let subject = 'Activity events'

    // Build subject based on filters
    const subjectParts: string[] = []
    if (args.eventType) {
        subjectParts.push(`${args.eventType}`)
    }
    if (args.objectType) {
        const objectLabel = args.objectType === 'task' ? 'tasks' : `${args.objectType}s`
        subjectParts.push(objectLabel)
    }

    if (subjectParts.length > 0) {
        subject = `Activity: ${subjectParts.join(' ')}`
    }

    // Generate filter hints
    const filterHints: string[] = []

    if (args.objectId) {
        filterHints.push(`object ID: ${args.objectId}`)
    }
    if (args.projectId) {
        filterHints.push(`project: ${args.projectId}`)
    }
    if (args.taskId) {
        filterHints.push(`task: ${args.taskId}`)
    }
    if (args.initiatorId) {
        filterHints.push(`initiator: ${args.initiatorId}`)
    }

    // Generate helpful suggestions for empty results
    const zeroReasonHints: string[] = []
    if (events.length === 0) {
        zeroReasonHints.push('No activity events match the specified filters')
        zeroReasonHints.push('Note: Activity logs only show recent events')

        if (args.eventType) {
            zeroReasonHints.push(`Try removing the eventType filter (${args.eventType})`)
        }
        if (args.objectType) {
            zeroReasonHints.push(`Try removing the objectType filter (${args.objectType})`)
        }
        if (args.objectId || args.projectId || args.taskId) {
            zeroReasonHints.push('Verify the object ID is correct')
        }
    }

    // Generate contextual next steps
    const nextSteps: string[] = []
    if (events.length > 0) {
        // Suggest related tools based on what was found
        const hasTaskEvents = events.some((e) => e.objectType === 'task' || e.objectType === 'item')
        const hasCompletions = events.some((e) => e.eventType === 'completed')

        if (hasTaskEvents) {
            nextSteps.push(`Use ${FIND_TASKS} to view current task details`)
        }
        if (hasCompletions) {
            nextSteps.push('Review completed tasks to track productivity')
        }
        if (args.initiatorId) {
            nextSteps.push(`Use ${USER_INFO} to get details about the user`)
        }

        // Suggest narrowing down if too many results
        if (events.length >= args.limit && !nextCursor) {
            nextSteps.push('Add more specific filters to narrow down results')
        }
    }

    return summarizeList({
        subject,
        count: events.length,
        limit: args.limit,
        nextCursor: nextCursor ?? undefined,
        filterHints,
        previewLines: previewActivityEvents(events, Math.min(events.length, args.limit)),
        zeroReasonHints,
        nextSteps,
    })
}

/**
 * Formats activity events into readable preview lines
 */
function previewActivityEvents(events: ReturnType<typeof mapActivityEvent>[], limit = 10): string {
    const previewEvents = events.slice(0, limit)
    const lines = previewEvents.map(formatActivityEventPreview).join('\n')

    // If we're showing fewer events than the total, add an indicator
    if (events.length > limit) {
        const remaining = events.length - limit
        return `${lines}\n    ... and ${remaining} more event${remaining === 1 ? '' : 's'}`
    }

    return lines
}

/**
 * Formats a single activity event into a readable preview line
 */
function formatActivityEventPreview(event: ReturnType<typeof mapActivityEvent>): string {
    const date = formatEventDate(event.eventDate)
    const eventLabel = `${event.eventType} ${event.objectType}`

    // Extract useful content from extraData if available
    let contentInfo = ''
    if (event.extraData) {
        const content =
            event.extraData.content || event.extraData.name || event.extraData.last_content
        if (content && typeof content === 'string') {
            // Truncate long content
            const truncated = content.length > 50 ? `${content.substring(0, 47)}...` : content
            contentInfo = ` • "${truncated}"`
        }
    }

    const objectId = event.objectId ? ` • id=${event.objectId}` : ''
    const initiator = event.initiatorId ? ` • by=${event.initiatorId}` : ' • system'
    const projectInfo = event.parentProjectId ? ` • project=${event.parentProjectId}` : ''

    return `    [${date}] ${eventLabel}${contentInfo}${objectId}${initiator}${projectInfo}`
}

/**
 * Formats an ISO date string to a more readable format
 */
function formatEventDate(isoDate: string): string {
    try {
        const date = new Date(isoDate)
        // Format as: Oct 23, 14:30 (in UTC for deterministic snapshots)
        const month = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
        const day = date.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'UTC' })
        const time = date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'UTC',
        })
        return `${month} ${day}, ${time}`
    } catch {
        return isoDate
    }
}

export { findActivity }
