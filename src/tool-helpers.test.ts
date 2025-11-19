import type { PersonalProject, Section, TodoistApi, WorkspaceProject } from '@doist/todoist-api-typescript'
import { type Mocked, vi } from 'vitest'
import {
    createMoveTaskArgs,
    fetchAllPages,
    fetchAllProjects,
    fetchAllSections,
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

    describe('fetchAllPages', () => {
        const mockApiMethod = vi.fn()

        beforeEach(() => {
            vi.clearAllMocks()
        })

        it('should fetch all pages when there are multiple pages', async () => {
            const page1Items = [{ id: '1', name: 'Item 1' }, { id: '2', name: 'Item 2' }]
            const page2Items = [{ id: '3', name: 'Item 3' }]

            mockApiMethod
                .mockResolvedValueOnce({ results: page1Items, nextCursor: 'cursor-page-2' })
                .mockResolvedValueOnce({ results: page2Items, nextCursor: null })

            const result = await fetchAllPages({
                apiMethod: mockApiMethod,
                args: { someParam: 'test' },
                limit: 100,
            })

            expect(mockApiMethod).toHaveBeenCalledTimes(2)
            expect(mockApiMethod).toHaveBeenNthCalledWith(1, {
                someParam: 'test',
                cursor: null,
                limit: 100,
            })
            expect(mockApiMethod).toHaveBeenNthCalledWith(2, {
                someParam: 'test',
                cursor: 'cursor-page-2',
                limit: 100,
            })
            expect(result).toHaveLength(3)
            expect(result.map(item => item.id)).toEqual(['1', '2', '3'])
        })

        it('should fetch single page when there is no next cursor', async () => {
            const items = [{ id: '1', name: 'Item 1' }]

            mockApiMethod.mockResolvedValueOnce({ results: items, nextCursor: null })

            const result = await fetchAllPages({
                apiMethod: mockApiMethod,
                args: {},
                limit: 50,
            })

            expect(mockApiMethod).toHaveBeenCalledTimes(1)
            expect(mockApiMethod).toHaveBeenCalledWith({
                cursor: null,
                limit: 50,
            })
            expect(result).toHaveLength(1)
        })

        it('should use default limit when not specified', async () => {
            mockApiMethod.mockResolvedValueOnce({ results: [], nextCursor: null })

            await fetchAllPages({
                apiMethod: mockApiMethod,
            })

            expect(mockApiMethod).toHaveBeenCalledWith({
                cursor: null,
                limit: 100, // default
            })
        })
    })

    describe('fetchAllProjects', () => {
        const mockTodoistApi = {
            getProjects: vi.fn(),
        } as unknown as Mocked<TodoistApi>

        beforeEach(() => {
            vi.clearAllMocks()
        })

        it('should delegate to fetchAllPages with correct parameters', async () => {
            const projects = [
                createMockProject({ id: 'proj-1', name: 'Project 1' }),
            ]

            mockTodoistApi.getProjects.mockResolvedValueOnce(createMockApiResponse(projects, null))

            const result = await fetchAllProjects(mockTodoistApi)

            expect(mockTodoistApi.getProjects).toHaveBeenCalledWith({
                cursor: null,
                limit: 200, // PROJECTS_MAX
            })
            expect(result).toHaveLength(1)
            expect(result[0].id).toBe('proj-1')
        })
    })

    describe('fetchAllSections', () => {
        const mockTodoistApi = {
            getSections: vi.fn(),
        } as unknown as Mocked<TodoistApi>

        beforeEach(() => {
            vi.clearAllMocks()
        })

        const createMockSection = (overrides: Partial<Section> = {}): Section => ({
            id: 'section-id',
            name: 'Section Name',
            projectId: 'project-id',
            order: 1,
            ...overrides,
        })

        it('should delegate to fetchAllPages with correct parameters', async () => {
            const sections = [
                createMockSection({ id: 'sect-1', name: 'Section 1' }),
            ]

            mockTodoistApi.getSections.mockResolvedValueOnce({
                results: sections,
                nextCursor: null
            })

            const result = await fetchAllSections(mockTodoistApi, 'project-123')

            expect(mockTodoistApi.getSections).toHaveBeenCalledWith({
                projectId: 'project-123',
                cursor: null,
                limit: 200, // SECTIONS_MAX
            })
            expect(result).toHaveLength(1)
            expect(result[0].id).toBe('sect-1')
        })
    })
})
