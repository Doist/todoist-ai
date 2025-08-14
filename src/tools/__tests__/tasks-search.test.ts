import type { TodoistApi } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import { getTasksByFilter } from '../../tool-helpers'
import { tasksSearch } from '../tasks-search'
import { TEST_ERRORS, TEST_IDS, createMappedTask } from '../test-helpers'

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
            expect(result).toEqual(mockResponse)
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
                expect(result).toEqual(mockResponse)
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
            expect(result).toEqual(mockResponse)
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
