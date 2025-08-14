import type { TodoistApi } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import { tasksCompleteMultiple } from '../tasks-complete-multiple.js'

// Mock the Todoist API
const mockTodoistApi = {
    closeTask: jest.fn(),
} as unknown as jest.Mocked<TodoistApi>

describe('tasks-complete-multiple tool', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('completing multiple tasks', () => {
        it('should complete all tasks successfully', async () => {
            mockTodoistApi.closeTask.mockResolvedValue(true)

            const result = await tasksCompleteMultiple.execute(
                { ids: ['task-1', 'task-2', 'task-3'] },
                mockTodoistApi,
            )

            // Verify API was called for each task
            expect(mockTodoistApi.closeTask).toHaveBeenCalledTimes(3)
            expect(mockTodoistApi.closeTask).toHaveBeenNthCalledWith(1, 'task-1')
            expect(mockTodoistApi.closeTask).toHaveBeenNthCalledWith(2, 'task-2')
            expect(mockTodoistApi.closeTask).toHaveBeenNthCalledWith(3, 'task-3')

            // Verify all tasks were completed successfully
            expect(result).toEqual({
                success: true,
                completed: ['task-1', 'task-2', 'task-3'],
            })
        })

        it('should complete single task', async () => {
            mockTodoistApi.closeTask.mockResolvedValue(true)

            const result = await tasksCompleteMultiple.execute(
                { ids: ['8485093748'] },
                mockTodoistApi,
            )

            expect(mockTodoistApi.closeTask).toHaveBeenCalledTimes(1)
            expect(mockTodoistApi.closeTask).toHaveBeenCalledWith('8485093748')

            expect(result).toEqual({
                success: true,
                completed: ['8485093748'],
            })
        })

        it('should handle partial failures gracefully', async () => {
            // Mock first and third tasks to succeed, second to fail
            mockTodoistApi.closeTask
                .mockResolvedValueOnce(true) // task-1 succeeds
                .mockRejectedValueOnce(new Error('Task not found')) // task-2 fails
                .mockResolvedValueOnce(true) // task-3 succeeds

            const result = await tasksCompleteMultiple.execute(
                { ids: ['task-1', 'task-2', 'task-3'] },
                mockTodoistApi,
            )

            // Verify API was called for all tasks despite failure
            expect(mockTodoistApi.closeTask).toHaveBeenCalledTimes(3)
            expect(mockTodoistApi.closeTask).toHaveBeenNthCalledWith(1, 'task-1')
            expect(mockTodoistApi.closeTask).toHaveBeenNthCalledWith(2, 'task-2')
            expect(mockTodoistApi.closeTask).toHaveBeenNthCalledWith(3, 'task-3')

            // Verify only successful completions are reported
            expect(result).toEqual({
                success: true,
                completed: ['task-1', 'task-3'], // task-2 excluded due to failure
            })
        })

        it('should handle all tasks failing', async () => {
            const apiError = new Error('API Error: Network timeout')
            mockTodoistApi.closeTask.mockRejectedValue(apiError)

            const result = await tasksCompleteMultiple.execute(
                { ids: ['task-1', 'task-2'] },
                mockTodoistApi,
            )

            // Verify API was attempted for all tasks
            expect(mockTodoistApi.closeTask).toHaveBeenCalledTimes(2)

            // Verify no tasks were completed but still returns success
            expect(result).toEqual({
                success: true,
                completed: [], // no tasks completed
            })
        })

        it('should continue processing remaining tasks after failures', async () => {
            // Mock various failure scenarios
            mockTodoistApi.closeTask
                .mockRejectedValueOnce(new Error('Task already completed'))
                .mockRejectedValueOnce(new Error('Task not found'))
                .mockResolvedValueOnce(true) // task-3 succeeds
                .mockRejectedValueOnce(new Error('Permission denied'))
                .mockResolvedValueOnce(true) // task-5 succeeds

            const result = await tasksCompleteMultiple.execute(
                { ids: ['task-1', 'task-2', 'task-3', 'task-4', 'task-5'] },
                mockTodoistApi,
            )

            expect(mockTodoistApi.closeTask).toHaveBeenCalledTimes(5)

            // Only tasks 3 and 5 should be in completed list
            expect(result).toEqual({
                success: true,
                completed: ['task-3', 'task-5'],
            })
        })

        it('should handle different types of API errors', async () => {
            mockTodoistApi.closeTask
                .mockRejectedValueOnce(new Error('Task not found'))
                .mockRejectedValueOnce(new Error('Task already completed'))
                .mockRejectedValueOnce(new Error('Permission denied'))
                .mockRejectedValueOnce(new Error('Rate limit exceeded'))

            const result = await tasksCompleteMultiple.execute(
                { ids: ['not-found', 'already-done', 'no-permission', 'rate-limited'] },
                mockTodoistApi,
            )

            expect(mockTodoistApi.closeTask).toHaveBeenCalledTimes(4)

            // All should fail, but the tool should handle it gracefully
            expect(result).toEqual({
                success: true,
                completed: [],
            })
        })
    })

    describe('mixed success and failure scenarios', () => {
        it('should handle realistic mixed scenario', async () => {
            // Simulate a realistic scenario with some tasks completing and others failing
            mockTodoistApi.closeTask
                .mockResolvedValueOnce(true) // regular task completion
                .mockResolvedValueOnce(true) // another successful completion
                .mockRejectedValueOnce(new Error('Task already completed')) // duplicate completion
                .mockResolvedValueOnce(true) // successful completion
                .mockRejectedValueOnce(new Error('Task not found')) // deleted task

            const result = await tasksCompleteMultiple.execute(
                {
                    ids: [
                        '8485093748', // regular task
                        '8485093749', // regular task
                        '8485093750', // already completed
                        '8485093751', // regular task
                        '8485093752', // deleted task
                    ],
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.closeTask).toHaveBeenCalledTimes(5)

            expect(result).toEqual({
                success: true,
                completed: ['8485093748', '8485093749', '8485093751'],
            })
        })
    })

    describe('edge cases', () => {
        it('should handle empty task completion (minimum one task required by schema)', async () => {
            // Note: This test documents that the schema requires at least one task,
            // so this scenario shouldn't occur in practice due to validation
            mockTodoistApi.closeTask.mockResolvedValue(true)

            const result = await tasksCompleteMultiple.execute(
                { ids: ['single-task'] },
                mockTodoistApi,
            )

            expect(result).toEqual({
                success: true,
                completed: ['single-task'],
            })
        })

        it('should handle tasks with special ID formats', async () => {
            mockTodoistApi.closeTask.mockResolvedValue(true)

            const result = await tasksCompleteMultiple.execute(
                { ids: ['proj_123_task_456', 'task-with-dashes', '1234567890'] },
                mockTodoistApi,
            )

            expect(mockTodoistApi.closeTask).toHaveBeenCalledTimes(3)
            expect(mockTodoistApi.closeTask).toHaveBeenCalledWith('proj_123_task_456')
            expect(mockTodoistApi.closeTask).toHaveBeenCalledWith('task-with-dashes')
            expect(mockTodoistApi.closeTask).toHaveBeenCalledWith('1234567890')

            expect(result).toEqual({
                success: true,
                completed: ['proj_123_task_456', 'task-with-dashes', '1234567890'],
            })
        })
    })
})
