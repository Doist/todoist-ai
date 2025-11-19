import type { PersonalProject, TodoistApi, WorkspaceProject } from '@doist/todoist-api-typescript'
import { type Mocked, vi } from 'vitest'
import {
    createMoveTaskArgs,
    fetchAllProjects,
    isPersonalProject,
    isWorkspaceProject,
    mapProject,
    mapTask,
} from './tool-helpers.js'
import { createMockProject, createMockTask, createMockApiResponse } from './utils/test-helpers.js'

describe('shared utilities', () => {
    describe('mapTask', () => {
        it('should map a basic task correctly', () => {
            const mockTask = createMockTask({
                id: '123',
                content: 'Test task',
                description: 'Test description',
                projectId: 'proj-1',
                labels: ['work'],
                due: {
                    date: '2024-01-15',
                    isRecurring: false,
                    datetime: '2024-01-15T10:00:00Z',
                    string: 'Jan 15',
                    timezone: 'UTC',
                },
            })

            expect(mapTask(mockTask)).toEqual({
                id: '123',
                content: 'Test task',
                description: 'Test description',
                dueDate: '2024-01-15',
                recurring: false,
                priority: 'p4',
                projectId: 'proj-1',
                sectionId: undefined,
                parentId: undefined,
                labels: ['work'],
                duration: undefined,
                assignedByUid: undefined,
                checked: false,
                completedAt: undefined,
                deadlineDate: undefined,
                responsibleUid: undefined,
            })
        })

        it('should handle recurring tasks', () => {
            const mockTask = createMockTask({
                id: '456',
                content: 'Recurring task',
                projectId: 'proj-1',
                due: {
                    date: '2024-01-15',
                    isRecurring: true,
                    datetime: '2024-01-15T10:00:00Z',
                    string: 'every day',
                    timezone: 'UTC',
                },
            })

            const result = mapTask(mockTask)

            expect(result.recurring).toBe('every day')
            expect(result.duration).toBe(undefined)
        })

        it('should handle task with duration', () => {
            const mockTask = createMockTask({
                id: '789',
                content: 'Task with duration',
                projectId: 'proj-1',
                duration: { amount: 150, unit: 'minute' },
            })

            const result = mapTask(mockTask)
            expect(result.duration).toBe('2h30m')
        })

        it('should preserve markdown links and formatting in content and description', () => {
            const mockTask = createMockTask({
                id: '123',
                content: 'Task with **bold** and [link](https://example.com)',
                description: `Rich markdown description:

### Links
[Wikipedia](https://en.wikipedia.org/wiki/Test)
[GitHub](https://github.com/example/repo)

### Formatting
**Bold text**
*Italic text*
\`code block\`

End of description.`,
                projectId: 'proj-1',
            })

            const result = mapTask(mockTask)

            // Verify exact preservation of markdown content
            expect(result.content).toBe('Task with **bold** and [link](https://example.com)')
            expect(result.description).toBe(`Rich markdown description:

### Links
[Wikipedia](https://en.wikipedia.org/wiki/Test)
[GitHub](https://github.com/example/repo)

### Formatting
**Bold text**
*Italic text*
\`code block\`

End of description.`)

            // Verify specific URLs are preserved
            expect(result.content).toContain('[link](https://example.com)')
            expect(result.description).toContain('[Wikipedia](https://en.wikipedia.org/wiki/Test)')
            expect(result.description).toContain('[GitHub](https://github.com/example/repo)')

            // Verify other markdown formatting is preserved
            expect(result.content).toContain('**bold**')
            expect(result.description).toContain('**Bold text**')
            expect(result.description).toContain('*Italic text*')
            expect(result.description).toContain('`code block`')
        })
    })

    describe('mapProject', () => {
        it('should map a personal project correctly', () => {
            const mockPersonalProject = {
                id: 'proj-1',
                name: 'Personal Project',
                color: 'blue',
                isFavorite: false,
                isShared: false,
                parentId: null,
                inboxProject: false,
                viewStyle: 'list',
            } as unknown as PersonalProject

            expect(mapProject(mockPersonalProject)).toEqual({
                id: 'proj-1',
                name: 'Personal Project',
                color: 'blue',
                isFavorite: false,
                isShared: false,
                parentId: undefined,
                inboxProject: false,
                viewStyle: 'list',
            })
        })

        it('should map a workspace project correctly', () => {
            const mockWorkspaceProject = {
                id: 'proj-2',
                name: 'Workspace Project',
                color: 'red',
                isFavorite: true,
                isShared: true,
                viewStyle: 'board',
            } as unknown as WorkspaceProject

            expect(mapProject(mockWorkspaceProject)).toEqual({
                id: 'proj-2',
                name: 'Workspace Project',
                color: 'red',
                isFavorite: true,
                isShared: true,
                parentId: undefined,
                inboxProject: false,
                viewStyle: 'board',
            })
        })
    })

    describe('type guards', () => {
        it('should correctly identify personal projects', () => {
            const personalProject = {
                id: 'proj-1',
                name: 'Personal',
                color: 'blue',
                isFavorite: false,
                isShared: false,
                parentId: null,
                inboxProject: true,
                viewStyle: 'list',
            } as unknown as PersonalProject

            expect(isPersonalProject(personalProject)).toBe(true)
            expect(isWorkspaceProject(personalProject)).toBe(false)
        })

        it('should correctly identify workspace projects', () => {
            const workspaceProject = {
                id: 'proj-2',
                name: 'Workspace',
                color: 'red',
                isFavorite: false,
                isShared: true,
                viewStyle: 'board',
                accessLevel: 'admin',
            } as unknown as WorkspaceProject

            expect(isWorkspaceProject(workspaceProject)).toBe(true)
            expect(isPersonalProject(workspaceProject)).toBe(false)
        })
    })

    describe('createMoveTaskArgs', () => {
        it('should create MoveTaskArgs for projectId', () => {
            const result = createMoveTaskArgs('task-1', 'project-123')
            expect(result).toEqual({ projectId: 'project-123' })
        })

        it('should create MoveTaskArgs for sectionId', () => {
            const result = createMoveTaskArgs('task-1', undefined, 'section-456')
            expect(result).toEqual({ sectionId: 'section-456' })
        })

        it('should create MoveTaskArgs for parentId', () => {
            const result = createMoveTaskArgs('task-1', undefined, undefined, 'parent-789')
            expect(result).toEqual({ parentId: 'parent-789' })
        })

        it('should throw error when multiple move parameters are provided', () => {
            expect(() => createMoveTaskArgs('task-1', 'project-123', 'section-456')).toThrow(
                'Task task-1: Only one of projectId, sectionId, or parentId can be specified at a time',
            )
        })

        it('should throw error when all three move parameters are provided', () => {
            expect(() =>
                createMoveTaskArgs('task-1', 'project-123', 'section-456', 'parent-789'),
            ).toThrow(
                'Task task-1: Only one of projectId, sectionId, or parentId can be specified at a time',
            )
        })

        it('should throw error when no move parameters are provided', () => {
            expect(() => createMoveTaskArgs('task-1')).toThrow(
                'Task task-1: At least one of projectId, sectionId, or parentId must be provided',
            )
        })

        it('should throw error when empty strings are provided', () => {
            expect(() => createMoveTaskArgs('task-1', '', '', '')).toThrow(
                'Task task-1: At least one of projectId, sectionId, or parentId must be provided',
            )
        })
    })

    describe('fetchAllProjects', () => {
        const mockTodoistApi = {
            getProjects: vi.fn(),
        } as unknown as Mocked<TodoistApi>

        beforeEach(() => {
            vi.clearAllMocks()
        })

        it('should fetch all projects when there are multiple pages', async () => {
            const page1Projects = [
                createMockProject({ id: 'proj-1', name: 'Project 1' }),
                createMockProject({ id: 'proj-2', name: 'Project 2' }),
            ]
            const page2Projects = [
                createMockProject({ id: 'proj-3', name: 'Project 3' }),
            ]

            mockTodoistApi.getProjects
                .mockResolvedValueOnce(createMockApiResponse(page1Projects, 'cursor-page-2'))
                .mockResolvedValueOnce(createMockApiResponse(page2Projects, null))

            const result = await fetchAllProjects(mockTodoistApi)

            expect(mockTodoistApi.getProjects).toHaveBeenCalledTimes(2)
            expect(mockTodoistApi.getProjects).toHaveBeenNthCalledWith(1, {
                limit: 200,
                cursor: null,
            })
            expect(mockTodoistApi.getProjects).toHaveBeenNthCalledWith(2, {
                limit: 200,
                cursor: 'cursor-page-2',
            })
            expect(result).toHaveLength(3)
            expect(result.map(p => p.id)).toEqual(['proj-1', 'proj-2', 'proj-3'])
        })

        it('should fetch all projects when there is only one page', async () => {
            const projects = [
                createMockProject({ id: 'proj-1', name: 'Project 1' }),
                createMockProject({ id: 'proj-2', name: 'Project 2' }),
            ]

            mockTodoistApi.getProjects
                .mockResolvedValueOnce(createMockApiResponse(projects, null))

            const result = await fetchAllProjects(mockTodoistApi)

            expect(mockTodoistApi.getProjects).toHaveBeenCalledTimes(1)
            expect(mockTodoistApi.getProjects).toHaveBeenCalledWith({
                limit: 200,
                cursor: null,
            })
            expect(result).toHaveLength(2)
            expect(result.map(p => p.id)).toEqual(['proj-1', 'proj-2'])
        })

        it('should handle empty project list', async () => {
            mockTodoistApi.getProjects
                .mockResolvedValueOnce(createMockApiResponse([], null))

            const result = await fetchAllProjects(mockTodoistApi)

            expect(mockTodoistApi.getProjects).toHaveBeenCalledTimes(1)
            expect(result).toHaveLength(0)
        })
    })
})
