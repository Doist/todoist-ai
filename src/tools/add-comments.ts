import type { AddCommentArgs, Comment } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { formatNextSteps } from '../utils/response-builders.js'
import { ToolNames } from '../utils/tool-names.js'

const { FIND_COMMENTS, UPDATE_COMMENTS, DELETE_OBJECT } = ToolNames

const ArgsSchema = {
    taskId: z.string().optional().describe('The ID of the task to comment on.'),
    projectId: z.string().optional().describe('The ID of the project to comment on.'),
    content: z.string().min(1).describe('The content of the comment.'),
}

const addComments = {
    name: ToolNames.ADD_COMMENTS,
    description: 'Add comments to tasks or projects. Either taskId or projectId is required.',
    parameters: ArgsSchema,
    async execute(args, client) {
        // Validate that exactly one of taskId or projectId is provided
        if (!args.taskId && !args.projectId) {
            throw new Error('Either taskId or projectId must be provided.')
        }
        if (args.taskId && args.projectId) {
            throw new Error('Cannot provide both taskId and projectId. Choose one.')
        }

        const commentArgs: AddCommentArgs = {
            content: args.content,
            ...(args.taskId ? { taskId: args.taskId } : { projectId: args.projectId }),
        } as AddCommentArgs

        const comment = await client.addComment(commentArgs)

        const textContent = generateTextContent({
            comment,
            targetType: args.taskId ? 'task' : 'project',
            targetId: args.taskId || args.projectId || '',
        })

        return getToolOutput({
            textContent,
            structuredContent: {
                comment,
                targetType: args.taskId ? 'task' : 'project',
                targetId: args.taskId || args.projectId || '',
            },
        })
    },
} satisfies TodoistTool<typeof ArgsSchema>

function generateTextContent({
    comment,
    targetType,
    targetId,
}: {
    comment: Comment
    targetType: 'task' | 'project'
    targetId: string
}): string {
    const hasAttachment = comment.fileAttachment !== null
    const attachmentInfo = hasAttachment
        ? ` • Attachment: ${comment.fileAttachment?.fileName || 'file'}`
        : ''

    const summary = `Added comment to ${targetType}: ${comment.content}${attachmentInfo} • id=${comment.id}`

    // Context-aware next steps
    const nextSteps: string[] = []

    // Suggest follow-up actions
    nextSteps.push(`Use ${FIND_COMMENTS} with ${targetType}Id=${targetId} to see all comments`)
    nextSteps.push(`Use ${UPDATE_COMMENTS} with id=${comment.id} to edit content`)
    nextSteps.push(`Use ${DELETE_OBJECT} with type=comment id=${comment.id} to remove comment`)

    const next = formatNextSteps(nextSteps)
    return `${summary}\n${next}`
}

export { addComments }
