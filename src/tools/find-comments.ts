import type { Comment } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { ApiLimits } from '../utils/constants.js'
import { formatNextSteps } from '../utils/response-builders.js'
import { ToolNames } from '../utils/tool-names.js'

const { ADD_COMMENTS, UPDATE_COMMENTS, DELETE_OBJECT } = ToolNames

const ArgsSchema = {
    taskId: z.string().optional().describe('Find comments for a specific task.'),
    projectId: z
        .string()
        .optional()
        .describe(
            'Find comments for a specific project. Project ID should be an ID string, or the text "inbox", for inbox tasks.',
        ),
    commentId: z.string().optional().describe('Get a specific comment by ID.'),
    cursor: z.string().optional().describe('Pagination cursor for retrieving more results.'),
    limit: z
        .number()
        .int()
        .min(1)
        .max(ApiLimits.COMMENTS_MAX)
        .optional()
        .describe('Maximum number of comments to return'),
}

const findComments = {
    name: ToolNames.FIND_COMMENTS,
    description:
        'Find comments by task, project, or get a specific comment by ID. Exactly one of taskId, projectId, or commentId must be provided.',
    parameters: ArgsSchema,
    async execute(args, client) {
        // Validate that exactly one search parameter is provided
        const searchParams = [args.taskId, args.projectId, args.commentId].filter(Boolean)
        if (searchParams.length === 0) {
            throw new Error('Must provide exactly one of: taskId, projectId, or commentId.')
        }
        if (searchParams.length > 1) {
            throw new Error(
                'Cannot provide multiple search parameters. Choose one of: taskId, projectId, or commentId.',
            )
        }

        // Resolve "inbox" to actual inbox project ID if needed
        const resolvedProjectId =
            args.projectId === 'inbox' ? (await client.getUser()).inboxProjectId : args.projectId

        let comments: Comment[]
        let hasMore = false
        let nextCursor: string | null = null

        if (args.commentId) {
            // Get single comment
            const comment = await client.getComment(args.commentId)
            comments = [comment]
        } else if (args.taskId) {
            // Get comments by task
            const response = await client.getComments({
                taskId: args.taskId,
                cursor: args.cursor || null,
                limit: args.limit || ApiLimits.COMMENTS_DEFAULT,
            })
            comments = response.results
            hasMore = response.nextCursor !== null
            nextCursor = response.nextCursor
        } else if (resolvedProjectId) {
            // Get comments by project
            const response = await client.getComments({
                projectId: resolvedProjectId,
                cursor: args.cursor || null,
                limit: args.limit || ApiLimits.COMMENTS_DEFAULT,
            })
            comments = response.results
            hasMore = response.nextCursor !== null
            nextCursor = response.nextCursor
        } else {
            // This should never happen due to validation, but TypeScript needs it
            throw new Error('Invalid state: no search parameter provided')
        }

        const textContent = generateTextContent({
            comments,
            searchType: args.commentId ? 'single' : args.taskId ? 'task' : 'project',
            searchId: args.commentId || args.taskId || args.projectId || '',
            hasMore,
            nextCursor,
        })

        return getToolOutput({
            textContent,
            structuredContent: {
                comments,
                searchType: args.commentId ? 'single' : args.taskId ? 'task' : 'project',
                searchId: args.commentId || args.taskId || args.projectId || '',
                hasMore,
                nextCursor,
                totalCount: comments.length,
            },
        })
    },
} satisfies TodoistTool<typeof ArgsSchema>

function generateTextContent({
    comments,
    searchType,
    searchId,
    hasMore,
    nextCursor,
}: {
    comments: Comment[]
    searchType: 'single' | 'task' | 'project'
    searchId: string
    hasMore: boolean
    nextCursor: string | null
}): string {
    if (comments.length === 0) {
        return `No comments found for ${searchType}${searchType !== 'single' ? ` ${searchId}` : ''}`
    }

    // Build summary
    let summary: string
    if (searchType === 'single') {
        const comment = comments[0]
        if (!comment) {
            return 'Comment not found'
        }
        const hasAttachment = comment.fileAttachment !== null
        const attachmentInfo = hasAttachment
            ? ` • Has attachment: ${comment.fileAttachment?.fileName || 'file'}`
            : ''
        summary = `Found comment${attachmentInfo} • id=${comment.id}`
    } else {
        const attachmentCount = comments.filter((c) => c.fileAttachment !== null).length
        const attachmentInfo = attachmentCount > 0 ? ` (${attachmentCount} with attachments)` : ''
        const commentsLabel = comments.length === 1 ? 'comment' : 'comments'
        summary = `Found ${comments.length} ${commentsLabel} for ${searchType} ${searchId}${attachmentInfo}`

        if (hasMore) {
            summary += ' • More available'
        }
    }

    // Context-aware next steps
    const nextSteps: string[] = []

    if (searchType === 'single') {
        const comment = comments[0]
        if (comment) {
            nextSteps.push(`Use ${UPDATE_COMMENTS} with id=${comment.id} to edit content`)
            nextSteps.push(`Use ${DELETE_OBJECT} with type=comment id=${comment.id} to remove`)

            // Suggest viewing related comments
            if (comment.taskId) {
                nextSteps.push(
                    `Use ${ToolNames.FIND_COMMENTS} with taskId=${comment.taskId} to see all task comments`,
                )
            } else if (comment.projectId) {
                nextSteps.push(
                    `Use ${ToolNames.FIND_COMMENTS} with projectId=${comment.projectId} to see all project comments`,
                )
            }
        }
    } else {
        // Multiple comments
        nextSteps.push(`Use ${ADD_COMMENTS} with ${searchType}Id=${searchId} to add new comment`)

        if (comments.length > 0) {
            nextSteps.push(
                `Use ${ToolNames.FIND_COMMENTS} with commentId to view specific comment details`,
            )
        }

        // Pagination
        if (hasMore && nextCursor) {
            nextSteps.push(
                `Use ${ToolNames.FIND_COMMENTS} with cursor="${nextCursor}" to get more results`,
            )
        }
    }

    const next = formatNextSteps(nextSteps)
    return `${summary}\n${next}`
}

export { findComments }
