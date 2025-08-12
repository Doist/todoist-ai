import type { PersonalProject, Task, WorkspaceProject } from '@doist/todoist-api-typescript'
import { isPersonalProject, isWorkspaceProject, mapProject, mapTask } from './shared'

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

            const result = mapTask(mockTask)

            expect(result).toEqual({
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

            const result = mapProject(mockPersonalProject)

            expect(result).toEqual({
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

            const result = mapProject(mockWorkspaceProject)

            expect(result).toEqual({
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
})
