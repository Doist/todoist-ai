import type { Comment } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { ToolNames } from '../utils/tool-names.js'

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

function generateTextContent({ comments }: { comments: Comment[] }): string {
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

    return summary
}

export { updateComments }
