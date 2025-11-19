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
        it('should filter projects by search term (case insensitive) and fetch all projects', async () => {
            const mockProjects = [
                createMockProject({
                    id: TEST_IDS.PROJECT_WORK,
                    name: 'Work Project',
                    color: 'blue',
                }),
                createMockProject({
                    id: 'personal-project-id',
                    name: 'Personal Tasks',
                    color: 'green',
                }),
                createMockProject({ id: 'hobby-project-id', name: 'Hobby Work', color: 'orange' }),
            ]

            mockTodoistApi.getProjects.mockResolvedValue(createMockApiResponse(mockProjects))
            const result = await findProjects.execute({ search: 'work', limit: 50 }, mockTodoistApi)

            // When searching, should use maximum limit and ignore user's limit parameter
            expect(mockTodoistApi.getProjects).toHaveBeenCalledWith({ limit: 200, cursor: null })
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

        it('should find matching projects across multiple pages', async () => {
            // Simulate the original problem: matching project is on "page 2"
            const page1Projects = Array.from({ length: 50 }, (_, i) =>
                createMockProject({
                    id: `page1-project-${i}`,
                    name: `Page 1 Project ${i}`,
                }),
            )
            const page2Projects = [
                createMockProject({
                    id: 'matching-project',
                    name: 'Important Work Project', // This matches 'work' search
                }),
                createMockProject({
                    id: 'other-project',
                    name: 'Other Project',
                }),
            ]

            // Set up multiple API calls to simulate pagination
            mockTodoistApi.getProjects
                .mockResolvedValueOnce(
                    createMockApiResponse(page1Projects.slice(0, 200), 'page-2-cursor'),
                )
                .mockResolvedValueOnce(createMockApiResponse(page2Projects, null))

            const result = await findProjects.execute({ search: 'work', limit: 10 }, mockTodoistApi)

            // Should have made 2 API calls to get all projects
            expect(mockTodoistApi.getProjects).toHaveBeenCalledTimes(2)
            expect(mockTodoistApi.getProjects).toHaveBeenNthCalledWith(1, {
                limit: 200,
                cursor: null,
            })
            expect(mockTodoistApi.getProjects).toHaveBeenNthCalledWith(2, {
                limit: 200,
                cursor: 'page-2-cursor',
            })

            // Should find the matching project even though it was on "page 2"
            const structuredContent = result.structuredContent
            expect(structuredContent.projects).toHaveLength(1)
            expect(structuredContent.projects[0]?.name).toBe('Important Work Project')
            expect(structuredContent.totalCount).toBe(1)
            expect(structuredContent.hasMore).toBe(false)
            expect(structuredContent.nextCursor).toBeUndefined()
        })

        it.each([
            {
                search: 'nonexistent',
                projects: ['Project One'],
                expectedCount: 0,
                description: 'no matches',
            },
            {
                search: 'IMPORTANT',
                projects: ['Important Project'],
                expectedCount: 1,
                description: 'case insensitive matching',
            },
        ])('should handle search with $description', async ({ search, projects }) => {
            const mockProjects = projects.map((name) => createMockProject({ name }))
            mockTodoistApi.getProjects.mockResolvedValue(createMockApiResponse(mockProjects))

            const result = await findProjects.execute({ search, limit: 50 }, mockTodoistApi)
            expect(result.textContent).toMatchSnapshot()

            // Verify structured content
            const structuredContent = result.structuredContent
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
