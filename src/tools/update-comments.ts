import type { Comment } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { formatNextSteps } from '../utils/response-builders.js'
import { ToolNames } from '../utils/tool-names.js'

const { FIND_COMMENTS, DELETE_OBJECT } = ToolNames

const CommentUpdateSchema = z.object({
    id: z.string().min(1).describe('The ID of the comment to update.'),
    content: z.string().min(1).describe('The new content for the comment.'),
})

const ArgsSchema = {
    comments: z.array(CommentUpdateSchema).min(1).describe('The comments to update.'),
}

const updateComments = {
    name: ToolNames.UPDATE_COMMENTS,
    description: 'Update multiple existing comments with new content.',
    parameters: ArgsSchema,
    async execute(args, client) {
        const { comments } = args

        const updateCommentPromises = comments.map(async (comment) => {
            return await client.updateComment(comment.id, { content: comment.content })
        })

        const updatedComments = await Promise.all(updateCommentPromises)

        const textContent = generateTextContent({
            comments: updatedComments,
        })

        return getToolOutput({
            textContent,
            structuredContent: {
                comments: updatedComments,
                totalCount: updatedComments.length,
                updatedCommentIds: updatedComments.map((comment) => comment.id),
                appliedOperations: {
                    updateCount: updatedComments.length,
                },
            },
        })
    },
} satisfies TodoistTool<typeof ArgsSchema>

function generateNextSteps(comments: Comment[]): string[] {
    const nextSteps: string[] = []

    // Early return for empty comments
    if (comments.length === 0) {
        return nextSteps
    }

    // Multiple comments case
    if (comments.length > 1) {
        nextSteps.push(`Use ${FIND_COMMENTS} to view comments by task or project`)
        nextSteps.push(`Use ${DELETE_OBJECT} with type=comment to remove comments`)
        return nextSteps
    }

    // Single comment case
    const comment = comments[0]
    if (!comment) return nextSteps

    if (comment.taskId) {
        nextSteps.push(
            `Use ${FIND_COMMENTS} with taskId=${comment.taskId} to see all task comments`,
        )
    } else if (comment.projectId) {
        nextSteps.push(
            `Use ${FIND_COMMENTS} with projectId=${comment.projectId} to see all project comments`,
        )
    }
    nextSteps.push(`Use ${DELETE_OBJECT} with type=comment id=${comment.id} to remove comment`)
    return nextSteps
}

function generateTextContent({
    comments,
}: {
    comments: Comment[]
}): string {
    // Group comments by entity type and count
    const taskComments = comments.filter((c) => c.taskId).length
    const projectComments = comments.filter((c) => c.projectId).length

    const parts: string[] = []
    if (taskComments > 0) {
        const commentsLabel = taskComments > 1 ? 'comments' : 'comment'
        parts.push(`${taskComments} task ${commentsLabel}`)
    }
    if (projectComments > 0) {
        const commentsLabel = projectComments > 1 ? 'comments' : 'comment'
        parts.push(`${projectComments} project ${commentsLabel}`)
    }
    const summary = parts.length > 0 ? `Updated ${parts.join(' and ')}` : 'No comments updated'

    const nextSteps = generateNextSteps(comments)
    const next = formatNextSteps(nextSteps)
    return `${summary}\n${next}`
}

export { updateComments }
