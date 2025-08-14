import type { PersonalProject, TodoistApi } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import { projectsManage } from '../projects-manage'
import { TEST_IDS, createMockProject } from '../test-helpers'

// Mock the Todoist API
const mockTodoistApi = {
    addProject: jest.fn(),
    updateProject: jest.fn(),
} as unknown as jest.Mocked<TodoistApi>

describe('projects-manage tool', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('creating a new project', () => {
        it('should create a project and return mapped result', async () => {
            const mockApiResponse = createMockProject({
                id: TEST_IDS.PROJECT_TEST,
                name: 'test-abc123def456-project',
                childOrder: 1,
                createdAt: '2024-01-01T00:00:00Z',
            })

            mockTodoistApi.addProject.mockResolvedValue(mockApiResponse)

            const result = await projectsManage.execute(
                { name: 'test-abc123def456-project' },
                mockTodoistApi,
            )

            // Verify API was called correctly
            expect(mockTodoistApi.addProject).toHaveBeenCalledWith({
                name: 'test-abc123def456-project',
            })

            // Verify result is properly mapped
            expect(result).toEqual({
                id: TEST_IDS.PROJECT_TEST,
                name: 'test-abc123def456-project',
                color: 'charcoal',
                isFavorite: false,
                isShared: false,
                parentId: null,
                inboxProject: false,
                viewStyle: 'list',
            })
        })

        it('should handle different project properties from API', async () => {
            const mockApiResponse = createMockProject({
                id: 'project-456',
                name: 'My Blue Project',
                color: 'blue',
                isFavorite: true,
                isShared: true,
                parentId: 'parent-123',
                viewStyle: 'board',
                childOrder: 2,
                description: 'A test project',
                createdAt: '2024-01-01T00:00:00Z',
            })

            mockTodoistApi.addProject.mockResolvedValue(mockApiResponse)

            const result = await projectsManage.execute({ name: 'My Blue Project' }, mockTodoistApi)

            expect(mockTodoistApi.addProject).toHaveBeenCalledWith({ name: 'My Blue Project' })

            expect(result).toEqual({
                id: 'project-456',
                name: 'My Blue Project',
                color: 'blue',
                isFavorite: true,
                isShared: true,
                parentId: 'parent-123',
                inboxProject: false,
                viewStyle: 'board',
            })
        })
    })

    describe('updating an existing project', () => {
        it('should update a project when id is provided', async () => {
            const mockApiResponse: PersonalProject = {
                url: 'https://todoist.com/projects/existing-project-123',
                id: 'existing-project-123',
                parentId: null,
                isDeleted: false,
                updatedAt: '2025-08-13T22:10:30.000000Z',
                childOrder: 1,
                description: '',
                isCollapsed: false,
                canAssignTasks: false,
                color: 'red',
                isFavorite: false,
                isFrozen: false,
                name: 'Updated Project Name',
                viewStyle: 'list',
                isArchived: false,
                inboxProject: false,
                isShared: false,
                createdAt: '2024-01-01T00:00:00Z',
                defaultOrder: 0,
            }

            mockTodoistApi.updateProject.mockResolvedValue(mockApiResponse)

            const result = await projectsManage.execute(
                { id: 'existing-project-123', name: 'Updated Project Name' },
                mockTodoistApi,
            )

            expect(mockTodoistApi.updateProject).toHaveBeenCalledWith('existing-project-123', {
                name: 'Updated Project Name',
            })

            // Update returns raw project (not mapped) - this is the actual behavior
            expect(result).toEqual(mockApiResponse)
        })
    })

    describe('error handling', () => {
        it('should propagate API errors', async () => {
            const apiError = new Error('API Error: Project name is required')
            mockTodoistApi.addProject.mockRejectedValue(apiError)

            await expect(projectsManage.execute({ name: '' }, mockTodoistApi)).rejects.toThrow(
                'API Error: Project name is required',
            )
        })
    })
})
