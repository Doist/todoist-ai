import type { AddCommentArgs, Comment } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { formatNextSteps } from '../utils/response-builders.js'
import { ToolNames } from '../utils/tool-names.js'

const { FIND_COMMENTS, UPDATE_COMMENTS, DELETE_OBJECT } = ToolNames

const CommentSchema = z
    .object({
        taskId: z.string().optional().describe('The ID of the task to comment on.'),
        projectId: z.string().optional().describe('The ID of the project to comment on.'),
        content: z.string().min(1).describe('The content of the comment.'),
        fileData: z
            .string()
            .optional()
            .describe('Base64-encoded file content to attach to the comment.'),
        fileName: z
            .string()
            .optional()
            .describe('Name of the file (required when fileData is provided).'),
        fileType: z
            .string()
            .optional()
            .describe('MIME type of the file (e.g., "application/pdf", "image/png").'),
    })
    .refine(
        (data) => {
            // If fileData is provided, fileName is required
            return !data.fileData || data.fileName
        },
        {
            message: 'fileName is required when fileData is provided',
        },
    )

const ArgsSchema = {
    comments: z.array(CommentSchema).min(1).describe('The array of comments to add.'),
}

const addComments = {
    name: ToolNames.ADD_COMMENTS,
    description:
        'Add multiple comments to tasks or projects. Each comment must specify either taskId or projectId. Optionally attach files by providing base64-encoded fileData and fileName.',
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
            async ({ content, taskId, projectId, fileData, fileName, fileType }) => {
                let attachment = null

                // Handle file upload if file data is provided
                if (fileData && fileName) {
                    try {
                        const buffer = Buffer.from(fileData, 'base64')
                        const uploadResult = await client.uploadFile({
                            file: buffer,
                            fileName: fileName,
                            projectId: projectId || undefined,
                        })

                        attachment = {
                            fileUrl: uploadResult.fileUrl || '',
                            fileName: uploadResult.fileName || fileName,
                            fileType: fileType || uploadResult.fileType || undefined,
                            resourceType: uploadResult.resourceType || 'file',
                        }
                    } catch (error) {
                        throw new Error(
                            `Failed to upload file "${fileName}": ${error instanceof Error ? error.message : String(error)}`,
                        )
                    }
                }

                return await client.addComment({
                    content,
                    ...(taskId ? { taskId } : { projectId }),
                    ...(attachment ? { attachment } : {}),
                } as AddCommentArgs)
            },
        )

        const newComments = await Promise.all(addCommentPromises)
        const textContent = generateTextContent({ comments: newComments })

        return getToolOutput({
            textContent,
            structuredContent: {
                comments: newComments,
                totalCount: newComments.length,
                addedCommentIds: newComments.map((comment) => comment.id),
                attachmentCount: newComments.filter((c) => c.fileAttachment !== null).length,
                commentsWithAttachments: newComments
                    .filter((c) => c.fileAttachment !== null)
                    .map((c) => ({
                        commentId: c.id,
                        fileName: c.fileAttachment?.fileName || 'Unknown',
                        fileType: c.fileAttachment?.fileType || undefined,
                    })),
            },
        })
    },
} satisfies TodoistTool<typeof ArgsSchema>

function generateTextContent({ comments }: { comments: Comment[] }): string {
    // Group comments by entity type and count
    const taskComments = comments.filter((c) => c.taskId).length
    const projectComments = comments.filter((c) => c.projectId).length
    const attachmentCount = comments.filter((c) => c.fileAttachment !== null).length

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

    let summary = parts.length > 0 ? `Added ${parts.join(' and ')}` : 'No comments added'

    // Add attachment information
    if (attachmentCount > 0) {
        summary += ` (${attachmentCount} with an attachment)`
    }

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
