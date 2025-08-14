import type { Task, TodoistApi } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import { tasksUpdateOne } from '../tasks-update-one'
import { createMockTask } from '../test-helpers'

// Mock the Todoist API
const mockTodoistApi = {
    updateTask: jest.fn(),
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
                {
                    id: '8485093749',
                    priority: 3,
                    dueString: 'Aug 20',
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.updateTask).toHaveBeenCalledWith('8485093749', {
                priority: 3,
                dueString: 'Aug 20',
            })

            expect(result).toEqual(mockApiResponse)
        })

        it('should move task to different project and section', async () => {
            const mockApiResponse: Task = createMockTask({
                id: '8485093750',
                content: 'Task to move',
                projectId: 'new-project-id',
                sectionId: 'new-section-id',
                url: 'https://todoist.com/showTask?id=8485093750',
                addedAt: '2025-08-13T22:09:56.123456Z',
            })

            mockTodoistApi.updateTask.mockResolvedValue(mockApiResponse)

            const result = await tasksUpdateOne.execute(
                {
                    id: '8485093750',
                    projectId: 'new-project-id',
                    sectionId: 'new-section-id',
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.updateTask).toHaveBeenCalledWith('8485093750', {
                projectId: 'new-project-id',
                sectionId: 'new-section-id',
            })

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

            mockTodoistApi.updateTask.mockResolvedValue(mockApiResponse)

            const result = await tasksUpdateOne.execute(
                {
                    id: '8485093751',
                    parentId: 'parent-task-123',
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.updateTask).toHaveBeenCalledWith('8485093751', {
                parentId: 'parent-task-123',
            })

            expect(result).toEqual(mockApiResponse)
        })

        it('should update multiple properties at once', async () => {
            const mockApiResponse: Task = createMockTask({
                id: '8485093752',
                content: 'Completely updated task',
                description: 'New description with details',
                labels: ['work', 'priority'],
                priority: 4,
                projectId: 'different-project-id',
                sectionId: 'different-section-id',
                parentId: 'parent-task-456',
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

            mockTodoistApi.updateTask.mockResolvedValue(mockApiResponse)

            const result = await tasksUpdateOne.execute(
                {
                    id: '8485093752',
                    content: 'Completely updated task',
                    description: 'New description with details',
                    priority: 4,
                    dueString: 'every Friday',
                    projectId: 'different-project-id',
                    sectionId: 'different-section-id',
                    parentId: 'parent-task-456',
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.updateTask).toHaveBeenCalledWith('8485093752', {
                content: 'Completely updated task',
                description: 'New description with details',
                priority: 4,
                dueString: 'every Friday',
                projectId: 'different-project-id',
                sectionId: 'different-section-id',
                parentId: 'parent-task-456',
            })

            expect(result).toEqual(mockApiResponse)
        })
    })

    describe('error handling', () => {
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
