import type { CurrentUser, Task, TodoistApi } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import { createMockTask, extractTextContent } from '../../utils/test-helpers.js'
import { ToolNames } from '../../utils/tool-names.js'
import { findCompletedTasks } from '../find-completed-tasks.js'

// Mock the Todoist API
const mockTodoistApi = {
    getCompletedTasksByCompletionDate: jest.fn(),
    getCompletedTasksByDueDate: jest.fn(),
    getUser: jest.fn(),
} as unknown as jest.Mocked<TodoistApi>

const { FIND_COMPLETED_TASKS } = ToolNames

describe(`${FIND_COMPLETED_TASKS} tool`, () => {
    beforeEach(() => {
        jest.clearAllMocks()

        // Mock default user with UTC timezone
        mockTodoistApi.getUser.mockResolvedValue({
            id: 'test-user-id',
            fullName: 'Test User',
            email: 'test@example.com',
            tzInfo: {
                timezone: 'UTC',
                gmtString: '+00:00',
                hours: 0,
                minutes: 0,
                isDst: 0,
            },
        } as CurrentUser)
    })

    describe('getting completed tasks by completion date (default)', () => {
        it('should get completed tasks by completion date', async () => {
            const mockCompletedTasks: Task[] = [
                createMockTask({
                    id: '8485093748',
                    content: 'Completed task 1',
                    description: 'Task completed yesterday',
                    completedAt: '2024-01-01T00:00:00Z',
                    labels: ['work'],
                    priority: 2,
                    url: 'https://todoist.com/showTask?id=8485093748',
                    addedAt: '2025-08-13T22:09:56.123456Z',
                    due: {
                        date: '2025-08-14',
                        isRecurring: false,
                        lang: 'en',
                        string: 'Aug 14',
                        timezone: null,
                    },
                }),
            ]

            mockTodoistApi.getCompletedTasksByCompletionDate.mockResolvedValue({
                items: mockCompletedTasks,
                nextCursor: null,
            })

            const result = await findCompletedTasks.execute(
                {
                    getBy: 'completion',
                    limit: 50,
                    since: '2025-08-10',
                    until: '2025-08-15',
                    labels: [],
                    labelsOperator: 'or' as const,
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.getCompletedTasksByCompletionDate).toHaveBeenCalledWith({
                since: '2025-08-10T00:00:00.000Z',
                until: '2025-08-15T23:59:59.000Z',
                limit: 50,
            })

            expect(extractTextContent(result)).toMatchSnapshot()
        })

        it('should handle explicit completion date query', async () => {
            mockTodoistApi.getCompletedTasksByCompletionDate.mockResolvedValue({
                items: [],
                nextCursor: 'next-cursor',
            })

            const result = await findCompletedTasks.execute(
                {
                    getBy: 'completion',
                    limit: 100,
                    since: '2025-08-01',
                    until: '2025-08-31',
                    projectId: 'specific-project-id',
                    cursor: 'current-cursor',
                    labels: [],
                    labelsOperator: 'or' as const,
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.getCompletedTasksByCompletionDate).toHaveBeenCalledWith({
                since: '2025-08-01T00:00:00.000Z',
                until: '2025-08-31T23:59:59.000Z',
                projectId: 'specific-project-id',
                limit: 100,
                cursor: 'current-cursor',
            })

            expect(extractTextContent(result)).toMatchSnapshot()
        })
    })

    describe('getting completed tasks by due date', () => {
        it('should get completed tasks by due date', async () => {
            const mockCompletedTasks: Task[] = [
                createMockTask({
                    id: '8485093750',
                    content: 'Task completed by due date',
                    description: 'This task was due and completed',
                    completedAt: '2024-01-01T00:00:00Z',
                    labels: ['urgent'],
                    priority: 3,
                    url: 'https://todoist.com/showTask?id=8485093750',
                    addedAt: '2025-08-13T22:09:58.123456Z',
                    due: {
                        date: '2025-08-15',
                        isRecurring: true,
                        lang: 'en',
                        string: 'every Monday',
                        timezone: null,
                    },
                }),
            ]

            mockTodoistApi.getCompletedTasksByDueDate.mockResolvedValue({
                items: mockCompletedTasks,
                nextCursor: null,
            })

            const result = await findCompletedTasks.execute(
                {
                    getBy: 'due',
                    limit: 50,
                    since: '2025-08-10',
                    until: '2025-08-20',
                    labels: [],
                    labelsOperator: 'or' as const,
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.getCompletedTasksByDueDate).toHaveBeenCalledWith({
                since: '2025-08-10T00:00:00.000Z',
                until: '2025-08-20T23:59:59.000Z',
                limit: 50,
            })
            expect(mockTodoistApi.getCompletedTasksByCompletionDate).not.toHaveBeenCalled()

            expect(extractTextContent(result)).toMatchSnapshot()
        })
    })

    describe('label filtering', () => {
        it.each([
            {
                name: 'single label with OR operator',
                params: {
                    getBy: 'completion' as const,
                    since: '2025-08-01',
                    until: '2025-08-31',
                    limit: 50,
                    labels: ['work'],
                },
                expectedMethod: 'getCompletedTasksByCompletionDate',
                expectedFilter: '(@work)',
            },
            {
                name: 'multiple labels with AND operator',
                params: {
                    getBy: 'due' as const,
                    since: '2025-08-01',
                    until: '2025-08-31',
                    limit: 50,
                    labels: ['work', 'urgent'],
                    labelsOperator: 'and' as const,
                },
                expectedMethod: 'getCompletedTasksByDueDate',
                expectedFilter: '(@work  &  @urgent)',
            },
            {
                name: 'multiple labels with OR operator',
                params: {
                    getBy: 'completion' as const,
                    since: '2025-08-10',
                    until: '2025-08-20',
                    limit: 25,
                    labels: ['personal', 'shopping'],
                },
                expectedMethod: 'getCompletedTasksByCompletionDate',
                expectedFilter: '(@personal  |  @shopping)',
            },
        ])(
            'should filter completed tasks by labels: $name',
            async ({ params, expectedMethod, expectedFilter }) => {
                const mockCompletedTasks = [
                    createMockTask({
                        id: '8485093748',
                        content: 'Completed task with label',
                        labels: params.labels,
                        completedAt: '2024-01-01T00:00:00Z',
                    }),
                ]

                const mockResponse = { items: mockCompletedTasks, nextCursor: null }
                const mockMethod = mockTodoistApi[
                    expectedMethod as keyof typeof mockTodoistApi
                ] as jest.MockedFunction<
                    (...args: never[]) => Promise<{ items: unknown[]; nextCursor: string | null }>
                >
                mockMethod.mockResolvedValue(mockResponse)

                const result = await findCompletedTasks.execute(params, mockTodoistApi)

                expect(mockMethod).toHaveBeenCalledWith({
                    since: `${params.since}T00:00:00.000Z`,
                    until: `${params.until}T23:59:59.000Z`,
                    limit: params.limit,
                    filterQuery: expectedFilter,
                    filterLang: 'en',
                })

                const textContent = extractTextContent(result)
                expect(textContent).toMatchSnapshot()
            },
        )

        it('should handle empty labels array', async () => {
            const params = {
                getBy: 'completion' as const,
                since: '2025-08-01',
                until: '2025-08-31',
                limit: 50,
                labels: [],
                labelsOperator: 'or' as const,
            }

            const mockResponse = { items: [], nextCursor: null }
            mockTodoistApi.getCompletedTasksByCompletionDate.mockResolvedValue(mockResponse)

            await findCompletedTasks.execute(params, mockTodoistApi)

            expect(mockTodoistApi.getCompletedTasksByCompletionDate).toHaveBeenCalledWith({
                since: `${params.since}T00:00:00.000Z`,
                until: `${params.until}T23:59:59.000Z`,
                limit: params.limit,
            })
        })

        it('should combine other filters with label filters', async () => {
            const params = {
                getBy: 'due' as const,
                since: '2025-08-01',
                until: '2025-08-31',
                limit: 25,
                projectId: 'test-project-id',
                sectionId: 'test-section-id',
                labels: ['important'],
                labelsOperator: 'or' as const,
            }

            const mockTasks = [
                createMockTask({
                    content: 'Important completed task',
                    labels: ['important'],
                    completedAt: '2024-01-01T00:00:00Z',
                }),
            ]
            const mockResponse = { items: mockTasks, nextCursor: null }
            mockTodoistApi.getCompletedTasksByDueDate.mockResolvedValue(mockResponse)

            const result = await findCompletedTasks.execute(params, mockTodoistApi)

            expect(mockTodoistApi.getCompletedTasksByDueDate).toHaveBeenCalledWith({
                since: `${params.since}T00:00:00.000Z`,
                until: `${params.until}T23:59:59.000Z`,
                limit: params.limit,
                projectId: params.projectId,
                sectionId: params.sectionId,
                filterQuery: '(@important)',
                filterLang: 'en',
            })

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
        })
    })

    describe('timezone handling', () => {
        it('should convert user timezone to UTC correctly (Europe/Madrid)', async () => {
            // Mock user with Madrid timezone
            mockTodoistApi.getUser.mockResolvedValue({
                id: 'test-user-id',
                fullName: 'Test User',
                email: 'test@example.com',
                tzInfo: {
                    timezone: 'Europe/Madrid',
                    gmtString: '+02:00',
                    hours: 2,
                    minutes: 0,
                    isDst: 0,
                },
            } as CurrentUser)

            const mockCompletedTasks: Task[] = [
                createMockTask({
                    id: '8485093750',
                    content: 'Task completed in Madrid timezone',
                    completedAt: '2025-10-11T15:30:00Z',
                }),
            ]

            mockTodoistApi.getCompletedTasksByCompletionDate.mockResolvedValue({
                items: mockCompletedTasks,
                nextCursor: null,
            })

            const result = await findCompletedTasks.execute(
                {
                    getBy: 'completion',
                    limit: 50,
                    since: '2025-10-11',
                    until: '2025-10-11',
                    labels: [],
                    labelsOperator: 'or' as const,
                },
                mockTodoistApi,
            )

            // Should convert Madrid local time to UTC
            // 2025-10-11 00:00:00 +02:00 = 2025-10-10 22:00:00 UTC
            // 2025-10-11 23:59:59 +02:00 = 2025-10-11 21:59:59 UTC
            expect(mockTodoistApi.getCompletedTasksByCompletionDate).toHaveBeenCalledWith({
                since: '2025-10-10T22:00:00.000Z',
                until: '2025-10-11T21:59:59.000Z',
                limit: 50,
            })

            expect(extractTextContent(result)).toMatchSnapshot()
        })
    })

    describe('error handling', () => {
        it('should propagate completion date API errors', async () => {
            const apiError = new Error('API Error: Invalid date range')
            mockTodoistApi.getCompletedTasksByCompletionDate.mockRejectedValue(apiError)

            await expect(
                findCompletedTasks.execute(
                    // invalid date range
                    {
                        getBy: 'completion',
                        limit: 50,
                        since: '2025-08-31',
                        until: '2025-08-01',
                        labels: [],
                        labelsOperator: 'or' as const,
                    },
                    mockTodoistApi,
                ),
            ).rejects.toThrow('API Error: Invalid date range')
        })

        it('should propagate due date API errors', async () => {
            const apiError = new Error('API Error: Project not found')
            mockTodoistApi.getCompletedTasksByDueDate.mockRejectedValue(apiError)

            await expect(
                findCompletedTasks.execute(
                    {
                        getBy: 'due',
                        limit: 50,
                        since: '2025-08-01',
                        until: '2025-08-31',
                        projectId: 'non-existent-project',
                        labels: [],
                        labelsOperator: 'or' as const,
                    },
                    mockTodoistApi,
                ),
            ).rejects.toThrow('API Error: Project not found')
        })
    })
})
