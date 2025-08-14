import type { Task, TodoistApi } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import { tasksOrganizeMultiple } from '../tasks-organize-multiple'
import { TEST_IDS, createMockTask } from '../test-helpers'

// Mock the Todoist API
const mockTodoistApi = {
    updateTask: jest.fn(),
} as unknown as jest.Mocked<TodoistApi>

describe('tasks-organize-multiple tool', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('organizing multiple tasks', () => {
        it('should update multiple tasks with different properties', async () => {
            const mockResponses = [
                createMockTask({
                    id: TEST_IDS.TASK_1,
                    content: 'Task moved to new project',
                    projectId: 'new-project-id',
                }),
                createMockTask({
                    id: TEST_IDS.TASK_2,
                    content: 'Task moved to section',
                    sectionId: 'new-section-id',
                }),
                createMockTask({
                    id: TEST_IDS.TASK_3,
                    content: 'Task became subtask',
                    parentId: 'parent-task-123',
                }),
            ]

            mockTodoistApi.updateTask
                .mockResolvedValueOnce(mockResponses[0] as Task)
                .mockResolvedValueOnce(mockResponses[1] as Task)
                .mockResolvedValueOnce(mockResponses[2] as Task)

            const result = await tasksOrganizeMultiple.execute(
                {
                    tasks: [
                        { id: '8485093748', projectId: 'new-project-id' },
                        { id: '8485093749', sectionId: 'new-section-id', order: 2 },
                        { id: '8485093750', parentId: 'parent-task-123' },
                    ],
                },
                mockTodoistApi,
            )

            // Verify API was called correctly for each task
            expect(mockTodoistApi.updateTask).toHaveBeenCalledTimes(3)
            expect(mockTodoistApi.updateTask).toHaveBeenNthCalledWith(1, '8485093748', {
                projectId: 'new-project-id',
            })
            expect(mockTodoistApi.updateTask).toHaveBeenNthCalledWith(2, '8485093749', {
                sectionId: 'new-section-id',
                order: 2,
            })
            expect(mockTodoistApi.updateTask).toHaveBeenNthCalledWith(3, '8485093750', {
                parentId: 'parent-task-123',
            })

            // Verify results are returned in order
            expect(result).toEqual(mockResponses)
        })

        it('should handle single task organization', async () => {
            const mockTaskResponse: Task = createMockTask({
                id: '8485093751',
                content: 'Single task update',
                childOrder: 5,
                sectionId: 'target-section',
                url: 'https://todoist.com/showTask?id=8485093751',
                addedAt: '2025-08-13T22:09:59.123456Z',
            })

            mockTodoistApi.updateTask.mockResolvedValue(mockTaskResponse)

            const result = await tasksOrganizeMultiple.execute(
                {
                    tasks: [
                        {
                            id: '8485093751',
                            sectionId: 'target-section',
                            order: 5,
                        },
                    ],
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.updateTask).toHaveBeenCalledTimes(1)
            expect(mockTodoistApi.updateTask).toHaveBeenCalledWith('8485093751', {
                sectionId: 'target-section',
                order: 5,
            })

            expect(result).toEqual([mockTaskResponse])
        })

        it('should handle complex reorganization scenario', async () => {
            // Simulate moving tasks between projects, sections, and creating subtask hierarchy
            const mockResponses: Task[] = [
                createMockTask({
                    id: 'task-1',
                    content: 'Main task moved to new project',
                    childOrder: 1,
                    projectId: 'project-new',
                    sectionId: 'section-new',
                    url: 'https://todoist.com/showTask?id=task-1',
                    addedAt: '2025-08-13T22:10:00.123456Z',
                }),
                createMockTask({
                    id: 'task-2',
                    content: 'Subtask of task-1',
                    childOrder: 1,
                    projectId: 'project-new',
                    parentId: 'task-1',
                    url: 'https://todoist.com/showTask?id=task-2',
                    addedAt: '2025-08-13T22:10:01.123456Z',
                }),
                createMockTask({
                    id: 'task-3',
                    content: 'Another subtask of task-1',
                    childOrder: 2,
                    projectId: 'project-new',
                    parentId: 'task-1',
                    url: 'https://todoist.com/showTask?id=task-3',
                    addedAt: '2025-08-13T22:10:02.123456Z',
                }),
                createMockTask({
                    id: 'task-4',
                    content: 'Reordered standalone task',
                    childOrder: 10,
                    projectId: 'original-project',
                    sectionId: 'original-section',
                    url: 'https://todoist.com/showTask?id=task-4',
                    addedAt: '2025-08-13T22:10:03.123456Z',
                }),
            ]

            mockTodoistApi.updateTask
                .mockResolvedValueOnce(mockResponses[0] as Task)
                .mockResolvedValueOnce(mockResponses[1] as Task)
                .mockResolvedValueOnce(mockResponses[2] as Task)
                .mockResolvedValueOnce(mockResponses[3] as Task)

            const result = await tasksOrganizeMultiple.execute(
                {
                    tasks: [
                        {
                            id: 'task-1',
                            projectId: 'project-new',
                            sectionId: 'section-new',
                            order: 1,
                        },
                        {
                            id: 'task-2',
                            projectId: 'project-new',
                            parentId: 'task-1',
                            order: 1,
                        },
                        {
                            id: 'task-3',
                            projectId: 'project-new',
                            parentId: 'task-1',
                            order: 2,
                        },
                        {
                            id: 'task-4',
                            order: 10,
                        },
                    ],
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.updateTask).toHaveBeenCalledTimes(4)

            // Verify each update was called with correct parameters
            expect(mockTodoistApi.updateTask).toHaveBeenNthCalledWith(1, 'task-1', {
                projectId: 'project-new',
                sectionId: 'section-new',
                order: 1,
            })
            expect(mockTodoistApi.updateTask).toHaveBeenNthCalledWith(2, 'task-2', {
                projectId: 'project-new',
                parentId: 'task-1',
                order: 1,
            })
            expect(mockTodoistApi.updateTask).toHaveBeenNthCalledWith(3, 'task-3', {
                projectId: 'project-new',
                parentId: 'task-1',
                order: 2,
            })
            expect(mockTodoistApi.updateTask).toHaveBeenNthCalledWith(4, 'task-4', {
                order: 10,
            })

            expect(result).toEqual(mockResponses)
        })
    })

    describe('order management', () => {
        it('should handle reordering tasks within same container', async () => {
            const mockResponses: Task[] = [
                createMockTask({
                    id: 'task-a',
                    content: 'Task A (order 3)',
                    childOrder: 3,
                    sectionId: 'section-123',
                    url: 'https://todoist.com/showTask?id=task-a',
                    addedAt: '2025-08-13T22:10:04.123456Z',
                }),
                createMockTask({
                    id: 'task-b',
                    content: 'Task B (order 1)',
                    childOrder: 1,
                    sectionId: 'section-123',
                    url: 'https://todoist.com/showTask?id=task-b',
                    addedAt: '2025-08-13T22:10:05.123456Z',
                }),
                createMockTask({
                    id: 'task-c',
                    content: 'Task C (order 2)',
                    childOrder: 2,
                    sectionId: 'section-123',
                    url: 'https://todoist.com/showTask?id=task-c',
                    addedAt: '2025-08-13T22:10:06.123456Z',
                }),
            ]

            mockTodoistApi.updateTask
                .mockResolvedValueOnce(mockResponses[0] as Task)
                .mockResolvedValueOnce(mockResponses[1] as Task)
                .mockResolvedValueOnce(mockResponses[2] as Task)

            const result = await tasksOrganizeMultiple.execute(
                {
                    tasks: [
                        { id: 'task-a', order: 3 }, // Move to end
                        { id: 'task-b', order: 1 }, // Move to beginning
                        { id: 'task-c', order: 2 }, // Stay in middle
                    ],
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.updateTask).toHaveBeenCalledTimes(3)
            expect(result).toEqual(mockResponses)
        })
    })

    describe('partial updates', () => {
        it('should handle updates with only some properties', async () => {
            const mockResponse: Task = createMockTask({
                id: '8485093752',
                content: 'Minimal update task',
                projectId: 'new-project-only',
                url: 'https://todoist.com/showTask?id=8485093752',
                addedAt: '2025-08-13T22:10:07.123456Z',
            })

            mockTodoistApi.updateTask.mockResolvedValue(mockResponse)

            await tasksOrganizeMultiple.execute(
                {
                    tasks: [
                        {
                            id: '8485093752',
                            projectId: 'new-project-only',
                            // Only updating projectId, leaving other properties unchanged
                        },
                    ],
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.updateTask).toHaveBeenCalledWith('8485093752', {
                projectId: 'new-project-only',
            })
        })

        it('should handle empty updates (only id provided)', async () => {
            const mockResponse: Task = createMockTask({
                id: '8485093753',
                content: 'No change task',
                projectId: 'unchanged-project',
                url: 'https://todoist.com/showTask?id=8485093753',
                addedAt: '2025-08-13T22:10:08.123456Z',
            })

            mockTodoistApi.updateTask.mockResolvedValue(mockResponse)

            await tasksOrganizeMultiple.execute(
                {
                    tasks: [
                        {
                            id: '8485093753',
                            // No other properties - essentially a no-op update
                        },
                    ],
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.updateTask).toHaveBeenCalledWith('8485093753', {})
        })
    })

    describe('error handling', () => {
        it('should propagate API errors for individual task updates', async () => {
            const apiError = new Error('API Error: Task not found')
            mockTodoistApi.updateTask.mockRejectedValue(apiError)

            await expect(
                tasksOrganizeMultiple.execute(
                    {
                        tasks: [
                            {
                                id: 'non-existent-task',
                                projectId: 'some-project',
                            },
                        ],
                    },
                    mockTodoistApi,
                ),
            ).rejects.toThrow('API Error: Task not found')
        })

        it('should fail fast on first error (not continue with remaining tasks)', async () => {
            const apiError = new Error('API Error: Invalid project ID')
            mockTodoistApi.updateTask.mockRejectedValue(apiError)

            await expect(
                tasksOrganizeMultiple.execute(
                    {
                        tasks: [
                            { id: 'task-1', projectId: 'invalid-project' },
                            { id: 'task-2', projectId: 'valid-project' },
                            { id: 'task-3', order: 5 },
                        ],
                    },
                    mockTodoistApi,
                ),
            ).rejects.toThrow('API Error: Invalid project ID')

            // Should only attempt the first update
            expect(mockTodoistApi.updateTask).toHaveBeenCalledTimes(1)
            expect(mockTodoistApi.updateTask).toHaveBeenCalledWith('task-1', {
                projectId: 'invalid-project',
            })
        })

        it('should handle validation errors', async () => {
            const validationError = new Error('API Error: Invalid section ID')
            mockTodoistApi.updateTask.mockRejectedValue(validationError)

            await expect(
                tasksOrganizeMultiple.execute(
                    {
                        tasks: [
                            {
                                id: 'task-1',
                                sectionId: 'invalid-section-format',
                            },
                        ],
                    },
                    mockTodoistApi,
                ),
            ).rejects.toThrow('API Error: Invalid section ID')
        })

        it('should handle permission errors', async () => {
            const permissionError = new Error('API Error: Insufficient permissions to move task')
            mockTodoistApi.updateTask.mockRejectedValue(permissionError)

            await expect(
                tasksOrganizeMultiple.execute(
                    {
                        tasks: [
                            {
                                id: 'restricted-task',
                                projectId: 'restricted-project',
                            },
                        ],
                    },
                    mockTodoistApi,
                ),
            ).rejects.toThrow('API Error: Insufficient permissions to move task')
        })

        it('should handle circular parent dependency errors', async () => {
            const circularError = new Error('API Error: Circular dependency detected')
            mockTodoistApi.updateTask.mockRejectedValue(circularError)

            await expect(
                tasksOrganizeMultiple.execute(
                    {
                        tasks: [
                            {
                                id: 'task-parent',
                                parentId: 'task-child', // This would create a circular dependency
                            },
                        ],
                    },
                    mockTodoistApi,
                ),
            ).rejects.toThrow('API Error: Circular dependency detected')
        })
    })
})
