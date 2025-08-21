import type { Comment, TodoistApi } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import { extractStructuredContent, extractTextContent } from '../../utils/test-helpers.js'
import { ToolNames } from '../../utils/tool-names.js'
import { updateComments } from '../update-comments.js'

// Mock the Todoist API
const mockTodoistApi = {
    updateComment: jest.fn(),
} as unknown as jest.Mocked<TodoistApi>

const { UPDATE_COMMENTS } = ToolNames

const createMockComment = (overrides: Partial<Comment> = {}): Comment => ({
    id: '12345',
    content: 'Updated comment content',
    postedAt: '2024-01-01T12:00:00Z',
    postedUid: 'user123',
    taskId: 'task123',
    projectId: undefined,
    fileAttachment: null,
    uidsToNotify: null,
    reactions: null,
    isDeleted: false,
    ...overrides,
})

describe(`${UPDATE_COMMENTS} tool`, () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should update comment content', async () => {
        const mockComment = createMockComment({
            id: '98765',
            content: 'Updated content here',
            taskId: 'task456',
        })

        mockTodoistApi.updateComment.mockResolvedValue(mockComment)

        const result = await updateComments.execute(
            {
                id: '98765',
                content: 'Updated content here',
            },
            mockTodoistApi,
        )

        expect(mockTodoistApi.updateComment).toHaveBeenCalledWith('98765', {
            content: 'Updated content here',
        })

        // Verify result is a concise summary
        expect(extractTextContent(result)).toMatchSnapshot()

        // Verify structured content
        const structuredContent = extractStructuredContent(result)
        expect(structuredContent).toEqual(
            expect.objectContaining({
                comment: expect.objectContaining({
                    id: '98765',
                    content: 'Updated content here',
                    taskId: 'task456',
                    fileAttachment: null,
                }),
                operation: 'updated',
            }),
        )
    })

    it('should handle project comment', async () => {
        const mockComment = createMockComment({
            id: '98767',
            content: 'Updated project comment',
            taskId: undefined,
            projectId: 'project789',
        })

        mockTodoistApi.updateComment.mockResolvedValue(mockComment)

        const result = await updateComments.execute(
            {
                id: '98767',
                content: 'Updated project comment',
            },
            mockTodoistApi,
        )

        // Verify result is a concise summary
        expect(extractTextContent(result)).toMatchSnapshot()

        // Verify structured content
        const structuredContent = extractStructuredContent(result)
        expect(structuredContent).toEqual(
            expect.objectContaining({
                comment: expect.objectContaining({
                    id: '98767',
                    content: 'Updated project comment',
                    taskId: undefined,
                    projectId: 'project789',
                    fileAttachment: null,
                }),
                operation: 'updated',
            }),
        )
    })
})
