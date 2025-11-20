import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool.js'
import { mapComment } from '../tool-helpers.js'
import { CommentSchema as CommentOutputSchema } from '../utils/output-schemas.js'
import { ToolNames } from '../utils/tool-names.js'

const CommentUpdateSchema = z.object({
    id: z.string().min(1).describe('The ID of the comment to update.'),
    content: z.string().min(1).describe('The new content for the comment.'),
})

const ArgsSchema = {
    comments: z.array(CommentUpdateSchema).min(1).describe('The comments to update.'),
}

const OutputSchema = {
    comments: z.array(CommentOutputSchema).describe('The updated comments.'),
    totalCount: z.number().describe('The total number of comments updated.'),
    updatedCommentIds: z.array(z.string()).describe('The IDs of the updated comments.'),
    appliedOperations: z
        .object({
            updateCount: z.number().describe('The number of comments updated.'),
        })
        .describe('Summary of operations performed.'),
}

const updateComments = {
    name: ToolNames.UPDATE_COMMENTS,
    description: 'Update multiple existing comments with new content.',
    parameters: ArgsSchema,
    outputSchema: OutputSchema,
    mutability: 'mutating' as const,
    async execute(args, client) {
        const { comments } = args

        const updateCommentPromises = comments.map(async (comment) => {
            return await client.updateComment(comment.id, { content: comment.content })
        })

        const updatedComments = await Promise.all(updateCommentPromises)
        const mappedComments = updatedComments.map(mapComment)

        const textContent = generateTextContent({
            comments: mappedComments,
        })

        return {
            textContent,
            structuredContent: {
                comments: mappedComments,
                totalCount: mappedComments.length,
                updatedCommentIds: mappedComments.map((comment) => comment.id),
                appliedOperations: {
                    updateCount: mappedComments.length,
                },
            },
        }
    },
} satisfies TodoistTool<typeof ArgsSchema, typeof OutputSchema>

function generateTextContent({ comments }: { comments: ReturnType<typeof mapComment>[] }): string {
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
