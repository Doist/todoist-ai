import type { TodoistApi } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import { getTasksByFilter } from '../../tool-helpers.js'
import {
    TEST_ERRORS,
    TEST_IDS,
    TODAY,
    createMappedTask,
    createMockApiResponse,
    createMockTask,
    extractStructuredContent,
    extractTextContent,
} from '../../utils/test-helpers.js'
import { ToolNames } from '../../utils/tool-names.js'
import { findTasks } from '../find-tasks.js'

jest.mock('../../tool-helpers', () => {
    const actual = jest.requireActual('../../tool-helpers') as typeof import('../../tool-helpers')
    return {
        getTasksByFilter: jest.fn(),
        mapTask: actual.mapTask,
    }
})

const { FIND_TASKS, UPDATE_TASKS, FIND_COMPLETED_TASKS } = ToolNames

const mockGetTasksByFilter = getTasksByFilter as jest.MockedFunction<typeof getTasksByFilter>

// Mock the Todoist API
const mockTodoistApi = {
    getTasks: jest.fn(),
} as unknown as jest.Mocked<TodoistApi>

describe(`${FIND_TASKS} tool`, () => {
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

            const result = await findTasks.execute(
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

                const result = await findTasks.execute(params, mockTodoistApi)

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

            const result = await findTasks.execute({ searchText, limit: 10 }, mockTodoistApi)

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

    describe('validation', () => {
        it('should require at least one filter parameter', async () => {
            await expect(findTasks.execute({ limit: 10 }, mockTodoistApi)).rejects.toThrow(
                'At least one filter must be provided: searchText, projectId, sectionId, or parentId',
            )
        })
    })

    describe('container filtering', () => {
        it.each([
            {
                name: 'project',
                params: { projectId: TEST_IDS.PROJECT_TEST, limit: 10 },
                expectedApiParam: { projectId: TEST_IDS.PROJECT_TEST },
                tasks: [createMockTask({ content: 'Project task' })],
            },
            {
                name: 'section',
                params: { sectionId: TEST_IDS.SECTION_1, limit: 10 },
                expectedApiParam: { sectionId: TEST_IDS.SECTION_1 },
                tasks: [createMockTask({ content: 'Section task' })],
            },
            {
                name: 'parent task',
                params: { parentId: TEST_IDS.TASK_1, limit: 10 },
                expectedApiParam: { parentId: TEST_IDS.TASK_1 },
                tasks: [createMockTask({ content: 'Subtask' })],
            },
        ])('should find tasks in $name', async ({ params, expectedApiParam, tasks }) => {
            mockTodoistApi.getTasks.mockResolvedValue(createMockApiResponse(tasks))

            const result = await findTasks.execute(params, mockTodoistApi)

            expect(mockTodoistApi.getTasks).toHaveBeenCalledWith({
                limit: 10,
                cursor: null,
                ...expectedApiParam,
            })

            expect(extractTextContent(result)).toMatchSnapshot()

            const structuredContent = extractStructuredContent(result)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    tasks: expect.any(Array),
                    totalCount: tasks.length,
                    hasMore: false,
                    appliedFilters: params,
                }),
            )
        })

        it('should handle combined search text and container filtering', async () => {
            const tasks = [
                createMockTask({
                    id: '8485093749',
                    content: 'relevant task',
                    description: 'contains search term',
                }),
                createMockTask({
                    id: '8485093750',
                    content: 'other task',
                    description: 'different content',
                }),
            ]
            mockTodoistApi.getTasks.mockResolvedValue(createMockApiResponse(tasks))

            const result = await findTasks.execute(
                {
                    projectId: TEST_IDS.PROJECT_TEST,
                    searchText: 'relevant',
                    limit: 10,
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.getTasks).toHaveBeenCalledWith({
                limit: 10,
                cursor: null,
                projectId: TEST_IDS.PROJECT_TEST,
            })

            const structuredContent = extractStructuredContent(result)
            expect(structuredContent.tasks).toHaveLength(1)
            expect(structuredContent.tasks).toEqual([
                expect.objectContaining({ content: 'relevant task' }),
            ])
        })

        it('should handle empty containers', async () => {
            mockTodoistApi.getTasks.mockResolvedValue(createMockApiResponse([]))

            const result = await findTasks.execute(
                {
                    sectionId: 'empty-section',
                    limit: 10,
                },
                mockTodoistApi,
            )

            const textContent = extractTextContent(result)
            expect(textContent).toContain('Section is empty')
            expect(textContent).toContain('Tasks may be in other sections of the project')
        })

        it('should handle pagination with containers', async () => {
            mockTodoistApi.getTasks.mockResolvedValue({
                results: [],
                nextCursor: 'next-cursor',
            })

            const result = await findTasks.execute(
                {
                    projectId: TEST_IDS.PROJECT_TEST,
                    limit: 25,
                    cursor: 'current-cursor',
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.getTasks).toHaveBeenCalledWith({
                limit: 25,
                cursor: 'current-cursor',
                projectId: TEST_IDS.PROJECT_TEST,
            })

            const structuredContent = extractStructuredContent(result)
            expect(structuredContent.hasMore).toBe(true)
            expect(structuredContent.nextCursor).toBe('next-cursor')
        })
    })

    describe('container error handling', () => {
        it('should propagate API errors for container queries', async () => {
            const apiError = new Error('API Error: Project not found')
            mockTodoistApi.getTasks.mockRejectedValue(apiError)

            await expect(
                findTasks.execute({ projectId: 'non-existent', limit: 10 }, mockTodoistApi),
            ).rejects.toThrow('API Error: Project not found')
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

            const result = await findTasks.execute(
                { searchText: 'overdue tasks', limit: 10 },
                mockTodoistApi,
            )

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            // Should prioritize overdue tasks in next steps
            expect(textContent).toContain(`Use ${UPDATE_TASKS} to modify priorities or due dates`)
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

            const result = await findTasks.execute(
                { searchText: 'today tasks', limit: 10 },
                mockTodoistApi,
            )

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            // Should suggest today-focused actions
            expect(textContent).toContain(`Use ${UPDATE_TASKS} to modify priorities or due dates`)
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

            const result = await findTasks.execute(
                { searchText: 'future tasks', limit: 10 },
                mockTodoistApi,
            )

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain(`Use ${UPDATE_TASKS} to modify priorities or due dates`)
        })

        it('should provide helpful suggestions for empty search results', async () => {
            const mockResponse = { tasks: [], nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await findTasks.execute(
                { searchText: 'nonexistent', limit: 10 },
                mockTodoistApi,
            )

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('Try broader search terms')
            expect(textContent).toContain(`Check completed tasks with ${FIND_COMPLETED_TASKS}`)
            expect(textContent).toContain('Verify spelling and try partial words')
        })
    })

    describe('error handling', () => {
        it.each([
            {
                error: 'At least one filter must be provided: searchText, projectId, sectionId, or parentId',
                params: { limit: 10 },
                expectValidation: true,
            },
            {
                error: TEST_ERRORS.API_RATE_LIMIT,
                params: { searchText: 'any search term', limit: 10 },
                expectValidation: false,
            },
            {
                error: TEST_ERRORS.INVALID_CURSOR,
                params: { searchText: 'test', cursor: 'invalid-cursor-format', limit: 10 },
                expectValidation: false,
            },
        ])('should propagate $error', async ({ error, params, expectValidation }) => {
            if (!expectValidation) {
                mockGetTasksByFilter.mockRejectedValue(new Error(error))
            }
            await expect(findTasks.execute(params, mockTodoistApi)).rejects.toThrow(error)
        })
    })
})
