import type { PersonalProject, Task, WorkspaceProject } from '@doist/todoist-api-typescript'
import {
    createMoveTaskArgs,
    isPersonalProject,
    isWorkspaceProject,
    mapProject,
    mapTask,
} from './tool-helpers.js'

describe('shared utilities', () => {
    describe('mapTask', () => {
        it('should map a basic task correctly', () => {
            const mockTask = {
                id: '123',
                content: 'Test task',
                description: 'Test description',
                projectId: 'proj-1',
                sectionId: null,
                parentId: null,
                labels: ['work'],
                priority: 1,
                due: {
                    date: '2024-01-15',
                    isRecurring: false,
                    datetime: '2024-01-15T10:00:00Z',
                    string: 'Jan 15',
                    timezone: 'UTC',
                },
            } as unknown as Task

            expect(mapTask(mockTask)).toEqual({
                id: '123',
                content: 'Test task',
                description: 'Test description',
                dueDate: '2024-01-15',
                recurring: false,
                priority: 1,
                projectId: 'proj-1',
                sectionId: null,
                parentId: null,
                labels: ['work'],
                duration: null,
            })
        })

        it('should handle recurring tasks', () => {
            const mockTask = {
                id: '456',
                content: 'Recurring task',
                description: '',
                projectId: 'proj-1',
                sectionId: null,
                parentId: null,
                labels: [],
                priority: 1,
                due: {
                    date: '2024-01-15',
                    isRecurring: true,
                    datetime: '2024-01-15T10:00:00Z',
                    string: 'every day',
                    timezone: 'UTC',
                },
            } as unknown as Task

            const result = mapTask(mockTask)

            expect(result.recurring).toBe('every day')
            expect(result.duration).toBe(null)
        })

        it('should handle task with duration', () => {
            const mockTask = {
                id: '789',
                content: 'Task with duration',
                description: '',
                projectId: 'proj-1',
                sectionId: null,
                parentId: null,
                labels: [],
                priority: 1,
                duration: {
                    amount: 150,
                    unit: 'minute',
                },
            } as unknown as Task

            const result = mapTask(mockTask)

            expect(result.duration).toBe('2h30m')
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
                parentId: null,
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
                parentId: null,
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
})
