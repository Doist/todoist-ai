import type { Task, TodoistApi } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import { tasksAddMultiple } from '../tasks-add-multiple.js'
import { createMockTask } from '../test-helpers.js'

// Mock the Todoist API
const mockTodoistApi = {
    addTask: jest.fn(),
} as unknown as jest.Mocked<TodoistApi>

describe('tasks-add-multiple tool', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('adding multiple tasks', () => {
        it('should add multiple tasks and return mapped results', async () => {
            // Mock API responses extracted from recordings (Task type)
            const mockApiResponse1: Task = createMockTask({
                id: '8485093748',
                content: 'First task content',
                url: 'https://todoist.com/showTask?id=8485093748',
                addedAt: '2025-08-13T22:09:56.123456Z',
            })

            const mockApiResponse2: Task = createMockTask({
                id: '8485093749',
                content: 'Second task content',
                description: 'Task description',
                labels: ['work', 'urgent'],
                childOrder: 2,
                priority: 2,
                url: 'https://todoist.com/showTask?id=8485093749',
                addedAt: '2025-08-13T22:09:57.123456Z',
                due: {
                    date: '2025-08-15',
                    isRecurring: false,
                    lang: 'en',
                    string: 'Aug 15',
                    timezone: null,
                },
            })

            mockTodoistApi.addTask
                .mockResolvedValueOnce(mockApiResponse1)
                .mockResolvedValueOnce(mockApiResponse2)

            const result = await tasksAddMultiple.execute(
                {
                    projectId: '6cfCcrrCFg2xP94Q',
                    tasks: [
                        { content: 'First task content' },
                        {
                            content: 'Second task content',
                            description: 'Task description',
                            priority: 2,
                            dueString: 'Aug 15',
                        },
                    ],
                },
                mockTodoistApi,
            )

            // Verify API was called correctly for each task
            expect(mockTodoistApi.addTask).toHaveBeenCalledTimes(2)
            expect(mockTodoistApi.addTask).toHaveBeenNthCalledWith(1, {
                content: 'First task content',
                projectId: '6cfCcrrCFg2xP94Q',
                sectionId: undefined,
                parentId: undefined,
            })
            expect(mockTodoistApi.addTask).toHaveBeenNthCalledWith(2, {
                content: 'Second task content',
                description: 'Task description',
                priority: 2,
                dueString: 'Aug 15',
                projectId: '6cfCcrrCFg2xP94Q',
                sectionId: undefined,
                parentId: undefined,
            })

            // Verify result is properly mapped
            expect(result).toEqual([
                expect.objectContaining({
                    id: '8485093748',
                    content: 'First task content',
                    description: '',
                    labels: [],
                }),
                expect.objectContaining({
                    id: '8485093749',
                    content: 'Second task content',
                    description: 'Task description',
                    dueDate: '2025-08-15',
                    priority: 2,
                    labels: ['work', 'urgent'],
                }),
            ])
        })

        it('should handle tasks with section and parent IDs', async () => {
            const mockApiResponse: Task = createMockTask({
                id: '8485093750',
                content: 'Subtask content',
                description: 'Subtask description',
                priority: 3,
                sectionId: 'section-123',
                parentId: 'parent-task-456',
                url: 'https://todoist.com/showTask?id=8485093750',
                addedAt: '2025-08-13T22:09:58.123456Z',
            })

            mockTodoistApi.addTask.mockResolvedValue(mockApiResponse)

            const result = await tasksAddMultiple.execute(
                {
                    projectId: '6cfCcrrCFg2xP94Q',
                    sectionId: 'section-123',
                    parentId: 'parent-task-456',
                    tasks: [
                        {
                            content: 'Subtask content',
                            description: 'Subtask description',
                            priority: 3,
                        },
                    ],
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.addTask).toHaveBeenCalledWith({
                content: 'Subtask content',
                description: 'Subtask description',
                priority: 3,
                projectId: '6cfCcrrCFg2xP94Q',
                sectionId: 'section-123',
                parentId: 'parent-task-456',
            })

            expect(result).toEqual([
                expect.objectContaining({
                    id: '8485093750',
                    content: 'Subtask content',
                    description: 'Subtask description',
                    priority: 3,
                    sectionId: 'section-123',
                    parentId: 'parent-task-456',
                    labels: [],
                }),
            ])
        })
    })

    describe('error handling', () => {
        it('should propagate API errors', async () => {
            const apiError = new Error('API Error: Task content is required')
            mockTodoistApi.addTask.mockRejectedValue(apiError)

            await expect(
                tasksAddMultiple.execute({ tasks: [{ content: '' }] }, mockTodoistApi),
            ).rejects.toThrow(apiError.message)
        })

        it('should handle partial failures when adding multiple tasks', async () => {
            const mockApiResponse: Task = createMockTask({
                id: '8485093751',
                content: 'First task content',
                url: 'https://todoist.com/showTask?id=8485093751',
                addedAt: '2025-08-13T22:09:59.123456Z',
            })

            const apiError = new Error('API Error: Second task failed')
            mockTodoistApi.addTask
                .mockResolvedValueOnce(mockApiResponse)
                .mockRejectedValueOnce(apiError)

            await expect(
                tasksAddMultiple.execute(
                    {
                        tasks: [
                            { content: 'First task content' },
                            { content: 'Second task content' },
                        ],
                    },
                    mockTodoistApi,
                ),
            ).rejects.toThrow('API Error: Second task failed')

            // Verify first task was attempted
            expect(mockTodoistApi.addTask).toHaveBeenCalledTimes(2)
        })
    })
})
