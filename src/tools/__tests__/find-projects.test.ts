import type { TodoistApi } from '@doist/todoist-api-typescript'
import { type Mocked, vi } from 'vitest'
import {
    createMockApiResponse,
    createMockProject,
    TEST_ERRORS,
    TEST_IDS,
} from '../../utils/test-helpers.js'
import { ToolNames } from '../../utils/tool-names.js'
import { findProjects } from '../find-projects.js'

// Mock the Todoist API
const mockTodoistApi = {
    getProjects: vi.fn(),
    searchProjects: vi.fn(),
} as unknown as Mocked<TodoistApi>

const { FIND_PROJECTS } = ToolNames

describe(`${FIND_PROJECTS} tool`, () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('listing all projects', () => {
        it('should list all projects when no search parameter is provided', async () => {
            const mockProjects = [
                createMockProject({
                    id: TEST_IDS.PROJECT_INBOX,
                    name: 'Inbox',
                    color: 'grey',
                    inboxProject: true,
                    childOrder: 0,
                }),
                createMockProject({
                    id: TEST_IDS.PROJECT_TEST,
                    name: 'test-abc123def456-project',
                    color: 'charcoal',
                    childOrder: 1,
                }),
                createMockProject({
                    id: TEST_IDS.PROJECT_WORK,
                    name: 'Work Project',
                    color: 'blue',
                    isFavorite: true,
                    isShared: true,
                    viewStyle: 'board',
                    childOrder: 2,
                    description: 'Important work tasks',
                    canAssignTasks: true,
                }),
            ]

            mockTodoistApi.getProjects.mockResolvedValue(createMockApiResponse(mockProjects))

            const result = await findProjects.execute({ limit: 50 }, mockTodoistApi)

            // Verify API was called correctly
            expect(mockTodoistApi.getProjects).toHaveBeenCalledWith({
                limit: 50,
                cursor: null,
            })

            expect(result.textContent).toMatchSnapshot()

            // Verify structured content
            const structuredContent = result.structuredContent
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    projects: expect.any(Array),
                    totalCount: 3,
                    hasMore: false,
                    appliedFilters: {
                        search: undefined,
                        limit: 50,
                        cursor: undefined,
                    },
                }),
            )
            expect(structuredContent.projects).toHaveLength(3)
        })

        it('should handle pagination with limit and cursor', async () => {
            const mockProject = createMockProject({
                id: 'project-1',
                name: 'First Project',
                color: 'red',
            })
            mockTodoistApi.getProjects.mockResolvedValue(
                createMockApiResponse([mockProject], 'next-page-cursor'),
            )

            const result = await findProjects.execute(
                { limit: 10, cursor: 'current-page-cursor' },
                mockTodoistApi,
            )

            expect(mockTodoistApi.getProjects).toHaveBeenCalledWith({
                limit: 10,
                cursor: 'current-page-cursor',
            })
            expect(result.textContent).toMatchSnapshot()

            // Verify structured content
            const structuredContent = result.structuredContent
            expect(structuredContent.projects).toHaveLength(1)
            expect(structuredContent.totalCount).toBe(1)
            expect(structuredContent.hasMore).toBe(true)
            expect(structuredContent.nextCursor).toBe('next-page-cursor')
            expect(structuredContent.appliedFilters).toEqual({
                search: undefined,
                limit: 10,
                cursor: 'current-page-cursor',
            })
        })
    })

    describe('searching projects', () => {
        it('should search projects by name (case insensitive)', async () => {
            const matchingProjects = [
                createMockProject({
                    id: TEST_IDS.PROJECT_WORK,
                    name: 'Work Project',
                    color: 'blue',
                }),
                createMockProject({ id: 'hobby-project-id', name: 'Hobby Work', color: 'orange' }),
            ]

            mockTodoistApi.searchProjects.mockResolvedValue(createMockApiResponse(matchingProjects))
            const result = await findProjects.execute({ search: 'work', limit: 50 }, mockTodoistApi)

            // When searching, should use maximum limit and ignore user's limit parameter
            expect(mockTodoistApi.searchProjects).toHaveBeenCalledWith({
                query: 'work',
                limit: 200,
                cursor: null,
            })
            expect(result.textContent).toMatchSnapshot()

            // Verify structured content with search filter
            const structuredContent = result.structuredContent
            expect(structuredContent.projects).toHaveLength(2) // Should match filtered results
            expect(structuredContent.totalCount).toBe(2)
            expect(structuredContent.hasMore).toBe(false) // Always false when searching
            expect(structuredContent.nextCursor).toBeUndefined() // No cursor when searching
            expect(structuredContent.appliedFilters).toEqual({
                search: 'work',
                limit: 50,
                cursor: undefined,
            })
        })

        it('should fetch all pages of search results', async () => {
            const page1Projects = [createMockProject({ id: 'work-1', name: 'Work Project 1' })]
            const page2Projects = [
                createMockProject({
                    id: 'work-2',
                    name: 'Important Work Project',
                }),
            ]

            // Set up multiple API calls to simulate pagination
            mockTodoistApi.searchProjects
                .mockResolvedValueOnce(createMockApiResponse(page1Projects, 'page-2-cursor'))
                .mockResolvedValueOnce(createMockApiResponse(page2Projects, null))

            const result = await findProjects.execute({ search: 'work', limit: 10 }, mockTodoistApi)

            // Should have made 2 API calls to get all matching projects
            expect(mockTodoistApi.searchProjects).toHaveBeenCalledTimes(2)
            expect(mockTodoistApi.searchProjects).toHaveBeenNthCalledWith(1, {
                query: 'work',
                limit: 200,
                cursor: null,
            })
            expect(mockTodoistApi.searchProjects).toHaveBeenNthCalledWith(2, {
                query: 'work',
                limit: 200,
                cursor: 'page-2-cursor',
            })

            // Should include results from all pages
            const structuredContent = result.structuredContent
            expect(structuredContent.projects).toHaveLength(2)
            expect(structuredContent.projects[1]?.name).toBe('Important Work Project')
            expect(structuredContent.totalCount).toBe(2)
            expect(structuredContent.hasMore).toBe(false)
            expect(structuredContent.nextCursor).toBeUndefined()
        })

        it.each([
            {
                search: 'nonexistent',
                apiProjects: [],
                expectedCount: 0,
                description: 'no matches',
            },
            {
                search: 'IMPORTANT',
                apiProjects: ['Important Project'],
                expectedCount: 1,
                description: 'case insensitive matching',
            },
        ])('should handle search with $description', async ({
            search,
            apiProjects,
            expectedCount,
        }) => {
            const mockProjects = apiProjects.map((name) => createMockProject({ name }))
            mockTodoistApi.searchProjects.mockResolvedValue(createMockApiResponse(mockProjects))

            const result = await findProjects.execute({ search, limit: 50 }, mockTodoistApi)
            expect(result.textContent).toMatchSnapshot()

            // Verify structured content
            const structuredContent = result.structuredContent
            expect(structuredContent.projects).toHaveLength(expectedCount)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    appliedFilters: expect.objectContaining({ search }),
                }),
            )
        })
    })

    describe('error handling', () => {
        it.each([
            { error: TEST_ERRORS.API_UNAUTHORIZED, params: { limit: 50 } },
            { error: TEST_ERRORS.INVALID_CURSOR, params: { cursor: 'invalid-cursor', limit: 50 } },
        ])('should propagate $error', async ({ error, params }) => {
            mockTodoistApi.getProjects.mockRejectedValue(new Error(error))
            await expect(findProjects.execute(params, mockTodoistApi)).rejects.toThrow(error)
        })
    })
})
