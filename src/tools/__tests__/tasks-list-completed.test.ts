import type { Task, TodoistApi } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import { tasksListCompleted } from '../tasks-list-completed.js'
import { createMockTask } from '../test-helpers.js'

// Mock the Todoist API
const mockTodoistApi = {
    getCompletedTasksByCompletionDate: jest.fn(),
    getCompletedTasksByDueDate: jest.fn(),
} as unknown as jest.Mocked<TodoistApi>

describe('tasks-list-completed tool', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('getting completed tasks by completion date (default)', () => {
        it('should get completed tasks by completion date', async () => {
            const mockCompletedTasks: Task[] = [
                createMockTask({
                    id: '8485093748',
                    content: 'Completed task 1',
                    description: 'Task completed yesterday',
                    completedAt: '2024-01-01T00:00:00Z',
                    labels: ['work'],
                    priority: 2,
                    url: 'https://todoist.com/showTask?id=8485093748',
                    addedAt: '2025-08-13T22:09:56.123456Z',
                    due: {
                        date: '2025-08-14',
                        isRecurring: false,
                        lang: 'en',
                        string: 'Aug 14',
                        timezone: null,
                    },
                }),
            ]

            mockTodoistApi.getCompletedTasksByCompletionDate.mockResolvedValue({
                items: mockCompletedTasks,
                nextCursor: null,
            })

            const result = await tasksListCompleted.execute(
                { getBy: 'completion', limit: 50, since: '2025-08-10', until: '2025-08-15' },
                mockTodoistApi,
            )

            expect(mockTodoistApi.getCompletedTasksByCompletionDate).toHaveBeenCalledWith({
                since: '2025-08-10',
                until: '2025-08-15',
                limit: 50,
            })

            expect(result).toEqual({
                tasks: [
                    expect.objectContaining({
                        id: '8485093748',
                        content: 'Completed task 1',
                        description: 'Task completed yesterday',
                        dueDate: '2025-08-14',
                        priority: 2,
                        labels: ['work'],
                    }),
                ],
                nextCursor: null,
            })
        })

        it('should handle explicit completion date query', async () => {
            mockTodoistApi.getCompletedTasksByCompletionDate.mockResolvedValue({
                items: [],
                nextCursor: 'next-cursor',
            })

            const result = await tasksListCompleted.execute(
                {
                    getBy: 'completion',
                    limit: 100,
                    since: '2025-08-01',
                    until: '2025-08-31',
                    projectId: 'specific-project-id',
                    cursor: 'current-cursor',
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.getCompletedTasksByCompletionDate).toHaveBeenCalledWith({
                since: '2025-08-01',
                until: '2025-08-31',
                projectId: 'specific-project-id',
                limit: 100,
                cursor: 'current-cursor',
            })

            expect(result).toEqual({ tasks: [], nextCursor: 'next-cursor' })
        })
    })

    describe('getting completed tasks by due date', () => {
        it('should get completed tasks by due date', async () => {
            const mockCompletedTasks: Task[] = [
                createMockTask({
                    id: '8485093750',
                    content: 'Task completed by due date',
                    description: 'This task was due and completed',
                    completedAt: '2024-01-01T00:00:00Z',
                    labels: ['urgent'],
                    priority: 3,
                    url: 'https://todoist.com/showTask?id=8485093750',
                    addedAt: '2025-08-13T22:09:58.123456Z',
                    due: {
                        date: '2025-08-15',
                        isRecurring: true,
                        lang: 'en',
                        string: 'every Monday',
                        timezone: null,
                    },
                }),
            ]

            mockTodoistApi.getCompletedTasksByDueDate.mockResolvedValue({
                items: mockCompletedTasks,
                nextCursor: null,
            })

            const result = await tasksListCompleted.execute(
                {
                    getBy: 'due',
                    limit: 50,
                    since: '2025-08-10',
                    until: '2025-08-20',
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.getCompletedTasksByDueDate).toHaveBeenCalledWith({
                since: '2025-08-10',
                until: '2025-08-20',
                limit: 50,
            })
            expect(mockTodoistApi.getCompletedTasksByCompletionDate).not.toHaveBeenCalled()

            expect(result).toEqual({
                tasks: [
                    expect.objectContaining({
                        id: '8485093750',
                        content: 'Task completed by due date',
                        description: 'This task was due and completed',
                        dueDate: '2025-08-15',
                        recurring: 'every Monday',
                        priority: 3,
                        labels: ['urgent'],
                    }),
                ],
                nextCursor: null,
            })
        })
    })

    describe('error handling', () => {
        it('should propagate completion date API errors', async () => {
            const apiError = new Error('API Error: Invalid date range')
            mockTodoistApi.getCompletedTasksByCompletionDate.mockRejectedValue(apiError)

            await expect(
                tasksListCompleted.execute(
                    // invalid date range
                    { getBy: 'completion', limit: 50, since: '2025-08-31', until: '2025-08-01' },
                    mockTodoistApi,
                ),
            ).rejects.toThrow('API Error: Invalid date range')
        })

        it('should propagate due date API errors', async () => {
            const apiError = new Error('API Error: Project not found')
            mockTodoistApi.getCompletedTasksByDueDate.mockRejectedValue(apiError)

            await expect(
                tasksListCompleted.execute(
                    {
                        getBy: 'due',
                        limit: 50,
                        since: '2025-08-01',
                        until: '2025-08-31',
                        projectId: 'non-existent-project',
                    },
                    mockTodoistApi,
                ),
            ).rejects.toThrow('API Error: Project not found')
        })
    })
})
