import type { TodoistApi } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import { getTasksByFilter } from '../../tool-helpers.js'
import { tasksListByDate } from '../tasks-list-by-date.js'
import { TEST_ERRORS, TEST_IDS, createMappedTask, extractTextContent } from '../test-helpers.js'

// Mock the tool helpers
jest.mock('../../tool-helpers', () => ({
    getTasksByFilter: jest.fn(),
}))

const mockGetTasksByFilter = getTasksByFilter as jest.MockedFunction<typeof getTasksByFilter>

// Mock the Todoist API (not directly used by tasks-list-by-date, but needed for type)
const mockTodoistApi = {} as TodoistApi

// Mock date-fns functions to make tests deterministic
jest.mock('date-fns', () => ({
    addDays: jest.fn(() => new Date('2025-08-16')), // Return predictable end date
    formatISO: jest.fn((date, options) => {
        if (typeof date === 'string') {
            return date // Return string dates as-is
        }
        if (
            options &&
            typeof options === 'object' &&
            'representation' in options &&
            options.representation === 'date'
        ) {
            return '2025-08-15' // Return predictable date for 'today'
        }
        return '2025-08-16' // Return predictable end date
    }),
}))

describe('tasks-list-by-date tool', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        // Mock current date to make tests deterministic
        jest.spyOn(Date, 'now').mockReturnValue(new Date('2025-08-15T10:00:00Z').getTime())
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    describe('listing overdue tasks', () => {
        it.each([
            { daysCount: 7, hasTasks: true, description: 'with tasks' },
            { daysCount: 5, hasTasks: false, description: 'ignoring daysCount' },
        ])('should handle overdue tasks $description', async ({ daysCount, hasTasks }) => {
            const mockTasks = hasTasks
                ? [
                      createMappedTask({
                          id: TEST_IDS.TASK_1,
                          content: 'Overdue task',
                          dueDate: '2025-08-10',
                          priority: 2,
                          labels: ['urgent'],
                      }),
                  ]
                : []

            const mockResponse = { tasks: mockTasks, nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await tasksListByDate.execute(
                { startDate: 'overdue', limit: 50, daysCount },
                mockTodoistApi,
            )

            expect(mockGetTasksByFilter).toHaveBeenCalledWith({
                client: mockTodoistApi,
                query: 'overdue',
                cursor: undefined,
                limit: 50,
            })
            // Verify result is a concise summary
            expect(extractTextContent(result)).toMatchSnapshot()

            // Verify structured content
            const { structuredContent } = result
            expect(structuredContent.tasks).toHaveLength(hasTasks ? 1 : 0)
            expect(structuredContent.totalCount).toBe(hasTasks ? 1 : 0)
            expect(structuredContent.hasMore).toBe(false)
            expect(structuredContent.nextCursor).toBeNull()
            expect(structuredContent.appliedFilters.startDate).toBe('overdue')
        })
    })

    describe('listing tasks by date range', () => {
        it('should get tasks for today when startDate is "today"', async () => {
            const mockTasks = [createMappedTask({ content: 'Today task', dueDate: '2025-08-15' })]
            const mockResponse = { tasks: mockTasks, nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await tasksListByDate.execute(
                { startDate: 'today', limit: 50, daysCount: 7 },
                mockTodoistApi,
            )

            expect(mockGetTasksByFilter).toHaveBeenCalledWith({
                client: mockTodoistApi,
                query:
                    expect.stringContaining('due after:') && expect.stringContaining('due before:'),
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

            const result = await tasksListByDate.execute(params, mockTodoistApi)

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

            await tasksListByDate.execute(params, mockTodoistApi)

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
            const result = await tasksListByDate.execute(
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

            const result = await tasksListByDate.execute(
                { startDate: '2025-08-15', limit: 10, daysCount: 1 },
                mockTodoistApi,
            )

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain(
                'Use tasks-update-multiple to modify priorities or due dates',
            )
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

            const result = await tasksListByDate.execute(
                { startDate: 'today', limit: 10, daysCount: 1 },
                mockTodoistApi,
            )

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain(
                'Use tasks-update-multiple to modify priorities or due dates',
            )
        })

        it('should suggest appropriate actions when startDate is overdue', async () => {
            const mockTasks = [
                createMappedTask({
                    id: TEST_IDS.TASK_1,
                    content: 'Overdue task',
                    dueDate: '2025-08-10',
                }),
            ]
            const mockResponse = { tasks: mockTasks, nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await tasksListByDate.execute(
                { startDate: 'overdue', limit: 10, daysCount: 1 },
                mockTodoistApi,
            )

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain(
                'Use tasks-update-multiple to modify priorities or due dates',
            )
        })

        it('should provide helpful suggestions for empty overdue results', async () => {
            const mockResponse = { tasks: [], nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await tasksListByDate.execute(
                { startDate: 'overdue', limit: 10, daysCount: 1 },
                mockTodoistApi,
            )

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('Great job! No overdue tasks')
            expect(textContent).toContain("Check today's tasks with startDate='today'")
        })

        it('should provide helpful suggestions for empty date range results', async () => {
            const mockResponse = { tasks: [], nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await tasksListByDate.execute(
                { startDate: '2025-08-20', limit: 10, daysCount: 1 },
                mockTodoistApi,
            )

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain("Expand date range with larger 'daysCount'")
            expect(textContent).toContain("Check 'overdue' for past-due items")
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
                params: { startDate: 'overdue', limit: 50, daysCount: 7 },
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
            await expect(tasksListByDate.execute(params, mockTodoistApi)).rejects.toThrow(error)
        })
    })
})
