import type { Task, TodoistApi } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import {
    createMockTask,
    extractStructuredContent,
    extractTextContent,
    TEST_IDS,
} from '../../utils/test-helpers.js'
import { ToolNames } from '../../utils/tool-names.js'
import { updateTasks } from '../update-tasks.js'

// Mock the Todoist API
const mockTodoistApi = {
    updateTask: jest.fn(),
    moveTasks: jest.fn(),
} as unknown as jest.Mocked<TodoistApi>

const { UPDATE_TASKS } = ToolNames

describe(`${UPDATE_TASKS} tool`, () => {
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

            const result = await updateTasks.execute(
                {
                    tasks: [
                        {
                            id: '8485093748',
                            content: 'Updated task content',
                            description: 'Updated task description',
                        },
                    ],
                },
                mockTodoistApi,
            )

            // Verify API was called correctly
            expect(mockTodoistApi.updateTask).toHaveBeenCalledWith('8485093748', {
                content: 'Updated task content',
                description: 'Updated task description',
            })

            // Verify result matches expected structure with text and structured content
            const textContent = extractTextContent(result)
            expect(textContent).toContain('Updated 1 task')
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    tasks: expect.arrayContaining([expect.objectContaining({ id: '8485093748' })]),
                }),
            )
            expect(structuredContent.tasks).toHaveLength(1)
        })

        it('should update all tasks when multiple tasks are provided', async () => {
            const mockApiResponse: Task = createMockTask({
                id: '8485093748',
                content: 'Updated task content',
                description: 'Updated task description',
                url: 'https://todoist.com/showTask?id=8485093748',
                addedAt: '2025-08-13T22:09:56.123456Z',
            })

            mockTodoistApi.updateTask.mockResolvedValue(mockApiResponse)

            const result = await updateTasks.execute(
                {
                    tasks: [
                        {
                            id: '8485093748',
                            content: 'Updated task content',
                            description: 'Updated task description',
                        },
                        {
                            id: '8485093749',
                            content: 'Updated task content',
                            description: 'Updated task description',
                        },
                    ],
                },
                mockTodoistApi,
            )

            // Verify API was called correctly
            expect(mockTodoistApi.updateTask).toHaveBeenCalledWith('8485093748', {
                content: 'Updated task content',
                description: 'Updated task description',
            })
            expect(mockTodoistApi.updateTask).toHaveBeenCalledWith('8485093749', {
                content: 'Updated task content',
                description: 'Updated task description',
            })

            // Verify result matches expected structure with text and structured content
            const textContent = extractTextContent(result)
            expect(textContent).toContain('Updated 2 tasks')
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    totalCount: 2,
                    tasks: expect.any(Array),
                }),
            )
            expect(structuredContent.tasks).toHaveLength(2)
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

            const result = await updateTasks.execute(
                {
                    tasks: [
                        {
                            id: '8485093749',
                            priority: 'p3',
                            dueString: 'Aug 20',
                        },
                    ],
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.updateTask).toHaveBeenCalledWith('8485093749', {
                priority: 2,
                dueString: 'Aug 20',
            })

            // Verify result structure
            const textContent = extractTextContent(result)
            expect(textContent).toContain('Updated 1 task')
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent.tasks).toHaveLength(1)
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

            const result = await updateTasks.execute(
                {
                    tasks: [
                        {
                            id: '8485093750',
                            projectId: 'new-project-id',
                        },
                    ],
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.moveTasks).toHaveBeenCalledWith(['8485093750'], {
                projectId: 'new-project-id',
            })
            expect(mockTodoistApi.updateTask).not.toHaveBeenCalled()

            // Verify result structure
            const textContent = extractTextContent(result)
            expect(textContent).toContain('Updated 1 task')
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent.tasks).toHaveLength(1)
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

            const result = await updateTasks.execute(
                {
                    tasks: [
                        {
                            id: '8485093751',
                            parentId: 'parent-task-123',
                        },
                    ],
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.moveTasks).toHaveBeenCalledWith(['8485093751'], {
                parentId: 'parent-task-123',
            })
            expect(mockTodoistApi.updateTask).not.toHaveBeenCalled()

            // Verify result structure
            const textContent = extractTextContent(result)
            expect(textContent).toContain('Updated 1 task')
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent.tasks).toHaveLength(1)
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

            const result = await updateTasks.execute(
                {
                    tasks: [
                        {
                            id: '8485093752',
                            content: 'Completely updated task',
                            description: 'New description with details',
                            priority: 'p4',
                            dueString: 'every Friday',
                            projectId: 'different-project-id',
                        },
                    ],
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
                priority: 1,
                dueString: 'every Friday',
            })

            // Verify result structure
            const textContent = extractTextContent(result)
            expect(textContent).toContain('Updated 1 task')
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    tasks: expect.arrayContaining([expect.objectContaining({ id: '8485093752' })]),
                }),
            )
            expect(structuredContent.tasks).toHaveLength(1)
        })

        it('should update task duration', async () => {
            const mockApiResponse: Task = createMockTask({
                id: '8485093753',
                content: 'Task with updated duration',
                duration: { amount: 150, unit: 'minute' },
                url: 'https://todoist.com/showTask?id=8485093753',
                addedAt: '2025-08-13T22:09:56.123456Z',
            })

            mockTodoistApi.updateTask.mockResolvedValue(mockApiResponse)

            const result = await updateTasks.execute(
                {
                    tasks: [
                        {
                            id: '8485093753',
                            duration: '2h30m',
                        },
                    ],
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.updateTask).toHaveBeenCalledWith('8485093753', {
                duration: 150,
                durationUnit: 'minute',
            })

            // Verify result structure
            const textContent = extractTextContent(result)
            expect(textContent).toContain('Updated 1 task')
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    tasks: expect.arrayContaining([expect.objectContaining({ id: '8485093753' })]),
                }),
            )
            expect(structuredContent.tasks).toHaveLength(1)
        })

        it('should handle various duration formats', async () => {
            const mockApiResponse: Task = createMockTask({
                id: '8485093754',
                content: 'Test task',
                duration: { amount: 120, unit: 'minute' },
            })

            mockTodoistApi.updateTask.mockResolvedValue(mockApiResponse)

            // Test different duration formats
            const testCases = [
                { input: '2h', expectedMinutes: 120 },
                { input: '90m', expectedMinutes: 90 },
                { input: '1.5h', expectedMinutes: 90 },
                { input: ' 2h 30m ', expectedMinutes: 150 },
                { input: '2H30M', expectedMinutes: 150 },
            ]

            for (const testCase of testCases) {
                mockTodoistApi.updateTask.mockClear()

                await updateTasks.execute(
                    {
                        tasks: [
                            {
                                id: '8485093754',
                                duration: testCase.input,
                            },
                        ],
                    },
                    mockTodoistApi,
                )

                expect(mockTodoistApi.updateTask).toHaveBeenCalledWith(
                    '8485093754',
                    expect.objectContaining({
                        duration: testCase.expectedMinutes,
                        durationUnit: 'minute',
                    }),
                )
            }
        })

        it('should update task with duration and move at once', async () => {
            const movedTask = createMockTask({
                id: '8485093755',
                content: 'Task to move and update',
                projectId: 'new-project-id',
            })

            const updatedTask = createMockTask({
                id: '8485093755',
                content: 'Updated task with duration',
                duration: { amount: 120, unit: 'minute' },
                projectId: 'new-project-id',
            })

            mockTodoistApi.moveTasks.mockResolvedValue([movedTask])
            mockTodoistApi.updateTask.mockResolvedValue(updatedTask)

            const result = await updateTasks.execute(
                {
                    tasks: [
                        {
                            id: '8485093755',
                            content: 'Updated task with duration',
                            duration: '2h',
                            projectId: 'new-project-id',
                        },
                    ],
                },
                mockTodoistApi,
            )

            // Should call moveTasks first
            expect(mockTodoistApi.moveTasks).toHaveBeenCalledWith(['8485093755'], {
                projectId: 'new-project-id',
            })

            // Then call updateTask with duration
            expect(mockTodoistApi.updateTask).toHaveBeenCalledWith('8485093755', {
                content: 'Updated task with duration',
                duration: 120,
                durationUnit: 'minute',
            })

            // Verify result structure
            const textContent = extractTextContent(result)
            expect(textContent).toContain('Updated 1 task')
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    tasks: expect.arrayContaining([expect.objectContaining({ id: '8485093755' })]),
                }),
            )
            expect(structuredContent.tasks).toHaveLength(1)
        })
    })

    describe('error handling', () => {
        it('should throw error for invalid duration format', async () => {
            await expect(
                updateTasks.execute(
                    {
                        tasks: [
                            {
                                id: '8485093756',
                                duration: 'invalid',
                            },
                        ],
                    },
                    mockTodoistApi,
                ),
            ).rejects.toThrow('Task 8485093756: Invalid duration format "invalid"')
        })

        it('should throw error for duration exceeding 24 hours', async () => {
            await expect(
                updateTasks.execute(
                    {
                        tasks: [
                            {
                                id: '8485093757',
                                duration: '25h',
                            },
                        ],
                    },
                    mockTodoistApi,
                ),
            ).rejects.toThrow(
                'Task 8485093757: Invalid duration format "25h": Duration cannot exceed 24 hours (1440 minutes)',
            )
        })
        it('should throw error when multiple move parameters are provided', async () => {
            await expect(
                updateTasks.execute(
                    {
                        tasks: [
                            {
                                id: '8485093748',
                                projectId: 'new-project',
                                sectionId: 'new-section',
                            },
                        ],
                    },
                    mockTodoistApi,
                ),
            ).rejects.toThrow(
                'Only one of projectId, sectionId, or parentId can be specified at a time. ' +
                    'The Todoist API requires exactly one destination for move operations.',
            )
        })

        it('should throw error when all three move parameters are provided', async () => {
            await expect(
                updateTasks.execute(
                    {
                        tasks: [
                            {
                                id: '8485093748',
                                projectId: 'p1',
                                sectionId: 's1',
                                parentId: 't1',
                            },
                        ],
                    },
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
                params: { id: '8485093748', content: 'Test task' },
            },
        ])('should propagate $error', async ({ error, params }) => {
            mockTodoistApi.updateTask.mockRejectedValue(new Error(error))
            await expect(
                updateTasks.execute(
                    {
                        tasks: [params],
                    },
                    mockTodoistApi,
                ),
            ).rejects.toThrow(error)
        })
    })

    describe('task organisation', () => {
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

                const result = await updateTasks.execute(
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

                // Verify result structure
                const textContent = extractTextContent(result)
                expect(textContent).toContain('Updated 2 tasks')
                const structuredContent = extractStructuredContent(result)
                expect(structuredContent.tasks).toHaveLength(2)
                expect(structuredContent.totalCount).toBe(2)
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

                const result = await updateTasks.execute(
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
                const textContent = extractTextContent(result)
                expect(textContent).toContain('Updated 3 tasks')
                const structuredContent = extractStructuredContent(result)
                expect(structuredContent.tasks).toHaveLength(3)
                expect(structuredContent.totalCount).toBe(3)
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

                const result = await updateTasks.execute(
                    { tasks: [{ id: '8485093751', sectionId: 'target-section' }] },
                    mockTodoistApi,
                )

                expect(mockTodoistApi.moveTasks).toHaveBeenCalledTimes(1)
                expect(mockTodoistApi.moveTasks).toHaveBeenCalledWith(['8485093751'], {
                    sectionId: 'target-section',
                })
                expect(mockTodoistApi.updateTask).not.toHaveBeenCalled()

                // Verify result structure
                const textContent = extractTextContent(result)
                expect(textContent).toContain('Updated 1 task')
                const structuredContent = extractStructuredContent(result)
                expect(structuredContent).toEqual(
                    expect.objectContaining({
                        tasks: expect.arrayContaining([
                            expect.objectContaining({ id: '8485093751' }),
                        ]),
                    }),
                )
                expect(structuredContent.tasks).toHaveLength(1)
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

                const result = await updateTasks.execute(
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

                // Verify result structure
                const textContent = extractTextContent(result)
                expect(textContent).toContain('Updated 3 tasks')
                const structuredContent = extractStructuredContent(result)
                expect(structuredContent.tasks).toHaveLength(3)
                expect(structuredContent.totalCount).toBe(3)
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

                const result = await updateTasks.execute(
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

                // Verify result structure
                const textContent = extractTextContent(result)
                expect(textContent).toContain('Updated 1 task')
                const structuredContent = extractStructuredContent(result)
                expect(structuredContent).toEqual(
                    expect.objectContaining({
                        tasks: expect.arrayContaining([
                            expect.objectContaining({ id: '8485093752' }),
                        ]),
                    }),
                )
            })

            it('should handle empty updates (only id provided)', async () => {
                const result = await updateTasks.execute(
                    { tasks: [{ id: '8485093753' }] },
                    mockTodoistApi,
                )

                // No API calls should be made since no move parameters are provided
                expect(mockTodoistApi.moveTasks).not.toHaveBeenCalled()
                expect(mockTodoistApi.updateTask).not.toHaveBeenCalled()

                // Returns empty results since no moves were processed
                const textContent = extractTextContent(result)
                expect(textContent).toContain('Updated 0 tasks')
                const structuredContent = extractStructuredContent(result)
                expect(structuredContent.tasks).toHaveLength(0)
                expect(structuredContent.totalCount).toBe(0)
            })
        })

        describe('error handling', () => {
            it('should throw error when task has multiple move parameters', async () => {
                await expect(
                    updateTasks.execute(
                        {
                            tasks: [
                                {
                                    id: 'task-1',
                                    projectId: 'new-project',
                                    sectionId: 'new-section',
                                },
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
                    updateTasks.execute(
                        { tasks: [{ id: 'non-existent-task', projectId: 'some-project' }] },
                        mockTodoistApi,
                    ),
                ).rejects.toThrow('API Error: Task not found')
            })

            it('should handle validation errors', async () => {
                const validationError = new Error('API Error: Invalid section ID')
                mockTodoistApi.moveTasks.mockRejectedValue(validationError)

                await expect(
                    updateTasks.execute(
                        { tasks: [{ id: 'task-1', sectionId: 'invalid-section-format' }] },
                        mockTodoistApi,
                    ),
                ).rejects.toThrow('API Error: Invalid section ID')
            })

            it('should handle permission errors', async () => {
                const permissionError = new Error(
                    'API Error: Insufficient permissions to move task',
                )
                mockTodoistApi.moveTasks.mockRejectedValue(permissionError)

                await expect(
                    updateTasks.execute(
                        { tasks: [{ id: 'restricted-task', projectId: 'restricted-project' }] },
                        mockTodoistApi,
                    ),
                ).rejects.toThrow('API Error: Insufficient permissions to move task')
            })

            it('should handle circular parent dependency errors', async () => {
                const circularError = new Error('API Error: Circular dependency detected')
                mockTodoistApi.moveTasks.mockRejectedValue(circularError)

                await expect(
                    updateTasks.execute(
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
})
