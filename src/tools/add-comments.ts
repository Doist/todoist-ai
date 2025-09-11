import type { AddCommentArgs, Comment } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { formatNextSteps } from '../utils/response-builders.js'
import { ToolNames } from '../utils/tool-names.js'

const { FIND_COMMENTS, UPDATE_COMMENTS, DELETE_OBJECT } = ToolNames

const CommentSchema = z.object({
    taskId: z.string().optional().describe('The ID of the task to comment on.'),
    projectId: z.string().optional().describe('The ID of the project to comment on.'),
    content: z.string().min(1).describe('The content of the comment.'),
})

const ArgsSchema = {
    comments: z.array(CommentSchema).min(1).describe('The array of comments to add.'),
}

const addComments = {
    name: ToolNames.ADD_COMMENTS,
    description:
        'Add multiple comments to tasks or projects. Each comment must specify either taskId or projectId.',
    parameters: ArgsSchema,
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

        const addCommentPromises = comments.map(
            async ({ content, taskId, projectId }) =>
                await client.addComment({
                    content,
                    ...(taskId ? { taskId } : { projectId }),
                } as AddCommentArgs),
        )

        const newComments = await Promise.all(addCommentPromises)
        const textContent = generateTextContent({ comments: newComments })

        return getToolOutput({
            textContent,
            structuredContent: {
                comments: newComments,
                totalCount: newComments.length,
                addedCommentIds: newComments.map((comment) => comment.id),
            },
        })
    },
} satisfies TodoistTool<typeof ArgsSchema>

function generateTextContent({ comments }: { comments: Comment[] }): string {
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

    // Context-aware next steps
    const nextSteps: string[] = []
    if (comments.length > 0) {
        if (comments.length === 1 && comments[0]) {
            const comment = comments[0]
            const targetId = comment.taskId || comment.projectId || ''
            const targetType = comment.taskId ? 'task' : 'project'
            nextSteps.push(
                `Use ${FIND_COMMENTS} with ${targetType}Id=${targetId} to see all comments`,
            )
            nextSteps.push(`Use ${UPDATE_COMMENTS} with id=${comment.id} to edit content`)
        } else {
            nextSteps.push(`Use ${FIND_COMMENTS} to view comments by task or project`)
            nextSteps.push(`Use ${UPDATE_COMMENTS} to edit any comment content`)
        }
        nextSteps.push(`Use ${DELETE_OBJECT} with type=comment to remove comments`)
    }

    const next = formatNextSteps(nextSteps)
    return `${summary}\n${next}`
}

export { addComments }
