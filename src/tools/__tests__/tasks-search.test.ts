import type { TodoistApi } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import { getTasksByFilter } from '../../tool-helpers.js'
import { tasksSearch } from '../tasks-search.js'
import {
    TEST_ERRORS,
    TEST_IDS,
    TODAY,
    createMappedTask,
    extractStructuredContent,
    extractTextContent,
} from '../test-helpers.js'

// Mock the tool helpers
jest.mock('../../tool-helpers', () => ({
    getTasksByFilter: jest.fn(),
}))

const mockGetTasksByFilter = getTasksByFilter as jest.MockedFunction<typeof getTasksByFilter>

// Mock the Todoist API (not directly used by tasks-search, but needed for type)
const mockTodoistApi = {} as TodoistApi

describe('tasks-search tool', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('searching tasks', () => {
        it('should search tasks and return results', async () => {
            const mockTasks = [
                createMappedTask({
                    id: TEST_IDS.TASK_1,
                    content: 'Task containing search term',
                    description: 'Description with more details',
                    labels: ['work'],
                }),
                createMappedTask({
                    id: TEST_IDS.TASK_2,
                    content: 'Another matching task',
                    priority: 2,
                    sectionId: TEST_IDS.SECTION_1,
                }),
            ]
            const mockResponse = { tasks: mockTasks, nextCursor: 'cursor-for-next-page' }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await tasksSearch.execute(
                {
                    searchText: 'important meeting',
                    limit: 10,
                },
                mockTodoistApi,
            )

            expect(mockGetTasksByFilter).toHaveBeenCalledWith({
                client: mockTodoistApi,
                query: 'search: important meeting',
                cursor: undefined,
                limit: 10,
            })
            // Verify result is a concise summary
            expect(extractTextContent(result)).toMatchSnapshot()

            // Verify structured content
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    tasks: expect.any(Array),
                    totalCount: 2,
                    hasMore: true,
                    nextCursor: 'cursor-for-next-page',
                    appliedFilters: {
                        searchText: 'important meeting',
                        limit: 10,
                        cursor: undefined,
                    },
                }),
            )
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    tasks: expect.any(Array),
                }),
            )
        })

        it.each([
            {
                name: 'custom limit',
                params: { searchText: 'project update', limit: 5 },
                expectedQuery: 'search: project update',
                expectedLimit: 5,
                expectedCursor: undefined,
            },
            {
                name: 'pagination cursor',
                params: { searchText: 'follow up', limit: 20, cursor: 'cursor-from-first-page' },
                expectedQuery: 'search: follow up',
                expectedLimit: 20,
                expectedCursor: 'cursor-from-first-page',
            },
        ])(
            'should handle $name',
            async ({ params, expectedQuery, expectedLimit, expectedCursor }) => {
                const mockTask = createMappedTask({ content: 'Test result' })
                const mockResponse = { tasks: [mockTask], nextCursor: null }
                mockGetTasksByFilter.mockResolvedValue(mockResponse)

                const result = await tasksSearch.execute(params, mockTodoistApi)

                expect(mockGetTasksByFilter).toHaveBeenCalledWith({
                    client: mockTodoistApi,
                    query: expectedQuery,
                    cursor: expectedCursor,
                    limit: expectedLimit,
                })
                // Verify result is a concise summary
                expect(extractTextContent(result)).toMatchSnapshot()

                // Verify structured content
                const structuredContent = extractStructuredContent(result)
                expect(structuredContent).toEqual(
                    expect.objectContaining({
                        tasks: expect.any(Array),
                        totalCount: 1,
                        hasMore: false,
                        nextCursor: null,
                        appliedFilters: expect.objectContaining({
                            searchText: params.searchText,
                            limit: expectedLimit,
                        }),
                    }),
                )
                expect(structuredContent).toEqual(
                    expect.objectContaining({
                        tasks: expect.any(Array),
                    }),
                )
            },
        )

        it.each([
            { searchText: '@work #urgent "exact phrase"', description: 'special characters' },
            { searchText: 'nonexistent keyword', description: 'empty results' },
        ])('should handle search with $description', async ({ searchText }) => {
            const mockResponse = { tasks: [], nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await tasksSearch.execute({ searchText, limit: 10 }, mockTodoistApi)

            expect(mockGetTasksByFilter).toHaveBeenCalledWith({
                client: mockTodoistApi,
                query: `search: ${searchText}`,
                cursor: undefined,
                limit: 10,
            })
            // Verify result is a concise summary
            expect(extractTextContent(result)).toMatchSnapshot()

            // Verify structured content for empty results
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    tasks: [],
                    totalCount: 0,
                    hasMore: false,
                    nextCursor: null,
                    appliedFilters: expect.objectContaining({
                        searchText: searchText,
                    }),
                }),
            )
        })
    })

    describe('next steps logic', () => {
        it('should suggest different actions when hasOverdue is true', async () => {
            const mockTasks = [
                createMappedTask({
                    id: TEST_IDS.TASK_1,
                    content: 'Overdue search result',
                    dueDate: '2025-08-10', // Past date
                }),
            ]
            const mockResponse = { tasks: mockTasks, nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await tasksSearch.execute(
                { searchText: 'overdue tasks', limit: 10 },
                mockTodoistApi,
            )

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            // Should prioritize overdue tasks in next steps
            expect(textContent).toContain(
                'Use tasks-update-multiple to modify priorities or due dates',
            )
        })

        it('should suggest today tasks when hasToday is true', async () => {
            const mockTasks = [
                createMappedTask({
                    id: TEST_IDS.TASK_1,
                    content: 'Task due today',
                    dueDate: TODAY,
                }),
            ]
            const mockResponse = { tasks: mockTasks, nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await tasksSearch.execute(
                { searchText: 'today tasks', limit: 10 },
                mockTodoistApi,
            )

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            // Should suggest today-focused actions
            expect(textContent).toContain(
                'Use tasks-update-multiple to modify priorities or due dates',
            )
        })

        it('should provide different next steps for regular tasks', async () => {
            const mockTasks = [
                createMappedTask({
                    id: TEST_IDS.TASK_1,
                    content: 'Regular future task',
                    dueDate: '2025-08-25', // Future date
                }),
            ]
            const mockResponse = { tasks: mockTasks, nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await tasksSearch.execute(
                { searchText: 'future tasks', limit: 10 },
                mockTodoistApi,
            )

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain(
                'Use tasks-update-multiple to modify priorities or due dates',
            )
        })

        it('should provide helpful suggestions for empty search results', async () => {
            const mockResponse = { tasks: [], nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await tasksSearch.execute(
                { searchText: 'nonexistent', limit: 10 },
                mockTodoistApi,
            )

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('Try broader search terms')
            expect(textContent).toContain('Check completed tasks with tasks-list-completed')
            expect(textContent).toContain('Verify spelling and try partial words')
        })
    })

    describe('error handling', () => {
        it.each([
            { error: 'Invalid filter query: search: ', params: { searchText: '', limit: 10 } },
            {
                error: TEST_ERRORS.API_RATE_LIMIT,
                params: { searchText: 'any search term', limit: 10 },
            },
            {
                error: TEST_ERRORS.INVALID_CURSOR,
                params: { searchText: 'test', cursor: 'invalid-cursor-format', limit: 10 },
            },
        ])('should propagate $error', async ({ error, params }) => {
            mockGetTasksByFilter.mockRejectedValue(new Error(error))
            await expect(tasksSearch.execute(params, mockTodoistApi)).rejects.toThrow(error)
        })
    })
})
