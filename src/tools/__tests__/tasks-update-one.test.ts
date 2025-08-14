import type { Task, TodoistApi } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import { tasksUpdateOne } from '../tasks-update-one.js'
import { createMockTask } from '../test-helpers.js'

// Mock the Todoist API
const mockTodoistApi = {
    updateTask: jest.fn(),
    moveTasks: jest.fn(),
} as unknown as jest.Mocked<TodoistApi>

describe('tasks-update-one tool', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('updating task properties', () => {
        it('should update task content and description', async () => {
            // Mock API response extracted from recordings (Task type)
            const mockApiResponse: Task = createMockTask({
                id: '8485093748',
                content: 'Updated task content',
                description: 'Updated task description',
                url: 'https://todoist.com/showTask?id=8485093748',
                addedAt: '2025-08-13T22:09:56.123456Z',
            })

            mockTodoistApi.updateTask.mockResolvedValue(mockApiResponse)

            const result = await tasksUpdateOne.execute(
                {
                    id: '8485093748',
                    content: 'Updated task content',
                    description: 'Updated task description',
                },
                mockTodoistApi,
            )

            // Verify API was called correctly
            expect(mockTodoistApi.updateTask).toHaveBeenCalledWith('8485093748', {
                content: 'Updated task content',
                description: 'Updated task description',
            })

            // Verify result matches API response
            expect(result).toEqual(mockApiResponse)
        })

        it('should update task priority and due date', async () => {
            const mockApiResponse: Task = createMockTask({
                id: '8485093749',
                content: 'Original task content',
                labels: ['urgent'],
                priority: 3,
                url: 'https://todoist.com/showTask?id=8485093749',
                addedAt: '2025-08-13T22:09:56.123456Z',
                due: {
                    date: '2025-08-20',
                    isRecurring: false,
                    lang: 'en',
                    string: 'Aug 20',
                    timezone: null,
                },
            })

            mockTodoistApi.updateTask.mockResolvedValue(mockApiResponse)

            const result = await tasksUpdateOne.execute(
                { id: '8485093749', priority: 3, dueString: 'Aug 20' },
                mockTodoistApi,
            )

            expect(mockTodoistApi.updateTask).toHaveBeenCalledWith('8485093749', {
                priority: 3,
                dueString: 'Aug 20',
            })

            expect(result).toEqual(mockApiResponse)
        })

        it('should move task to different project', async () => {
            const mockApiResponse: Task = createMockTask({
                id: '8485093750',
                content: 'Task to move',
                projectId: 'new-project-id',
                url: 'https://todoist.com/showTask?id=8485093750',
                addedAt: '2025-08-13T22:09:56.123456Z',
            })

            mockTodoistApi.moveTasks.mockResolvedValue([mockApiResponse])

            const result = await tasksUpdateOne.execute(
                { id: '8485093750', projectId: 'new-project-id' },
                mockTodoistApi,
            )

            expect(mockTodoistApi.moveTasks).toHaveBeenCalledWith(['8485093750'], {
                projectId: 'new-project-id',
            })
            expect(mockTodoistApi.updateTask).not.toHaveBeenCalled()

            expect(result).toEqual(mockApiResponse)
        })

        it('should update task parent (create subtask relationship)', async () => {
            const mockApiResponse: Task = createMockTask({
                id: '8485093751',
                content: 'Subtask content',
                parentId: 'parent-task-123',
                url: 'https://todoist.com/showTask?id=8485093751',
                addedAt: '2025-08-13T22:09:56.123456Z',
            })

            mockTodoistApi.moveTasks.mockResolvedValue([mockApiResponse])

            const result = await tasksUpdateOne.execute(
                { id: '8485093751', parentId: 'parent-task-123' },
                mockTodoistApi,
            )

            expect(mockTodoistApi.moveTasks).toHaveBeenCalledWith(['8485093751'], {
                parentId: 'parent-task-123',
            })
            expect(mockTodoistApi.updateTask).not.toHaveBeenCalled()

            expect(result).toEqual(mockApiResponse)
        })

        it('should move task and update properties at once', async () => {
            const movedTask = createMockTask({
                id: '8485093752',
                content: 'Task to move',
                projectId: 'different-project-id',
            })

            const updatedTask = createMockTask({
                id: '8485093752',
                content: 'Completely updated task',
                description: 'New description with details',
                priority: 4,
                projectId: 'different-project-id',
                url: 'https://todoist.com/showTask?id=8485093752',
                addedAt: '2025-08-13T22:09:56.123456Z',
                due: {
                    date: '2025-08-25',
                    isRecurring: true,
                    lang: 'en',
                    string: 'every Friday',
                    timezone: null,
                },
            })

            mockTodoistApi.moveTasks.mockResolvedValue([movedTask])
            mockTodoistApi.updateTask.mockResolvedValue(updatedTask)

            const result = await tasksUpdateOne.execute(
                {
                    id: '8485093752',
                    content: 'Completely updated task',
                    description: 'New description with details',
                    priority: 4,
                    dueString: 'every Friday',
                    projectId: 'different-project-id',
                },
                mockTodoistApi,
            )

            // Should call moveTasks first for the projectId
            expect(mockTodoistApi.moveTasks).toHaveBeenCalledWith(['8485093752'], {
                projectId: 'different-project-id',
            })

            // Then call updateTask for the other properties
            expect(mockTodoistApi.updateTask).toHaveBeenCalledWith('8485093752', {
                content: 'Completely updated task',
                description: 'New description with details',
                priority: 4,
                dueString: 'every Friday',
            })

            expect(result).toEqual(updatedTask)
        })
    })

    describe('error handling', () => {
        it('should throw error when multiple move parameters are provided', async () => {
            await expect(
                tasksUpdateOne.execute(
                    { id: '8485093748', projectId: 'new-project', sectionId: 'new-section' },
                    mockTodoistApi,
                ),
            ).rejects.toThrow(
                'Only one of projectId, sectionId, or parentId can be specified at a time. ' +
                    'The Todoist API requires exactly one destination for move operations.',
            )
        })

        it('should throw error when all three move parameters are provided', async () => {
            await expect(
                tasksUpdateOne.execute(
                    { id: '8485093748', projectId: 'p1', sectionId: 's1', parentId: 't1' },
                    mockTodoistApi,
                ),
            ).rejects.toThrow(
                'Only one of projectId, sectionId, or parentId can be specified at a time',
            )
        })

        it.each([
            {
                error: 'API Error: Task not found',
                params: { id: 'non-existent-task', content: 'Updated content' },
            },
            {
                error: 'API Error: Invalid priority value',
                params: { id: '8485093748', priority: 5 },
            },
        ])('should propagate $error', async ({ error, params }) => {
            mockTodoistApi.updateTask.mockRejectedValue(new Error(error))
            await expect(tasksUpdateOne.execute(params, mockTodoistApi)).rejects.toThrow(error)
        })
    })
})
