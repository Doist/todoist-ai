import type { Comment } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { formatNextSteps } from '../utils/response-builders.js'
import { ToolNames } from '../utils/tool-names.js'

const { FIND_COMMENTS, DELETE_OBJECT } = ToolNames

const ArgsSchema = {
    id: z.string().min(1).describe('The ID of the comment to update.'),
    content: z.string().min(1).describe('The new content for the comment.'),
}

const updateComments = {
    name: ToolNames.UPDATE_COMMENTS,
    description: 'Update the content of an existing comment.',
    parameters: ArgsSchema,
    async execute(args, client) {
        const comment = await client.updateComment(args.id, { content: args.content })

        const textContent = generateTextContent({ comment })

        return getToolOutput({
            textContent,
            structuredContent: {
                comment,
                operation: 'updated',
            },
        })
    },
} satisfies TodoistTool<typeof ArgsSchema>

function generateTextContent({ comment }: { comment: Comment }): string {
    const hasAttachment = comment.fileAttachment !== null
    const attachmentInfo = hasAttachment
        ? ` • Attachment: ${comment.fileAttachment?.fileName || 'file'}`
        : ''

    const summary = `Updated comment: ${comment.content}${attachmentInfo} • id=${comment.id}`

    // Context-aware next steps
    const nextSteps: string[] = []

    // Suggest follow-up actions based on comment type
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

    const next = formatNextSteps(nextSteps)
    return `${summary}\n${next}`
}

export { updateComments }
