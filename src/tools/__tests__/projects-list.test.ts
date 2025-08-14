import type { TodoistApi } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import { projectsList } from '../projects-list.js'
import { TEST_ERRORS, TEST_IDS, createMockApiResponse, createMockProject } from '../test-helpers.js'

// Mock the Todoist API
const mockTodoistApi = {
    getProjects: jest.fn(),
} as unknown as jest.Mocked<TodoistApi>

describe('projects-list tool', () => {
    beforeEach(() => {
        jest.clearAllMocks()
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

            const result = await projectsList.execute({ limit: 50 }, mockTodoistApi)

            // Verify API was called correctly
            expect(mockTodoistApi.getProjects).toHaveBeenCalledWith({
                limit: 50,
                cursor: null,
            })

            // Verify result is properly mapped
            expect(result).toEqual({
                projects: [
                    expect.objectContaining({
                        id: TEST_IDS.PROJECT_INBOX,
                        name: 'Inbox',
                        color: 'grey',
                        inboxProject: true,
                    }),
                    expect.objectContaining({
                        id: TEST_IDS.PROJECT_TEST,
                        name: 'test-abc123def456-project',
                        color: 'charcoal',
                    }),
                    expect.objectContaining({
                        id: TEST_IDS.PROJECT_WORK,
                        name: 'Work Project',
                        color: 'blue',
                        isFavorite: true,
                        isShared: true,
                        viewStyle: 'board',
                    }),
                ],
                nextCursor: null,
            })
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

            const result = await projectsList.execute(
                { limit: 10, cursor: 'current-page-cursor' },
                mockTodoistApi,
            )

            expect(mockTodoistApi.getProjects).toHaveBeenCalledWith({
                limit: 10,
                cursor: 'current-page-cursor',
            })
            expect(result.projects).toHaveLength(1)
            expect(result.projects[0]?.name).toBe('First Project')
            expect(result.nextCursor).toBe('next-page-cursor')
        })
    })

    describe('searching projects', () => {
        it('should filter projects by search term (case insensitive)', async () => {
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
            const result = await projectsList.execute({ search: 'work', limit: 50 }, mockTodoistApi)

            expect(mockTodoistApi.getProjects).toHaveBeenCalledWith({ limit: 50, cursor: null })
            expect(result.projects).toHaveLength(2)
            expect(result.projects.map((p) => p.name)).toEqual(['Work Project', 'Hobby Work'])
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
        ])(
            'should handle search with $description',
            async ({ search, projects, expectedCount }) => {
                const mockProjects = projects.map((name) => createMockProject({ name }))
                mockTodoistApi.getProjects.mockResolvedValue(createMockApiResponse(mockProjects))

                const result = await projectsList.execute({ search, limit: 50 }, mockTodoistApi)
                expect(result.projects).toHaveLength(expectedCount)
            },
        )
    })

    describe('error handling', () => {
        it.each([
            { error: TEST_ERRORS.API_UNAUTHORIZED, params: { limit: 50 } },
            { error: TEST_ERRORS.INVALID_CURSOR, params: { cursor: 'invalid-cursor', limit: 50 } },
        ])('should propagate $error', async ({ error, params }) => {
            mockTodoistApi.getProjects.mockRejectedValue(new Error(error))
            await expect(projectsList.execute(params, mockTodoistApi)).rejects.toThrow(error)
        })
    })
})
