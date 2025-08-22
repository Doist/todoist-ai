import type { PersonalProject, TodoistApi, WorkspaceProject } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import {
    createMockProject,
    extractStructuredContent,
    extractTextContent,
} from '../../utils/test-helpers.js'
import { ToolNames } from '../../utils/tool-names.js'
import { updateProjects } from '../update-projects.js'

// Mock the Todoist API
const mockTodoistApi = {
    updateProject: jest.fn(),
} as unknown as jest.Mocked<TodoistApi>

const { FIND_PROJECTS, UPDATE_PROJECTS, GET_OVERVIEW } = ToolNames

describe(`${UPDATE_PROJECTS} tool`, () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('updating a single project', () => {
        it('should update a project when id and name are provided', async () => {
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

            const result = await updateProjects.execute(
                { projects: [{ id: 'existing-project-123', name: 'Updated Project Name' }] },
                mockTodoistApi,
            )

            expect(mockTodoistApi.updateProject).toHaveBeenCalledWith('existing-project-123', {
                name: 'Updated Project Name',
            })

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('Updated 1 project:')
            expect(textContent).toContain('Updated Project Name (id=existing-project-123)')
            expect(textContent).toContain(`Use ${GET_OVERVIEW} with projectId=existing-project-123`)

            // Verify structured content
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    projects: [mockApiResponse],
                    totalCount: 1,
                    updatedProjectIds: ['existing-project-123'],
                    appliedOperations: {
                        updateCount: 1,
                        skippedCount: 0,
                    },
                }),
            )
        })

        it('should update project with isFavorite and viewStyle options', async () => {
            const mockApiResponse: PersonalProject = {
                url: 'https://todoist.com/projects/project-123',
                id: 'project-123',
                parentId: null,
                isDeleted: false,
                updatedAt: '2025-08-13T22:10:30.000000Z',
                childOrder: 1,
                description: '',
                isCollapsed: false,
                canAssignTasks: false,
                color: 'red',
                isFavorite: true,
                isFrozen: false,
                name: 'Updated Favorite Project',
                viewStyle: 'board',
                isArchived: false,
                inboxProject: false,
                isShared: false,
                createdAt: '2024-01-01T00:00:00Z',
                defaultOrder: 0,
            }

            mockTodoistApi.updateProject.mockResolvedValue(mockApiResponse)

            const result = await updateProjects.execute(
                {
                    projects: [
                        {
                            id: 'project-123',
                            name: 'Updated Favorite Project',
                            isFavorite: true,
                            viewStyle: 'board',
                        },
                    ],
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.updateProject).toHaveBeenCalledWith('project-123', {
                name: 'Updated Favorite Project',
                isFavorite: true,
                viewStyle: 'board',
            })

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('Updated 1 project:')
            expect(textContent).toContain('Updated Favorite Project (id=project-123)')
        })
    })

    describe('updating multiple projects', () => {
        it('should update multiple projects and return mapped results', async () => {
            type Project = PersonalProject | WorkspaceProject
            const mockProjects: [Project, Project, Project] = [
                createMockProject({ id: 'project-1', name: 'Updated First Project' }),
                createMockProject({ id: 'project-2', name: 'Updated Second Project' }),
                createMockProject({ id: 'project-3', name: 'Updated Third Project' }),
            ]

            const [project1, project2, project3] = mockProjects
            mockTodoistApi.updateProject
                .mockResolvedValueOnce(project1)
                .mockResolvedValueOnce(project2)
                .mockResolvedValueOnce(project3)

            const result = await updateProjects.execute(
                {
                    projects: [
                        { id: 'project-1', name: 'Updated First Project' },
                        { id: 'project-2', name: 'Updated Second Project' },
                        { id: 'project-3', name: 'Updated Third Project' },
                    ],
                },
                mockTodoistApi,
            )

            // Verify API was called correctly for each project
            expect(mockTodoistApi.updateProject).toHaveBeenCalledTimes(3)
            expect(mockTodoistApi.updateProject).toHaveBeenNthCalledWith(1, 'project-1', {
                name: 'Updated First Project',
            })
            expect(mockTodoistApi.updateProject).toHaveBeenNthCalledWith(2, 'project-2', {
                name: 'Updated Second Project',
            })
            expect(mockTodoistApi.updateProject).toHaveBeenNthCalledWith(3, 'project-3', {
                name: 'Updated Third Project',
            })

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('Updated 3 projects:')
            expect(textContent).toContain('Updated First Project (id=project-1)')
            expect(textContent).toContain('Updated Second Project (id=project-2)')
            expect(textContent).toContain('Updated Third Project (id=project-3)')
            expect(textContent).toContain(`Use ${FIND_PROJECTS} to see all projects`)

            // Verify structured content
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    projects: mockProjects,
                    totalCount: 3,
                    updatedProjectIds: ['project-1', 'project-2', 'project-3'],
                    appliedOperations: {
                        updateCount: 3,
                        skippedCount: 0,
                    },
                }),
            )
        })

        it('should skip projects with no updates and report correctly', async () => {
            const mockProject = createMockProject({
                id: 'project-1',
                name: 'Updated Project',
            })

            mockTodoistApi.updateProject.mockResolvedValue(mockProject)

            const result = await updateProjects.execute(
                {
                    projects: [
                        { id: 'project-1', name: 'Updated Project' },
                        { id: 'project-2' }, // No name provided, should be skipped
                    ],
                },
                mockTodoistApi,
            )

            // Should only call API once for the project with actual updates
            expect(mockTodoistApi.updateProject).toHaveBeenCalledTimes(1)
            expect(mockTodoistApi.updateProject).toHaveBeenCalledWith('project-1', {
                name: 'Updated Project',
            })

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('Updated 1 project (1 skipped - no changes):')
            expect(textContent).toContain('Updated Project (id=project-1)')

            // Verify structured content reflects skipped count
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    appliedOperations: {
                        updateCount: 1,
                        skippedCount: 1,
                    },
                }),
            )
        })
    })

    describe('error handling', () => {
        it('should propagate API errors', async () => {
            const apiError = new Error('API Error: Project not found')
            mockTodoistApi.updateProject.mockRejectedValue(apiError)

            await expect(
                updateProjects.execute(
                    { projects: [{ id: 'nonexistent', name: 'New Name' }] },
                    mockTodoistApi,
                ),
            ).rejects.toThrow('API Error: Project not found')
        })

        it('should handle partial failures in multiple projects', async () => {
            const mockProject = createMockProject({
                id: 'project-1',
                name: 'Updated Project',
            })

            mockTodoistApi.updateProject
                .mockResolvedValueOnce(mockProject)
                .mockRejectedValueOnce(new Error('API Error: Project not found'))

            await expect(
                updateProjects.execute(
                    {
                        projects: [
                            { id: 'project-1', name: 'Updated Project' },
                            { id: 'nonexistent', name: 'New Name' },
                        ],
                    },
                    mockTodoistApi,
                ),
            ).rejects.toThrow('API Error: Project not found')
        })
    })
})
