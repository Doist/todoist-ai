import type { Comment, TodoistApi } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import { extractStructuredContent, extractTextContent } from '../../utils/test-helpers.js'
import { ToolNames } from '../../utils/tool-names.js'
import { addComments } from '../add-comments.js'

// Mock the Todoist API
const mockTodoistApi = {
    addComment: jest.fn(),
} as unknown as jest.Mocked<TodoistApi>

const { ADD_COMMENTS } = ToolNames

const createMockComment = (overrides: Partial<Comment> = {}): Comment => ({
    id: '12345',
    content: 'Test comment content',
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

describe(`${ADD_COMMENTS} tool`, () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('adding comments to tasks', () => {
        it('should add comment to task without attachment', async () => {
            const mockComment = createMockComment({
                id: '98765',
                content: 'This is a task comment',
                taskId: 'task456',
            })

            mockTodoistApi.addComment.mockResolvedValue(mockComment)

            const result = await addComments.execute(
                {
                    taskId: 'task456',
                    content: 'This is a task comment',
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.addComment).toHaveBeenCalledWith({
                content: 'This is a task comment',
                taskId: 'task456',
            })

            // Verify result is a concise summary
            expect(extractTextContent(result)).toMatchSnapshot()

            // Verify structured content
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    comment: expect.objectContaining({
                        id: '98765',
                        content: 'This is a task comment',
                        taskId: 'task456',
                        fileAttachment: null,
                    }),
                    targetType: 'task',
                    targetId: 'task456',
                }),
            )
        })
    })

    describe('adding comments to projects', () => {
        it('should add comment to project', async () => {
            const mockComment = createMockComment({
                id: '98767',
                content: 'This is a project comment',
                taskId: undefined,
                projectId: 'project789',
            })

            mockTodoistApi.addComment.mockResolvedValue(mockComment)

            const result = await addComments.execute(
                {
                    projectId: 'project789',
                    content: 'This is a project comment',
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.addComment).toHaveBeenCalledWith({
                content: 'This is a project comment',
                projectId: 'project789',
            })

            // Verify result is a concise summary
            expect(extractTextContent(result)).toMatchSnapshot()

            // Verify structured content
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    comment: expect.objectContaining({
                        id: '98767',
                        content: 'This is a project comment',
                        taskId: undefined,
                        projectId: 'project789',
                        fileAttachment: null,
                    }),
                    targetType: 'project',
                    targetId: 'project789',
                }),
            )
        })
    })

    describe('validation', () => {
        it('should throw error when neither taskId nor projectId provided', async () => {
            await expect(
                addComments.execute({ content: 'Test comment' }, mockTodoistApi),
            ).rejects.toThrow('Either taskId or projectId must be provided.')
        })

        it('should throw error when both taskId and projectId provided', async () => {
            await expect(
                addComments.execute(
                    {
                        taskId: 'task123',
                        projectId: 'project456',
                        content: 'Test comment',
                    },
                    mockTodoistApi,
                ),
            ).rejects.toThrow('Cannot provide both taskId and projectId. Choose one.')
        })
    })
})
