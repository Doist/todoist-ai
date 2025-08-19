import type { PersonalProject, TodoistApi } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import { projectsManage } from '../projects-manage.js'
import {
    TEST_IDS,
    createMockProject,
    extractStructuredContent,
    extractTextContent,
} from '../test-helpers.js'

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

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('Created project: test-abc123def456-project')
            expect(textContent).toContain(`id=${TEST_IDS.PROJECT_TEST}`)
            expect(textContent).toContain('Use tasks-add-multiple to add your first tasks')

            // Verify structured content
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    project: expect.objectContaining({
                        id: TEST_IDS.PROJECT_TEST,
                        name: 'test-abc123def456-project',
                    }),
                    operation: 'created',
                }),
            )
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

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('Created project: My Blue Project')
            expect(textContent).toContain('id=project-456')
            expect(textContent).toContain('Use sections-manage to organize this project')
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

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('Updated project: Updated Project Name')
            expect(textContent).toContain('id=existing-project-123')
            expect(textContent).toContain('Use projects-list to see all projects')
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
