import type { Task, TodoistApi } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import { tasksOrganizeMultiple } from '../tasks-organize-multiple'
import { TEST_IDS, createMockTask } from '../test-helpers'

// Mock the Todoist API
const mockTodoistApi = {
    updateTask: jest.fn(),
    moveTasks: jest.fn(),
} as unknown as jest.Mocked<TodoistApi>

describe('tasks-organize-multiple tool', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('organizing multiple tasks', () => {
        it('should move multiple tasks to the same destination', async () => {
            const sectionId = '6cfPqr9xgvmgW6J0'
            const mockResponses = [
                createMockTask({ id: '6cPuJm79x4QhMwR4', content: 'First task', sectionId }),
                createMockTask({ id: '6cPHJj2MV4HMj92W', content: 'Second task', sectionId }),
            ]

            // Each task should be moved individually to avoid bulk operation issues
            mockTodoistApi.moveTasks
                .mockResolvedValueOnce([mockResponses[0] as Task])
                .mockResolvedValueOnce([mockResponses[1] as Task])

            const result = await tasksOrganizeMultiple.execute(
                {
                    tasks: [
                        { id: '6cPHJm59x4WhMwR4', sectionId },
                        { id: '6cPHJj2MV4HMj92W', sectionId },
                    ],
                },
                mockTodoistApi,
            )

            // Should call moveTasks twice, once for each task individually
            expect(mockTodoistApi.moveTasks).toHaveBeenCalledTimes(2)
            expect(mockTodoistApi.moveTasks).toHaveBeenNthCalledWith(1, ['6cPHJm59x4WhMwR4'], {
                sectionId,
            })
            expect(mockTodoistApi.moveTasks).toHaveBeenNthCalledWith(2, ['6cPHJj2MV4HMj92W'], {
                sectionId,
            })
            expect(mockTodoistApi.updateTask).not.toHaveBeenCalled()

            expect(result).toEqual(mockResponses)
        })

        it('should move multiple tasks with different destinations', async () => {
            const { TASK_1, TASK_2, TASK_3 } = TEST_IDS
            const mockResponses = [
                createMockTask({ id: TASK_1, content: 'Task 1', projectId: 'new-project-id' }),
                createMockTask({ id: TASK_2, content: 'Task 2', sectionId: 'new-section-id' }),
                createMockTask({ id: TASK_3, content: 'Task 3', parentId: 'parent-task-123' }),
            ]

            // Each task should be moved individually
            mockTodoistApi.moveTasks
                .mockResolvedValueOnce([mockResponses[0] as Task])
                .mockResolvedValueOnce([mockResponses[1] as Task])
                .mockResolvedValueOnce([mockResponses[2] as Task])

            const result = await tasksOrganizeMultiple.execute(
                {
                    tasks: [
                        { id: '8485093748', projectId: 'new-project-id' },
                        { id: '8485093749', sectionId: 'new-section-id' },
                        { id: '8485093750', parentId: 'parent-task-123' },
                    ],
                },
                mockTodoistApi,
            )

            // Verify API was called correctly - 3 individual move calls
            expect(mockTodoistApi.moveTasks).toHaveBeenCalledTimes(3)
            expect(mockTodoistApi.moveTasks).toHaveBeenNthCalledWith(1, ['8485093748'], {
                projectId: 'new-project-id',
            })
            expect(mockTodoistApi.moveTasks).toHaveBeenNthCalledWith(2, ['8485093749'], {
                sectionId: 'new-section-id',
            })
            expect(mockTodoistApi.moveTasks).toHaveBeenNthCalledWith(3, ['8485093750'], {
                parentId: 'parent-task-123',
            })
            expect(mockTodoistApi.updateTask).not.toHaveBeenCalled()

            // Verify results are returned in the correct order
            expect(result).toEqual(mockResponses)
        })

        it('should handle single task organization', async () => {
            const mockTaskResponse: Task = createMockTask({
                id: '8485093751',
                content: 'Single task update',
                sectionId: 'target-section',
                url: 'https://todoist.com/showTask?id=8485093751',
                addedAt: '2025-08-13T22:09:59.123456Z',
            })

            mockTodoistApi.moveTasks.mockResolvedValue([mockTaskResponse])

            const result = await tasksOrganizeMultiple.execute(
                { tasks: [{ id: '8485093751', sectionId: 'target-section' }] },
                mockTodoistApi,
            )

            expect(mockTodoistApi.moveTasks).toHaveBeenCalledTimes(1)
            expect(mockTodoistApi.moveTasks).toHaveBeenCalledWith(['8485093751'], {
                sectionId: 'target-section',
            })
            expect(mockTodoistApi.updateTask).not.toHaveBeenCalled()

            expect(result).toEqual([mockTaskResponse])
        })

        it('should handle complex reorganization scenario', async () => {
            // Simulate moving tasks to different destinations (one move param per task)
            const mockResponses: Task[] = [
                createMockTask({
                    id: 'task-1',
                    content: 'Task moved to new project',
                    projectId: 'project-new',
                    url: 'https://todoist.com/showTask?id=task-1',
                    addedAt: '2025-08-13T22:10:00.123456Z',
                }),
                createMockTask({
                    id: 'task-2',
                    content: 'Task made into subtask',
                    parentId: 'task-1',
                    url: 'https://todoist.com/showTask?id=task-2',
                    addedAt: '2025-08-13T22:10:01.123456Z',
                }),
                createMockTask({
                    id: 'task-3',
                    content: 'Task moved to section',
                    sectionId: 'section-new',
                    url: 'https://todoist.com/showTask?id=task-3',
                    addedAt: '2025-08-13T22:10:02.123456Z',
                }),
            ]

            // Each task should be moved individually
            mockTodoistApi.moveTasks
                .mockResolvedValueOnce([mockResponses[0] as Task])
                .mockResolvedValueOnce([mockResponses[1] as Task])
                .mockResolvedValueOnce([mockResponses[2] as Task])

            const result = await tasksOrganizeMultiple.execute(
                {
                    tasks: [
                        { id: 'task-1', projectId: 'project-new' },
                        { id: 'task-2', parentId: 'task-1' },
                        { id: 'task-3', sectionId: 'section-new' },
                    ],
                },
                mockTodoistApi,
            )

            // Verify API was called correctly - 3 individual move calls
            expect(mockTodoistApi.moveTasks).toHaveBeenCalledTimes(3)
            expect(mockTodoistApi.moveTasks).toHaveBeenNthCalledWith(1, ['task-1'], {
                projectId: 'project-new',
            })
            expect(mockTodoistApi.moveTasks).toHaveBeenNthCalledWith(2, ['task-2'], {
                parentId: 'task-1',
            })
            expect(mockTodoistApi.moveTasks).toHaveBeenNthCalledWith(3, ['task-3'], {
                sectionId: 'section-new',
            })
            expect(mockTodoistApi.updateTask).not.toHaveBeenCalled()

            expect(result).toEqual(mockResponses)
        })
    })

    describe('order management', () => {
        it('should skip tasks with only order changes (no move operations)', async () => {
            const result = await tasksOrganizeMultiple.execute(
                {
                    tasks: [
                        { id: 'task-a', order: 3 }, // Only order, no move params
                        { id: 'task-b', order: 1 }, // Only order, no move params
                        { id: 'task-c', order: 2 }, // Only order, no move params
                    ],
                },
                mockTodoistApi,
            )

            // No API calls should be made since only order is specified (no projectId/sectionId/parentId)
            expect(mockTodoistApi.moveTasks).not.toHaveBeenCalled()
            expect(mockTodoistApi.updateTask).not.toHaveBeenCalled()

            // Returns empty array since no moves were processed
            expect(result).toEqual([])
        })
    })

    describe('partial updates', () => {
        it('should handle move operations with single parameters', async () => {
            const mockResponse: Task = createMockTask({
                id: '8485093752',
                content: 'Minimal update task',
                projectId: 'new-project-only',
                url: 'https://todoist.com/showTask?id=8485093752',
                addedAt: '2025-08-13T22:10:07.123456Z',
            })

            mockTodoistApi.moveTasks.mockResolvedValue([mockResponse])

            const result = await tasksOrganizeMultiple.execute(
                {
                    tasks: [
                        {
                            id: '8485093752',
                            projectId: 'new-project-only',
                            // Only updating projectId (move operation)
                        },
                    ],
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.moveTasks).toHaveBeenCalledWith(['8485093752'], {
                projectId: 'new-project-only',
            })
            expect(mockTodoistApi.updateTask).not.toHaveBeenCalled()
            expect(result).toEqual([mockResponse])
        })

        it('should handle empty updates (only id provided)', async () => {
            const result = await tasksOrganizeMultiple.execute(
                { tasks: [{ id: '8485093753' }] },
                mockTodoistApi,
            )

            // No API calls should be made since no move parameters are provided
            expect(mockTodoistApi.moveTasks).not.toHaveBeenCalled()
            expect(mockTodoistApi.updateTask).not.toHaveBeenCalled()

            // Returns empty array since no moves were processed
            expect(result).toEqual([])
        })
    })

    describe('error handling', () => {
        it('should throw error when task has multiple move parameters', async () => {
            await expect(
                tasksOrganizeMultiple.execute(
                    {
                        tasks: [
                            { id: 'task-1', projectId: 'new-project', sectionId: 'new-section' },
                        ],
                    },
                    mockTodoistApi,
                ),
            ).rejects.toThrow(
                'Task task-1: Only one of projectId, sectionId, or parentId can be specified at a time',
            )
        })

        it('should propagate API errors for individual task moves', async () => {
            const apiError = new Error('API Error: Task not found')
            mockTodoistApi.moveTasks.mockRejectedValue(apiError)

            await expect(
                tasksOrganizeMultiple.execute(
                    { tasks: [{ id: 'non-existent-task', projectId: 'some-project' }] },
                    mockTodoistApi,
                ),
            ).rejects.toThrow('API Error: Task not found')
        })

        it('should fail fast on first error (not continue with remaining tasks)', async () => {
            const apiError = new Error('API Error: Invalid project ID')
            mockTodoistApi.moveTasks.mockRejectedValue(apiError)

            await expect(
                tasksOrganizeMultiple.execute(
                    {
                        tasks: [
                            { id: 'task-1', projectId: 'invalid-project' },
                            { id: 'task-2', projectId: 'valid-project' },
                        ],
                    },
                    mockTodoistApi,
                ),
            ).rejects.toThrow('API Error: Invalid project ID')

            // Should only attempt the first move
            expect(mockTodoistApi.moveTasks).toHaveBeenCalledTimes(1)
            expect(mockTodoistApi.moveTasks).toHaveBeenCalledWith(['task-1'], {
                projectId: 'invalid-project',
            })
        })

        it('should handle validation errors', async () => {
            const validationError = new Error('API Error: Invalid section ID')
            mockTodoistApi.moveTasks.mockRejectedValue(validationError)

            await expect(
                tasksOrganizeMultiple.execute(
                    { tasks: [{ id: 'task-1', sectionId: 'invalid-section-format' }] },
                    mockTodoistApi,
                ),
            ).rejects.toThrow('API Error: Invalid section ID')
        })

        it('should handle permission errors', async () => {
            const permissionError = new Error('API Error: Insufficient permissions to move task')
            mockTodoistApi.moveTasks.mockRejectedValue(permissionError)

            await expect(
                tasksOrganizeMultiple.execute(
                    { tasks: [{ id: 'restricted-task', projectId: 'restricted-project' }] },
                    mockTodoistApi,
                ),
            ).rejects.toThrow('API Error: Insufficient permissions to move task')
        })

        it('should handle circular parent dependency errors', async () => {
            const circularError = new Error('API Error: Circular dependency detected')
            mockTodoistApi.moveTasks.mockRejectedValue(circularError)

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
