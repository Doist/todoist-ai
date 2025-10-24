import type { TodoistApi } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import { getTasksByFilter } from '../../tool-helpers.js'
import {
    createMappedTask,
    createMockApiResponse,
    createMockProject,
    TEST_IDS,
} from '../../utils/test-helpers.js'
import { ToolNames } from '../../utils/tool-names.js'
import { search } from '../search.js'

jest.mock('../../tool-helpers', () => {
    return {
        getTasksByFilter: jest.fn(),
    }
})

const { SEARCH } = ToolNames

const mockGetTasksByFilter = getTasksByFilter as jest.MockedFunction<typeof getTasksByFilter>

// Mock the Todoist API
const mockTodoistApi = {
    getProjects: jest.fn(),
} as unknown as jest.Mocked<TodoistApi>

describe(`${SEARCH} tool`, () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('searching tasks and projects', () => {
        it('should search both tasks and projects and return combined results', async () => {
            const mockTasks = [
                createMappedTask({
                    id: TEST_IDS.TASK_1,
                    content: 'Important meeting task',
                }),
                createMappedTask({
                    id: TEST_IDS.TASK_2,
                    content: 'Another important item',
                }),
            ]
            const mockProjects = [
                createMockProject({
                    id: TEST_IDS.PROJECT_WORK,
                    name: 'Important Work Project',
                }),
                createMockProject({
                    id: TEST_IDS.PROJECT_TEST,
                    name: 'Test Project',
                }),
            ]

            mockGetTasksByFilter.mockResolvedValue({ tasks: mockTasks, nextCursor: null })
            mockTodoistApi.getProjects.mockResolvedValue(createMockApiResponse(mockProjects))

            const result = await search.execute({ query: 'important' }, mockTodoistApi)

            // Verify both API calls were made
            expect(mockGetTasksByFilter).toHaveBeenCalledWith({
                client: mockTodoistApi,
                query: 'search: important',
                limit: 100, // TASKS_MAX
                cursor: undefined,
            })
            expect(mockTodoistApi.getProjects).toHaveBeenCalledWith({
                limit: 100, // PROJECTS_MAX
            })

            // Verify result structure
            expect(result.content).toHaveLength(1)
            expect(result.content[0]?.type).toBe('text')

            // Parse the JSON response
            const jsonResponse = JSON.parse(result.content[0]?.text ?? '{}')
            expect(jsonResponse).toHaveProperty('results')
            expect(jsonResponse.results).toHaveLength(3) // 2 tasks + 1 project matching "important"

            // Verify task results
            expect(jsonResponse.results[0]).toEqual({
                id: `task:${TEST_IDS.TASK_1}`,
                title: 'Important meeting task',
                url: `https://app.todoist.com/app/task/${TEST_IDS.TASK_1}`,
            })
            expect(jsonResponse.results[1]).toEqual({
                id: `task:${TEST_IDS.TASK_2}`,
                title: 'Another important item',
                url: `https://app.todoist.com/app/task/${TEST_IDS.TASK_2}`,
            })

            // Verify project result (only "Important Work Project" matches)
            expect(jsonResponse.results[2]).toEqual({
                id: `project:${TEST_IDS.PROJECT_WORK}`,
                title: 'Important Work Project',
                url: `https://app.todoist.com/app/project/${TEST_IDS.PROJECT_WORK}`,
            })
        })

        it('should return only matching tasks when no projects match', async () => {
            const mockTasks = [
                createMappedTask({
                    id: TEST_IDS.TASK_1,
                    content: 'Unique task content',
                }),
            ]
            const mockProjects = [
                createMockProject({
                    id: TEST_IDS.PROJECT_WORK,
                    name: 'Work Project',
                }),
            ]

            mockGetTasksByFilter.mockResolvedValue({ tasks: mockTasks, nextCursor: null })
            mockTodoistApi.getProjects.mockResolvedValue(createMockApiResponse(mockProjects))

            const result = await search.execute({ query: 'unique' }, mockTodoistApi)

            const jsonResponse = JSON.parse(result.content[0]?.text ?? '{}')
            expect(jsonResponse.results).toHaveLength(1)
            expect(jsonResponse.results[0].id).toBe(`task:${TEST_IDS.TASK_1}`)
        })

        it('should return only matching projects when no tasks match', async () => {
            const mockProjects = [
                createMockProject({
                    id: TEST_IDS.PROJECT_WORK,
                    name: 'Special Project Name',
                }),
                createMockProject({
                    id: TEST_IDS.PROJECT_TEST,
                    name: 'Another Project',
                }),
            ]

            mockGetTasksByFilter.mockResolvedValue({ tasks: [], nextCursor: null })
            mockTodoistApi.getProjects.mockResolvedValue(createMockApiResponse(mockProjects))

            const result = await search.execute({ query: 'special' }, mockTodoistApi)

            const jsonResponse = JSON.parse(result.content[0]?.text ?? '{}')
            expect(jsonResponse.results).toHaveLength(1)
            expect(jsonResponse.results[0]).toEqual({
                id: `project:${TEST_IDS.PROJECT_WORK}`,
                title: 'Special Project Name',
                url: `https://app.todoist.com/app/project/${TEST_IDS.PROJECT_WORK}`,
            })
        })

        it('should return empty results when nothing matches', async () => {
            mockGetTasksByFilter.mockResolvedValue({ tasks: [], nextCursor: null })
            mockTodoistApi.getProjects.mockResolvedValue(createMockApiResponse([]))

            const result = await search.execute({ query: 'nonexistent' }, mockTodoistApi)

            const jsonResponse = JSON.parse(result.content[0]?.text ?? '{}')
            expect(jsonResponse.results).toHaveLength(0)
        })

        it('should perform case-insensitive project filtering', async () => {
            const mockProjects = [
                createMockProject({
                    id: TEST_IDS.PROJECT_WORK,
                    name: 'Important Work',
                }),
            ]

            mockGetTasksByFilter.mockResolvedValue({ tasks: [], nextCursor: null })
            mockTodoistApi.getProjects.mockResolvedValue(createMockApiResponse(mockProjects))

            const result = await search.execute({ query: 'IMPORTANT' }, mockTodoistApi)

            const jsonResponse = JSON.parse(result.content[0]?.text ?? '{}')
            expect(jsonResponse.results).toHaveLength(1)
            expect(jsonResponse.results[0].title).toBe('Important Work')
        })

        it('should handle partial matches in project names', async () => {
            const mockProjects = [
                createMockProject({ id: 'project-1', name: 'Development Tasks' }),
                createMockProject({ id: 'project-2', name: 'Developer Resources' }),
                createMockProject({ id: 'project-3', name: 'Marketing' }),
            ]

            mockGetTasksByFilter.mockResolvedValue({ tasks: [], nextCursor: null })
            mockTodoistApi.getProjects.mockResolvedValue(createMockApiResponse(mockProjects))

            const result = await search.execute({ query: 'develop' }, mockTodoistApi)

            const jsonResponse = JSON.parse(result.content[0]?.text ?? '{}')
            expect(jsonResponse.results).toHaveLength(2)
            expect(jsonResponse.results[0].title).toBe('Development Tasks')
            expect(jsonResponse.results[1].title).toBe('Developer Resources')
        })
    })

    describe('error handling', () => {
        it('should return error response for task search failure', async () => {
            mockGetTasksByFilter.mockRejectedValue(new Error('Task search failed'))
            mockTodoistApi.getProjects.mockResolvedValue(createMockApiResponse([]))

            const result = await search.execute({ query: 'test' }, mockTodoistApi)

            expect(result.isError).toBe(true)
            expect(result.content[0]?.text).toBe('Task search failed')
        })

        it('should return error response for project search failure', async () => {
            mockGetTasksByFilter.mockResolvedValue({ tasks: [], nextCursor: null })
            mockTodoistApi.getProjects.mockRejectedValue(new Error('Project search failed'))

            const result = await search.execute({ query: 'test' }, mockTodoistApi)

            expect(result.isError).toBe(true)
            expect(result.content[0]?.text).toBe('Project search failed')
        })
    })

    describe('OpenAI MCP spec compliance', () => {
        it('should return exactly one content item with type "text"', async () => {
            mockGetTasksByFilter.mockResolvedValue({ tasks: [], nextCursor: null })
            mockTodoistApi.getProjects.mockResolvedValue(createMockApiResponse([]))

            const result = await search.execute({ query: 'test' }, mockTodoistApi)

            expect(result.content).toHaveLength(1)
            expect(result.content[0]?.type).toBe('text')
        })

        it('should return valid JSON string in text field', async () => {
            mockGetTasksByFilter.mockResolvedValue({ tasks: [], nextCursor: null })
            mockTodoistApi.getProjects.mockResolvedValue(createMockApiResponse([]))

            const result = await search.execute({ query: 'test' }, mockTodoistApi)

            expect(() => JSON.parse(result.content[0]?.text ?? '{}')).not.toThrow()
        })

        it('should include required fields (id, title, url) in each result', async () => {
            const mockTasks = [createMappedTask({ id: TEST_IDS.TASK_1, content: 'Test' })]
            const mockProjects = [createMockProject({ id: TEST_IDS.PROJECT_WORK, name: 'Test' })]

            mockGetTasksByFilter.mockResolvedValue({ tasks: mockTasks, nextCursor: null })
            mockTodoistApi.getProjects.mockResolvedValue(createMockApiResponse(mockProjects))

            const result = await search.execute({ query: 'test' }, mockTodoistApi)

            const jsonResponse = JSON.parse(result.content[0]?.text ?? '{}')
            for (const item of jsonResponse.results) {
                expect(item).toHaveProperty('id')
                expect(item).toHaveProperty('title')
                expect(item).toHaveProperty('url')
                expect(typeof item.id).toBe('string')
                expect(typeof item.title).toBe('string')
                expect(typeof item.url).toBe('string')
            }
        })
    })
})
