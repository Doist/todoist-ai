import type { AddCommentArgs } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool.js'
import { isInboxProjectId, mapComment, resolveInboxProjectId } from '../tool-helpers.js'
import { CommentSchema as CommentOutputSchema } from '../utils/output-schemas.js'
import { ToolNames } from '../utils/tool-names.js'

const CommentSchema = z.object({
    taskId: z.string().optional().describe('The ID of the task to comment on.'),
    projectId: z
        .string()
        .optional()
        .describe(
            'The ID of the project to comment on. Project ID should be an ID string, or the text "inbox", for inbox tasks.',
        ),
    content: z.string().min(1).describe('The content of the comment.'),
})

const ArgsSchema = {
    comments: z.array(CommentSchema).min(1).describe('The array of comments to add.'),
}

const OutputSchema = {
    comments: z.array(CommentOutputSchema).describe('The created comments.'),
    totalCount: z.number().describe('The total number of comments created.'),
    addedCommentIds: z.array(z.string()).describe('The IDs of the added comments.'),
}

const addComments = {
    name: ToolNames.ADD_COMMENTS,
    description:
        'Add multiple comments to tasks or projects. Each comment must specify either taskId or projectId.',
    parameters: ArgsSchema,
    outputSchema: OutputSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    async execute(args, client) {
        const { comments } = args

        // Validate each comment
        for (const [index, comment] of comments.entries()) {
            if (!comment.taskId && !comment.projectId) {
                throw new Error(
                    `Comment ${index + 1}: Either taskId or projectId must be provided.`,
                )
            }
            if (comment.taskId && comment.projectId) {
                throw new Error(
                    `Comment ${index + 1}: Cannot provide both taskId and projectId. Choose one.`,
                )
            }
        }

        // Check if any comment needs inbox resolution
        const needsInboxResolution = comments.some((comment) => isInboxProjectId(comment.projectId))
        const todoistUser = needsInboxResolution ? await client.getUser() : undefined

        const addCommentPromises = comments.map(async ({ content, taskId, projectId }) => {
            // Resolve "inbox" to actual inbox project ID if needed
            const resolvedProjectId = await resolveInboxProjectId({
                projectId,
                user: todoistUser,
                client: todoistUser ? undefined : client,
            })

            return await client.addComment({
                content,
                ...(taskId ? { taskId } : { projectId: resolvedProjectId }),
            } as AddCommentArgs)
        })

        const newComments = await Promise.all(addCommentPromises)
        const mappedComments = newComments.map(mapComment)
        const textContent = generateTextContent({ comments: mappedComments })

        return {
            textContent,
            structuredContent: {
                comments: mappedComments,
                totalCount: mappedComments.length,
                addedCommentIds: mappedComments.map((comment) => comment.id),
            },
        }
    },
} satisfies TodoistTool<typeof ArgsSchema, typeof OutputSchema>

function generateTextContent({ comments }: { comments: ReturnType<typeof mapComment>[] }): string {
    // Group comments by entity type and count
    const taskComments = comments.filter((c) => c.taskId).length
    const projectComments = comments.filter((c) => c.projectId).length

    // Generate summary text
    const parts: string[] = []
    if (taskComments > 0) {
        const commentsLabel = taskComments > 1 ? 'comments' : 'comment'
        parts.push(`${taskComments} task ${commentsLabel}`)
    }
    if (projectComments > 0) {
        const commentsLabel = projectComments > 1 ? 'comments' : 'comment'
        parts.push(`${projectComments} project ${commentsLabel}`)
    }
    const summary = parts.length > 0 ? `Added ${parts.join(' and ')}` : 'No comments added'

    return summary
}

export { addComments }
