import type { TodoistApi } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import { getTasksByFilter } from '../../tool-helpers.js'
import {
    createMappedTask,
    createMockUser,
    extractStructuredContent,
    extractTextContent,
    type MappedTask,
    TEST_ERRORS,
    TEST_IDS,
} from '../../utils/test-helpers.js'
import { ToolNames } from '../../utils/tool-names.js'
import { findTasksByDate } from '../find-tasks-by-date.js'

// Mock the tool helpers
jest.mock('../../tool-helpers', () => {
    const actual = jest.requireActual('../../tool-helpers') as typeof import('../../tool-helpers')
    return {
        getTasksByFilter: jest.fn(),
        filterTasksByResponsibleUser: actual.filterTasksByResponsibleUser,
    }
})

const mockGetTasksByFilter = getTasksByFilter as jest.MockedFunction<typeof getTasksByFilter>

// Mock the Todoist API (not directly used by find-tasks-by-date, but needed for type)
const mockTodoistApi = {
    getUser: jest.fn(),
} as unknown as jest.Mocked<TodoistApi>

// Mock the Todoist User
const mockTodoistUser = createMockUser()

// Mock date-fns functions to make tests deterministic
jest.mock('date-fns', () => ({
    addDays: jest.fn((date: string | Date, amount: number) => {
        const d = new Date(date)
        d.setDate(d.getDate() + amount)
        return d
    }),
    formatISO: jest.fn((date: string | Date, options?: { representation?: string }) => {
        if (typeof date === 'string') {
            return date // Return string dates as-is
        }
        if (options?.representation === 'date') {
            return date.toISOString().split('T')[0]
        }
        return date.toISOString()
    }),
}))

const { FIND_TASKS_BY_DATE, UPDATE_TASKS } = ToolNames

describe(`${FIND_TASKS_BY_DATE} tool`, () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockTodoistApi.getUser.mockResolvedValue(mockTodoistUser)

        // Mock current date to make tests deterministic
        jest.spyOn(Date, 'now').mockReturnValue(new Date('2025-08-15T10:00:00Z').getTime())
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    describe('listing tasks by date range', () => {
        it('only returns tasks for the startDate when daysCount is 1', async () => {
            const mockTasks = [
                createMappedTask({ content: 'Task for specific date', dueDate: '2025-08-20' }),
            ]
            const mockResponse = { tasks: mockTasks, nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await findTasksByDate.execute(
                { startDate: '2025-08-20', limit: 50, daysCount: 1 },
                mockTodoistApi,
            )

            // Verify the query uses daysCount=1 by checking the end date calculation
            expect(mockGetTasksByFilter).toHaveBeenCalledWith({
                client: mockTodoistApi,
                query: '(due after: 2025-08-20 | due: 2025-08-20) & due before: 2025-08-21',
                cursor: undefined,
                limit: 50,
            })

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
        })

        it('should get tasks for today when startDate is "today" (includes overdue)', async () => {
            const mockTasks = [createMappedTask({ content: 'Today task', dueDate: '2025-08-15' })]
            const mockResponse = { tasks: mockTasks, nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await findTasksByDate.execute(
                { startDate: 'today', limit: 50, daysCount: 7 },
                mockTodoistApi,
            )

            expect(mockGetTasksByFilter).toHaveBeenCalledWith({
                client: mockTodoistApi,
                query: 'today | overdue',
                cursor: undefined,
                limit: 50,
            })
            // Verify result is a concise summary
            expect(extractTextContent(result)).toMatchSnapshot()
        })

        it.each([
            {
                name: 'specific date',
                params: { startDate: '2025-08-20', limit: 50, daysCount: 7 },
                tasks: [createMappedTask({ content: 'Specific date task', dueDate: '2025-08-20' })],
                cursor: null,
            },
            {
                name: 'multiple days with pagination',
                params: {
                    startDate: '2025-08-20',
                    daysCount: 3,
                    limit: 20,
                    cursor: 'current-cursor',
                },
                tasks: [
                    createMappedTask({
                        id: TEST_IDS.TASK_2,
                        content: 'Multi-day task 1',
                        dueDate: '2025-08-20',
                    }),
                    createMappedTask({
                        id: TEST_IDS.TASK_3,
                        content: 'Multi-day task 2',
                        dueDate: '2025-08-21',
                    }),
                ],
                cursor: 'next-page-cursor',
            },
        ])('should handle $name', async ({ params, tasks, cursor }) => {
            const mockResponse = { tasks, nextCursor: cursor }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await findTasksByDate.execute(params, mockTodoistApi)

            expect(mockGetTasksByFilter).toHaveBeenCalledWith({
                client: mockTodoistApi,
                query: expect.stringContaining('2025-08-20'),
                cursor: params.cursor || undefined,
                limit: params.limit,
            })
            // Verify result is a concise summary
            expect(extractTextContent(result)).toMatchSnapshot()
        })
    })

    describe('pagination and limits', () => {
        it.each([
            {
                name: 'pagination parameters',
                params: {
                    startDate: 'today',
                    limit: 25,
                    daysCount: 7,
                    cursor: 'pagination-cursor',
                },
                expectedCursor: 'pagination-cursor',
                expectedLimit: 25,
            },
            {
                name: 'default values',
                params: { startDate: '2025-08-15', limit: 50, daysCount: 7 },
                expectedCursor: undefined,
                expectedLimit: 50,
            },
        ])('should handle $name', async ({ params, expectedCursor, expectedLimit }) => {
            const mockResponse = { tasks: [], nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            await findTasksByDate.execute(params, mockTodoistApi)

            expect(mockGetTasksByFilter).toHaveBeenCalledWith({
                client: mockTodoistApi,
                query: expect.any(String),
                cursor: expectedCursor,
                limit: expectedLimit,
            })
        })
    })

    describe('edge cases', () => {
        it.each([
            { name: 'empty results', daysCount: 7, shouldReturnResult: true },
            { name: 'maximum daysCount', daysCount: 30, shouldReturnResult: false },
            { name: 'minimum daysCount', daysCount: 1, shouldReturnResult: false },
        ])('should handle $name', async ({ daysCount, shouldReturnResult }) => {
            const mockResponse = { tasks: [], nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const startDate = daysCount === 7 ? 'today' : '2025-08-15'
            const result = await findTasksByDate.execute(
                { startDate, limit: 50, daysCount },
                mockTodoistApi,
            )

            expect(mockGetTasksByFilter).toHaveBeenCalledTimes(1)
            if (shouldReturnResult) {
                // Verify result is a concise summary
                expect(extractTextContent(result)).toMatchSnapshot()
            }
        })
    })

    describe('next steps logic', () => {
        it('should suggest appropriate actions when hasOverdue is true', async () => {
            const mockTasks = [
                createMappedTask({
                    id: TEST_IDS.TASK_1,
                    content: 'Overdue task from list',
                    dueDate: '2025-08-10', // Past date - creates hasOverdue context
                }),
            ]
            const mockResponse = { tasks: mockTasks, nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await findTasksByDate.execute(
                {
                    startDate: '2025-08-15',
                    limit: 10,
                    daysCount: 1,
                },
                mockTodoistApi,
            )

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain(`Use ${UPDATE_TASKS} to modify priorities or due dates`)
        })

        it('should suggest today-focused actions when startDate is today', async () => {
            const mockTasks = [
                createMappedTask({
                    id: TEST_IDS.TASK_1,
                    content: "Today's task",
                    dueDate: '2025-08-15', // Today's date based on our mock
                }),
            ]
            const mockResponse = { tasks: mockTasks, nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await findTasksByDate.execute(
                { startDate: 'today', limit: 10, daysCount: 1 },
                mockTodoistApi,
            )

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain(`Use ${UPDATE_TASKS} to modify priorities or due dates`)
        })

        it('should provide helpful suggestions for empty today results', async () => {
            const mockResponse = { tasks: [], nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await findTasksByDate.execute(
                { startDate: 'today', limit: 10, daysCount: 1 },
                mockTodoistApi,
            )

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('Great job! No tasks for today or overdue')
        })

        it('should provide helpful suggestions for empty date range results', async () => {
            const mockResponse = { tasks: [], nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await findTasksByDate.execute(
                {
                    startDate: '2025-08-20',
                    limit: 10,
                    daysCount: 1,
                },
                mockTodoistApi,
            )

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain("Expand date range with larger 'daysCount'")
            expect(textContent).toContain("Check today's tasks with startDate='today'")
        })
    })

    describe('label filtering', () => {
        it.each([
            {
                name: 'single label with OR operator',
                params: {
                    startDate: 'today',
                    daysCount: 1,
                    limit: 50,
                    labels: ['work'],
                },
                expectedQueryPattern: 'today | overdue & ((@work))', // Will be combined with date query
            },
            {
                name: 'multiple labels with AND operator',
                params: {
                    startDate: 'today',
                    daysCount: 1,
                    limit: 50,
                    labels: ['work', 'urgent'],
                    labelsOperator: 'and' as const,
                },
                expectedQueryPattern: 'today | overdue & ((@work  &  @urgent))',
            },
            {
                name: 'multiple labels with OR operator',
                params: {
                    startDate: '2025-08-20',
                    daysCount: 3,
                    limit: 50,
                    labels: ['personal', 'shopping'],
                    labelsOperator: 'or' as const,
                },
                expectedQueryPattern: '((@personal  |  @shopping))',
            },
        ])('should filter tasks by labels: $name', async ({ params, expectedQueryPattern }) => {
            const mockTasks = [
                createMappedTask({
                    id: TEST_IDS.TASK_1,
                    content: 'Task with work label',
                    labels: ['work'],
                    dueDate: '2025-08-20',
                }),
            ]
            const mockResponse = { tasks: mockTasks, nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await findTasksByDate.execute(params, mockTodoistApi)

            expect(mockGetTasksByFilter).toHaveBeenCalledWith({
                client: mockTodoistApi,
                query: expect.stringContaining('(@'),
                cursor: undefined,
                limit: 50,
            })

            // For today specifically, check the exact pattern
            if (params.startDate === 'today') {
                expect(mockGetTasksByFilter).toHaveBeenCalledWith({
                    client: mockTodoistApi,
                    query: expectedQueryPattern,
                    cursor: undefined,
                    limit: 50,
                })
            }

            const structuredContent = extractStructuredContent(result)
            expect(structuredContent.appliedFilters).toEqual(
                expect.objectContaining({
                    labels: params.labels,
                    ...(params.labelsOperator ? { labelsOperator: params.labelsOperator } : {}),
                }),
            )
        })

        it('should handle empty labels array', async () => {
            const params = {
                startDate: 'today' as const,
                daysCount: 1,
                limit: 50,
            }

            const mockResponse = { tasks: [], nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            await findTasksByDate.execute(params, mockTodoistApi)

            expect(mockGetTasksByFilter).toHaveBeenCalledWith({
                client: mockTodoistApi,
                query: expect.not.stringContaining('@'),
                cursor: undefined,
                limit: 50,
            })
        })

        it('should combine date filters with label filters', async () => {
            const params = {
                startDate: '2025-08-15' as const,
                daysCount: 1,
                limit: 25,
                labels: ['important'],
            }

            const mockTasks = [
                createMappedTask({
                    content: 'Important task for specific date',
                    labels: ['important'],
                    dueDate: '2025-08-15',
                }),
            ]
            const mockResponse = { tasks: mockTasks, nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await findTasksByDate.execute(params, mockTodoistApi)

            expect(mockGetTasksByFilter).toHaveBeenCalledWith({
                client: mockTodoistApi,
                query:
                    expect.stringContaining('due after:') &&
                    expect.stringContaining('(@important)'),
                cursor: undefined,
                limit: 25,
            })

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
        })
    })

    describe('responsible user filtering', () => {
        it('should filter results to show only unassigned tasks or tasks assigned to current user', async () => {
            const mockTasks = [
                createMappedTask({
                    id: TEST_IDS.TASK_1,
                    content: 'My task',
                    dueDate: '2025-08-15',
                    responsibleUid: TEST_IDS.USER_ID, // Assigned to current user
                }),
                createMappedTask({
                    id: TEST_IDS.TASK_2,
                    content: 'Unassigned task',
                    dueDate: '2025-08-15',
                    responsibleUid: null, // Unassigned
                }),
                createMappedTask({
                    id: TEST_IDS.TASK_3,
                    content: 'Someone else task',
                    dueDate: '2025-08-15',
                    responsibleUid: 'other-user-id', // Assigned to someone else
                }),
            ]

            const mockResponse = { tasks: mockTasks, nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await findTasksByDate.execute(
                { startDate: 'today', daysCount: 1, limit: 50 },
                mockTodoistApi,
            )

            const structuredContent = extractStructuredContent(result)
            // Should only return tasks 1 and 2, not task 3
            expect(structuredContent.tasks as MappedTask[]).toHaveLength(2)
            expect((structuredContent.tasks as MappedTask[]).map((t: MappedTask) => t.id)).toEqual([
                TEST_IDS.TASK_1,
                TEST_IDS.TASK_2,
            ])
        })

        it('should filter overdue results to show only unassigned tasks or tasks assigned to current user', async () => {
            const mockTasks = [
                createMappedTask({
                    id: TEST_IDS.TASK_1,
                    content: 'My overdue task',
                    dueDate: '2025-08-10',
                    responsibleUid: TEST_IDS.USER_ID, // Assigned to current user
                }),
                createMappedTask({
                    id: TEST_IDS.TASK_2,
                    content: 'Unassigned overdue task',
                    dueDate: '2025-08-10',
                    responsibleUid: null, // Unassigned
                }),
                createMappedTask({
                    id: TEST_IDS.TASK_3,
                    content: 'Someone else overdue task',
                    dueDate: '2025-08-10',
                    responsibleUid: 'other-user-id', // Assigned to someone else
                }),
            ]

            const mockResponse = { tasks: mockTasks, nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await findTasksByDate.execute(
                { overdueOption: 'overdue-only', daysCount: 1, limit: 50 },
                mockTodoistApi,
            )

            const structuredContent = extractStructuredContent(result)
            // Should only return tasks 1 and 2, not task 3
            expect(structuredContent.tasks).toHaveLength(2)
            expect((structuredContent.tasks as MappedTask[]).map((t: MappedTask) => t.id)).toEqual([
                TEST_IDS.TASK_1,
                TEST_IDS.TASK_2,
            ])
        })
    })

    describe('error handling', () => {
        it.each([
            {
                error: TEST_ERRORS.INVALID_FILTER,
                params: { startDate: 'today', limit: 50, daysCount: 7 },
            },
            {
                error: TEST_ERRORS.API_RATE_LIMIT,
                params: { startDate: 'today', limit: 50, daysCount: 7 },
            },
            {
                error: TEST_ERRORS.INVALID_CURSOR,
                params: {
                    startDate: '2025-08-15',
                    limit: 50,
                    daysCount: 7,
                    cursor: 'invalid-cursor',
                },
            },
        ])('should propagate $error', async ({ error, params }) => {
            mockGetTasksByFilter.mockRejectedValue(new Error(error))
            await expect(findTasksByDate.execute(params, mockTodoistApi)).rejects.toThrow(error)
        })
    })
})
