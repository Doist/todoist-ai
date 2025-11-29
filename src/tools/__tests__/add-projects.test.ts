import type { PersonalProject, TodoistApi, WorkspaceProject } from '@doist/todoist-api-typescript'
import { type Mocked, vi } from 'vitest'
import { ProjectSchema } from '../../utils/output-schemas.js'
import { createMockProject, TEST_IDS } from '../../utils/test-helpers.js'
import { ToolNames } from '../../utils/tool-names.js'
import { addProjects } from '../add-projects.js'

// Mock the Todoist API
const mockTodoistApi = {
    addProject: vi.fn(),
} as unknown as Mocked<TodoistApi>

const { ADD_PROJECTS } = ToolNames

describe(`${ADD_PROJECTS} tool`, () => {
    beforeEach(() => {
        vi.clearAllMocks()
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

            const textContent = result.textContent
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('Added 1 project:')
            expect(textContent).toContain('test-abc123def456-project')
            expect(textContent).toContain(`id=${TEST_IDS.PROJECT_TEST}`)

            // Verify structured content
            const structuredContent = result.structuredContent
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

            const textContent = result.textContent
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('Added 1 project:')
            expect(textContent).toContain('My Blue Project')
            expect(textContent).toContain('id=project-456')
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

            const textContent = result.textContent
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('Added 1 project:')
            expect(textContent).toContain('Board Project')
            expect(textContent).toContain('id=project-789')
        })

        it('should create project with parentId to create a sub-project', async () => {
            const mockApiResponse = createMockProject({
                id: 'project-child',
                name: 'Child Project',
                parentId: 'project-parent',
            })

            mockTodoistApi.addProject.mockResolvedValue(mockApiResponse)

            const result = await addProjects.execute(
                { projects: [{ name: 'Child Project', parentId: 'project-parent' }] },
                mockTodoistApi,
            )

            expect(mockTodoistApi.addProject).toHaveBeenCalledWith({
                name: 'Child Project',
                parentId: 'project-parent',
            })

            const textContent = result.textContent
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('Added 1 project:')
            expect(textContent).toContain('Child Project')
            expect(textContent).toContain('id=project-child')
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

            const textContent = result.textContent
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('Added 3 projects:')
            expect(textContent).toContain('First Project (id=project-1)')
            expect(textContent).toContain('Second Project (id=project-2)')
            expect(textContent).toContain('Third Project (id=project-3)')

            // Verify structured content
            const structuredContent = result.structuredContent
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    projects: expect.arrayContaining([
                        expect.objectContaining({ id: 'project-1', name: 'First Project' }),
                        expect.objectContaining({ id: 'project-2', name: 'Second Project' }),
                        expect.objectContaining({ id: 'project-3', name: 'Third Project' }),
                    ]),
                    totalCount: 3,
                }),
            )
        })
    })

    describe('output schema validation', () => {
        it('should return structured content that strictly matches ProjectSchema (no extra API properties)', async () => {
            // Mock API response includes ALL properties from Todoist API
            // This simulates the real API response which has many extra fields
            const mockApiResponse = createMockProject({
                id: TEST_IDS.PROJECT_TEST,
                name: 'Schema Test Project',
                color: 'blue',
                isFavorite: true,
                isShared: false,
                parentId: 'parent-123',
                inboxProject: false,
                viewStyle: 'board',
                // Extra properties that should NOT appear in structured output:
                childOrder: 5,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-06-15T12:00:00Z',
                defaultOrder: 10,
                description: 'This should not appear in output',
                isArchived: false,
                isCollapsed: true,
                isDeleted: false,
                isFrozen: false,
                canAssignTasks: true,
                url: 'https://todoist.com/projects/test',
            })

            mockTodoistApi.addProject.mockResolvedValue(mockApiResponse)

            const result = await addProjects.execute(
                { projects: [{ name: 'Schema Test Project' }] },
                mockTodoistApi,
            )

            const structuredContent = result.structuredContent
            expect(structuredContent.projects).toHaveLength(1)

            const project = structuredContent.projects.at(0)
            expect(project).toBeDefined()
            if (!project) return // Type narrowing

            // Verify ONLY the schema-allowed properties are present
            const allowedKeys = [
                'id',
                'name',
                'color',
                'isFavorite',
                'isShared',
                'parentId',
                'inboxProject',
                'viewStyle',
            ]
            const actualKeys = Object.keys(project)
            expect(actualKeys.sort()).toEqual(allowedKeys.sort())

            // Verify NO extra API properties leaked through
            const disallowedKeys = [
                'childOrder',
                'createdAt',
                'updatedAt',
                'defaultOrder',
                'description',
                'isArchived',
                'isCollapsed',
                'isDeleted',
                'isFrozen',
                'canAssignTasks',
                'url',
            ]
            for (const key of disallowedKeys) {
                expect(project).not.toHaveProperty(key)
            }

            // Validate against the actual Zod schema (strict mode rejects extra properties)
            const parseResult = ProjectSchema.strict().safeParse(project)
            expect(parseResult.success).toBe(true)
        })

        it('should produce output that passes strict schema validation for multiple projects', async () => {
            type Project = PersonalProject | WorkspaceProject
            const mockProjects: [Project, Project] = [
                createMockProject({
                    id: 'project-1',
                    name: 'First',
                    childOrder: 1,
                    url: 'https://todoist.com/1',
                }),
                createMockProject({
                    id: 'project-2',
                    name: 'Second',
                    childOrder: 2,
                    url: 'https://todoist.com/2',
                }),
            ]

            const [project1, project2] = mockProjects
            mockTodoistApi.addProject
                .mockResolvedValueOnce(project1)
                .mockResolvedValueOnce(project2)

            const result = await addProjects.execute(
                { projects: [{ name: 'First' }, { name: 'Second' }] },
                mockTodoistApi,
            )

            // Validate each project in structured content against strict schema
            for (const project of result.structuredContent.projects) {
                const parseResult = ProjectSchema.strict().safeParse(project)
                expect(parseResult.success).toBe(true)
                if (!parseResult.success) {
                    console.error('Schema validation failed:', parseResult.error.format())
                }
            }
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
