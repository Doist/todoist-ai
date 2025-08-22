import type { PersonalProject, TodoistApi, WorkspaceProject } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import {
    TEST_IDS,
    createMockProject,
    extractStructuredContent,
    extractTextContent,
} from '../../utils/test-helpers.js'
import { ToolNames } from '../../utils/tool-names.js'
import { addProjects } from '../add-projects.js'

// Mock the Todoist API
const mockTodoistApi = {
    addProject: jest.fn(),
} as unknown as jest.Mocked<TodoistApi>

const { ADD_TASKS, ADD_PROJECTS, ADD_SECTIONS } = ToolNames

describe(`${ADD_PROJECTS} tool`, () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('creating a single project', () => {
        it('should create a project and return mapped result', async () => {
            const mockApiResponse = createMockProject({
                id: TEST_IDS.PROJECT_TEST,
                name: 'test-abc123def456-project',
                childOrder: 1,
                createdAt: '2024-01-01T00:00:00Z',
            })

            mockTodoistApi.addProject.mockResolvedValue(mockApiResponse)

            const result = await addProjects.execute(
                { projects: [{ name: 'test-abc123def456-project' }] },
                mockTodoistApi,
            )

            // Verify API was called correctly
            expect(mockTodoistApi.addProject).toHaveBeenCalledWith({
                name: 'test-abc123def456-project',
            })

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('Added 1 project:')
            expect(textContent).toContain('test-abc123def456-project')
            expect(textContent).toContain(`id=${TEST_IDS.PROJECT_TEST}`)
            expect(textContent).toContain(`Use ${ADD_TASKS} to add your first tasks`)

            // Verify structured content
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    projects: [
                        expect.objectContaining({
                            id: TEST_IDS.PROJECT_TEST,
                            name: 'test-abc123def456-project',
                        }),
                    ],
                    totalCount: 1,
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

            const result = await addProjects.execute(
                { projects: [{ name: 'My Blue Project' }] },
                mockTodoistApi,
            )

            expect(mockTodoistApi.addProject).toHaveBeenCalledWith({
                name: 'My Blue Project',
                isFavorite: undefined,
                viewStyle: undefined,
            })

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('Added 1 project:')
            expect(textContent).toContain('My Blue Project')
            expect(textContent).toContain('id=project-456')
            expect(textContent).toContain(`Use ${ADD_SECTIONS} to organize new project`)
        })

        it('should create project with isFavorite and viewStyle options', async () => {
            const mockApiResponse = createMockProject({
                id: 'project-789',
                name: 'Board Project',
                isFavorite: true,
                viewStyle: 'board',
            })

            mockTodoistApi.addProject.mockResolvedValue(mockApiResponse)

            const result = await addProjects.execute(
                { projects: [{ name: 'Board Project', isFavorite: true, viewStyle: 'board' }] },
                mockTodoistApi,
            )

            expect(mockTodoistApi.addProject).toHaveBeenCalledWith({
                name: 'Board Project',
                isFavorite: true,
                viewStyle: 'board',
            })

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('Added 1 project:')
            expect(textContent).toContain('Board Project')
            expect(textContent).toContain('id=project-789')
        })
    })

    describe('creating multiple projects', () => {
        it('should create multiple projects and return mapped results', async () => {
            type Project = PersonalProject | WorkspaceProject
            const mockProjects: [Project, Project, Project] = [
                createMockProject({ id: 'project-1', name: 'First Project' }),
                createMockProject({ id: 'project-2', name: 'Second Project' }),
                createMockProject({ id: 'project-3', name: 'Third Project' }),
            ]

            const [project1, project2, project3] = mockProjects
            mockTodoistApi.addProject
                .mockResolvedValueOnce(project1)
                .mockResolvedValueOnce(project2)
                .mockResolvedValueOnce(project3)

            const result = await addProjects.execute(
                {
                    projects: [
                        { name: 'First Project' },
                        { name: 'Second Project' },
                        { name: 'Third Project' },
                    ],
                },
                mockTodoistApi,
            )

            // Verify API was called correctly for each project
            expect(mockTodoistApi.addProject).toHaveBeenCalledTimes(3)
            expect(mockTodoistApi.addProject).toHaveBeenNthCalledWith(1, { name: 'First Project' })
            expect(mockTodoistApi.addProject).toHaveBeenNthCalledWith(2, { name: 'Second Project' })
            expect(mockTodoistApi.addProject).toHaveBeenNthCalledWith(3, { name: 'Third Project' })

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('Added 3 projects:')
            expect(textContent).toContain('First Project (id=project-1)')
            expect(textContent).toContain('Second Project (id=project-2)')
            expect(textContent).toContain('Third Project (id=project-3)')
            expect(textContent).toContain(`Use ${ADD_SECTIONS} to organize these projects`)

            // Verify structured content
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    projects: mockProjects,
                    totalCount: 3,
                }),
            )
        })
    })

    describe('error handling', () => {
        it('should propagate API errors', async () => {
            const apiError = new Error('API Error: Project name is required')
            mockTodoistApi.addProject.mockRejectedValue(apiError)

            await expect(
                addProjects.execute({ projects: [{ name: '' }] }, mockTodoistApi),
            ).rejects.toThrow('API Error: Project name is required')
        })

        it('should handle partial failures in multiple projects', async () => {
            const mockProject = createMockProject({
                id: 'project-1',
                name: 'First Project',
            })

            mockTodoistApi.addProject
                .mockResolvedValueOnce(mockProject)
                .mockRejectedValueOnce(new Error('API Error: Invalid project name'))

            await expect(
                addProjects.execute(
                    {
                        projects: [{ name: 'First Project' }, { name: 'Invalid' }],
                    },
                    mockTodoistApi,
                ),
            ).rejects.toThrow('API Error: Invalid project name')
        })
    })
})
