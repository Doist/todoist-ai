import type { Comment, TodoistApi } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import { extractStructuredContent, extractTextContent } from '../../utils/test-helpers.js'
import { ToolNames } from '../../utils/tool-names.js'
import { findComments } from '../find-comments.js'

// Mock the Todoist API
const mockTodoistApi = {
    getComment: jest.fn(),
    getComments: jest.fn(),
} as unknown as jest.Mocked<TodoistApi>

const { FIND_COMMENTS } = ToolNames

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

describe(`${FIND_COMMENTS} tool`, () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('finding comments by task', () => {
        it('should find comments for a task', async () => {
            const mockComments = [
                createMockComment({ id: '1', content: 'First comment', taskId: 'task123' }),
                createMockComment({ id: '2', content: 'Second comment', taskId: 'task123' }),
            ]

            mockTodoistApi.getComments.mockResolvedValue({
                results: mockComments,
                nextCursor: null,
            })

            const result = await findComments.execute(
                {
                    taskId: 'task123',
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.getComments).toHaveBeenCalledWith({
                taskId: 'task123',
                cursor: null,
                limit: 10,
            })

            // Verify result is a concise summary
            expect(extractTextContent(result)).toMatchSnapshot()

            // Verify structured content
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    comments: expect.arrayContaining([
                        expect.objectContaining({ id: '1', content: 'First comment' }),
                        expect.objectContaining({ id: '2', content: 'Second comment' }),
                    ]),
                    searchType: 'task',
                    searchId: 'task123',
                    hasMore: false,
                    nextCursor: null,
                    totalCount: 2,
                }),
            )
        })

        it('should handle pagination', async () => {
            const mockComments = [createMockComment({ id: '1', content: 'Comment 1' })]

            mockTodoistApi.getComments.mockResolvedValue({
                results: mockComments,
                nextCursor: 'next_page_token',
            })

            const result = await findComments.execute(
                {
                    taskId: 'task123',
                    limit: 1,
                    cursor: 'current_cursor',
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.getComments).toHaveBeenCalledWith({
                taskId: 'task123',
                cursor: 'current_cursor',
                limit: 1,
            })

            // Verify result includes pagination info
            expect(extractTextContent(result)).toMatchSnapshot()

            // Verify structured content includes pagination
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    comments: expect.arrayContaining([
                        expect.objectContaining({ id: '1', content: 'Comment 1' }),
                    ]),
                    searchType: 'task',
                    searchId: 'task123',
                    hasMore: true,
                    nextCursor: 'next_page_token',
                    totalCount: 1,
                }),
            )
        })
    })

    describe('finding comments by project', () => {
        it('should find comments for a project', async () => {
            const mockComments = [
                createMockComment({
                    id: '1',
                    content: 'Project comment',
                    taskId: undefined,
                    projectId: 'project456',
                }),
            ]

            mockTodoistApi.getComments.mockResolvedValue({
                results: mockComments,
                nextCursor: null,
            })

            const result = await findComments.execute(
                {
                    projectId: 'project456',
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.getComments).toHaveBeenCalledWith({
                projectId: 'project456',
                cursor: null,
                limit: 10,
            })

            // Verify result is a concise summary
            expect(extractTextContent(result)).toMatchSnapshot()

            // Verify structured content
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    comments: expect.arrayContaining([
                        expect.objectContaining({
                            id: '1',
                            content: 'Project comment',
                            projectId: 'project456',
                        }),
                    ]),
                    searchType: 'project',
                    searchId: 'project456',
                    hasMore: false,
                    nextCursor: null,
                    totalCount: 1,
                }),
            )
        })
    })

    describe('finding single comment', () => {
        it('should find comment by ID', async () => {
            const mockComment = createMockComment({
                id: 'comment789',
                content: 'Single comment content',
                taskId: 'task123',
            })

            mockTodoistApi.getComment.mockResolvedValue(mockComment)

            const result = await findComments.execute(
                {
                    commentId: 'comment789',
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.getComment).toHaveBeenCalledWith('comment789')

            // Verify result is a concise summary
            expect(extractTextContent(result)).toMatchSnapshot()

            // Verify structured content
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    comments: expect.arrayContaining([
                        expect.objectContaining({
                            id: 'comment789',
                            content: 'Single comment content',
                            taskId: 'task123',
                            fileAttachment: null,
                        }),
                    ]),
                    searchType: 'single',
                    searchId: 'comment789',
                    hasMore: false,
                    nextCursor: null,
                    totalCount: 1,
                }),
            )
        })

        it('should handle comment with attachment', async () => {
            const mockComment = createMockComment({
                id: 'comment789',
                content: 'Comment with file',
                fileAttachment: {
                    resourceType: 'file',
                    fileName: 'document.pdf',
                    fileUrl: 'https://example.com/document.pdf',
                    fileType: 'application/pdf',
                },
            })

            mockTodoistApi.getComment.mockResolvedValue(mockComment)

            const result = await findComments.execute(
                {
                    commentId: 'comment789',
                },
                mockTodoistApi,
            )

            // Verify result includes attachment info
            expect(extractTextContent(result)).toMatchSnapshot()

            // Verify structured content includes attachment
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    comments: expect.arrayContaining([
                        expect.objectContaining({
                            id: 'comment789',
                            content: 'Comment with file',
                            fileAttachment: expect.objectContaining({
                                resourceType: 'file',
                                fileName: 'document.pdf',
                                fileUrl: 'https://example.com/document.pdf',
                                fileType: 'application/pdf',
                            }),
                        }),
                    ]),
                    searchType: 'single',
                    searchId: 'comment789',
                    hasMore: false,
                    nextCursor: null,
                    totalCount: 1,
                }),
            )
        })
    })

    describe('validation', () => {
        it('should throw error when no search parameter provided', async () => {
            await expect(findComments.execute({}, mockTodoistApi)).rejects.toThrow(
                'Must provide exactly one of: taskId, projectId, or commentId.',
            )
        })

        it('should throw error when multiple search parameters provided', async () => {
            await expect(
                findComments.execute(
                    {
                        taskId: 'task123',
                        projectId: 'project456',
                    },
                    mockTodoistApi,
                ),
            ).rejects.toThrow('Cannot provide multiple search parameters.')
        })
    })

    describe('empty results', () => {
        it('should handle no comments found', async () => {
            mockTodoistApi.getComments.mockResolvedValue({
                results: [],
                nextCursor: null,
            })

            const result = await findComments.execute(
                {
                    taskId: 'task123',
                },
                mockTodoistApi,
            )

            // Verify result handles empty case
            expect(extractTextContent(result)).toMatchSnapshot()

            // Verify structured content
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    comments: [],
                    searchType: 'task',
                    searchId: 'task123',
                    hasMore: false,
                    nextCursor: null,
                    totalCount: 0,
                }),
            )
        })
    })
})
