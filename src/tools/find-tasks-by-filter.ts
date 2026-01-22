import { z } from 'zod'
import {
    appendToQuery,
    buildResponsibleUserQueryFilter,
    RESPONSIBLE_USER_FILTERING,
    resolveResponsibleUser,
} from '../filter-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { getTasksByFilter, type MappedTask } from '../tool-helpers.js'
import { ApiLimits } from '../utils/constants.js'
import { generateLabelsFilter, LabelsSchema } from '../utils/labels.js'
import { TaskSchema as TaskOutputSchema } from '../utils/output-schemas.js'
import { previewTasks, summarizeList } from '../utils/response-builders.js'
import { ToolNames } from '../utils/tool-names.js'

const SORT_BY_OPTIONS = ['priority', 'due_date', 'project', 'created', 'order', 'default'] as const
type SortByOption = (typeof SORT_BY_OPTIONS)[number]

const SORT_ORDER_OPTIONS = ['asc', 'desc'] as const
type SortOrderOption = (typeof SORT_ORDER_OPTIONS)[number]

const ArgsSchema = {
    filter: z
        .string()
        .min(1)
        .describe(
            'Raw Todoist filter query string. Examples: "##Work" (tasks from Work project and all sub-projects), "(today | overdue) & p1" (high-priority due/overdue tasks), "#Inbox" (tasks in Inbox).',
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
    sortBy: z
        .enum(SORT_BY_OPTIONS)
        .optional()
        .describe(
            'Sort results by field. "priority" (p1 first by default), "due_date" (soonest first by default), "project" (alphabetical), "created" (newest first by default), "order" (task order position, lowest first by default), "default" (Todoist natural order).',
        ),
    sortOrder: z
        .enum(SORT_ORDER_OPTIONS)
        .optional()
        .describe(
            'Sort direction: "asc" (ascending) or "desc" (descending). Default varies by sortBy: priority=desc, due_date=asc, project=asc, created=desc.',
        ),
    responsibleUser: z
        .string()
        .optional()
        .describe('Find tasks assigned to this user. Can be a user ID, name, or email address.'),
    responsibleUserFiltering: z
        .enum(RESPONSIBLE_USER_FILTERING)
        .optional()
        .describe(
            'How to filter by responsible user when responsibleUser is not provided. "assigned" = only tasks assigned to others; "unassignedOrMe" = only unassigned tasks or tasks assigned to me; "all" = all tasks regardless of assignment. Default is "all" to preserve the filter behavior.',
        ),
    ...LabelsSchema,
}

const OutputSchema = {
    tasks: z.array(TaskOutputSchema).describe('The found tasks.'),
    nextCursor: z.string().optional().describe('Cursor for the next page of results.'),
    totalCount: z.number().describe('The total number of tasks in this page.'),
    hasMore: z.boolean().describe('Whether there are more results available.'),
    appliedFilter: z.string().describe('The final filter query that was executed (for debugging).'),
}

/**
 * Get the default sort order for a given sortBy option
 */
function getDefaultSortOrder(sortBy: SortByOption): SortOrderOption {
    switch (sortBy) {
        case 'priority':
            return 'desc' // p1 (highest) first
        case 'due_date':
            return 'asc' // soonest first
        case 'project':
            return 'asc' // alphabetical
        case 'created':
            return 'desc' // newest first
        case 'order':
            return 'asc' // lowest order first
        default:
            return 'asc'
    }
}

/**
 * Sort tasks based on the specified sortBy and sortOrder options
 */
function sortTasks(
    tasks: MappedTask[],
    sortBy: SortByOption | undefined,
    sortOrder: SortOrderOption | undefined,
): MappedTask[] {
    if (!sortBy || sortBy === 'default') {
        return tasks
    }

    const order = sortOrder ?? getDefaultSortOrder(sortBy)
    const multiplier = order === 'asc' ? 1 : -1

    return [...tasks].sort((a, b) => {
        switch (sortBy) {
            case 'priority': {
                // p1 > p2 > p3 > p4 (p1 is highest priority)
                // Priority values: p1=1, p2=2, p3=3, p4=4
                const priorityA = parseInt(a.priority.replace('p', ''), 10)
                const priorityB = parseInt(b.priority.replace('p', ''), 10)
                // For priority, "desc" means highest priority (p1) first
                // Since p1=1 is numerically lower, we need to invert the multiplier
                // desc (high priority first): ascending numeric sort (1,2,3,4)
                // asc (low priority first): descending numeric sort (4,3,2,1)
                return (priorityA - priorityB) * -multiplier
            }
            case 'due_date': {
                // Tasks without due dates go to the end
                if (!a.dueDate && !b.dueDate) return 0
                if (!a.dueDate) return 1 // a goes after b
                if (!b.dueDate) return -1 // b goes after a
                return a.dueDate.localeCompare(b.dueDate) * multiplier
            }
            case 'project': {
                // Sort by project ID (alphabetical)
                return a.projectId.localeCompare(b.projectId) * multiplier
            }
            case 'created': {
                // Sort by task ID (as a proxy for creation time, since IDs are sequential)
                return a.id.localeCompare(b.id) * multiplier
            }
            case 'order': {
                // Sort by task order position within project
                return (a.order - b.order) * multiplier
            }
            default:
                return 0
        }
    })
}

const findTasksByFilter = {
    name: ToolNames.FIND_TASKS_BY_FILTER,
    description:
        'Find tasks using a raw Todoist filter query. Enables advanced queries like "##Work" (project hierarchy including sub-projects), "(today | overdue) & p1" (complex filters), or "#Project" (single project). Use this when you need full Todoist filter syntax.',
    parameters: ArgsSchema,
    outputSchema: OutputSchema,
    mutability: 'readonly' as const,
    async execute(args, client) {
        // Resolve assignee name to user ID if provided
        const resolved = await resolveResponsibleUser(client, args.responsibleUser)
        const resolvedAssigneeId = resolved?.userId
        const assigneeEmail = resolved?.email

        // Start with the user's filter query
        let query = args.filter

        // Add labels filter if provided
        const labelsFilter = generateLabelsFilter(args.labels, args.labelsOperator)
        if (labelsFilter.length > 0) {
            query = appendToQuery(query, labelsFilter)
        }

        // Add responsible user filtering to the query
        // Default to 'all' to preserve the user's filter behavior
        const responsibleUserFilter = buildResponsibleUserQueryFilter({
            resolvedAssigneeId,
            assigneeEmail,
            responsibleUserFiltering: args.responsibleUserFiltering ?? 'all',
        })
        query = appendToQuery(query, responsibleUserFilter)

        const { tasks, nextCursor } = await getTasksByFilter({
            client,
            query,
            cursor: args.cursor,
            limit: args.limit,
        })

        // Apply client-side sorting
        const sortedTasks = sortTasks(tasks, args.sortBy, args.sortOrder)

        const textContent = generateTextContent({
            tasks: sortedTasks,
            args,
            nextCursor,
            assigneeEmail,
            appliedFilter: query,
        })

        return {
            textContent,
            structuredContent: {
                tasks: sortedTasks,
                nextCursor: nextCursor ?? undefined,
                totalCount: sortedTasks.length,
                hasMore: Boolean(nextCursor),
                appliedFilter: query,
            },
        }
    },
} satisfies TodoistTool<typeof ArgsSchema, typeof OutputSchema>

function generateTextContent({
    tasks,
    args,
    nextCursor,
    assigneeEmail,
    appliedFilter,
}: {
    tasks: MappedTask[]
    args: z.infer<z.ZodObject<typeof ArgsSchema>>
    nextCursor: string | null
    assigneeEmail?: string
    appliedFilter: string
}) {
    const filterHints: string[] = []
    const zeroReasonHints: string[] = []

    // Add the filter query as a hint
    filterHints.push(`query: ${appliedFilter}`)

    // Add label filter information
    if (args.labels && args.labels.length > 0) {
        const labelText = args.labels
            .map((label) => `@${label}`)
            .join(args.labelsOperator === 'and' ? ' & ' : ' | ')
        filterHints.push(`labels: ${labelText}`)
    }

    // Add responsible user filter information
    if (args.responsibleUser) {
        const email = assigneeEmail || args.responsibleUser
        filterHints.push(`assigned to: ${email}`)
    }

    // Add sorting information
    if (args.sortBy && args.sortBy !== 'default') {
        const order = args.sortOrder ?? getDefaultSortOrder(args.sortBy)
        filterHints.push(`sorted by: ${args.sortBy} (${order})`)
    }

    // Generate subject description
    let subject = `Tasks matching filter "${args.filter}"`
    if (args.responsibleUser) {
        const email = assigneeEmail || args.responsibleUser
        subject += ` assigned to ${email}`
    }

    // Generate helpful suggestions for empty results
    if (tasks.length === 0) {
        zeroReasonHints.push('Verify filter syntax is correct')
        zeroReasonHints.push('Try a simpler filter to confirm project/label names')
        if (args.filter.startsWith('##')) {
            zeroReasonHints.push('Ensure the parent project exists and has sub-projects')
        } else if (args.filter.startsWith('#')) {
            zeroReasonHints.push('Verify the project name is correct (case-sensitive)')
        }
    }

    return summarizeList({
        subject,
        count: tasks.length,
        limit: args.limit,
        nextCursor: nextCursor ?? undefined,
        filterHints,
        previewLines: previewTasks(tasks, Math.min(tasks.length, args.limit)),
        zeroReasonHints,
    })
}

export { findTasksByFilter }
