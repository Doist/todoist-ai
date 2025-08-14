import type { Task, TodoistApi } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import { tasksListForContainer } from '../tasks-list-for-container.js'
import { TEST_IDS, createMockApiResponse, createMockTask } from '../test-helpers.js'

// Mock the Todoist API
const mockTodoistApi = {
    getTasks: jest.fn(),
} as unknown as jest.Mocked<TodoistApi>

describe('tasks-list-for-container tool', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('container types', () => {
        it.each([
            {
                name: 'project',
                type: 'project' as const,
                id: TEST_IDS.PROJECT_TEST,
                expectedParam: { projectId: TEST_IDS.PROJECT_TEST },
                tasks: [createMockTask({ content: 'Project task' })],
            },
            {
                name: 'section',
                type: 'section' as const,
                id: TEST_IDS.SECTION_1,
                expectedParam: { sectionId: TEST_IDS.SECTION_1 },
                tasks: [createMockTask({ content: 'Section task' })],
            },
            {
                name: 'parent task',
                type: 'parent' as const,
                id: TEST_IDS.TASK_1,
                expectedParam: { parentId: TEST_IDS.TASK_1 },
                tasks: [createMockTask({ content: 'Subtask' })],
            },
        ])('should get tasks for $name', async ({ type, id, expectedParam, tasks }) => {
            mockTodoistApi.getTasks.mockResolvedValue(createMockApiResponse(tasks))

            const result = await tasksListForContainer.execute(
                { type, id, limit: 10 },
                mockTodoistApi,
            )

            expect(mockTodoistApi.getTasks).toHaveBeenCalledWith({
                limit: 10,
                cursor: null,
                ...expectedParam,
            })
            expect(result.tasks).toHaveLength(1)
            expect(result.nextCursor).toBeNull()
        })
    })

    describe('getting tasks for a section', () => {
        it('should get tasks for a specific section', async () => {
            const mockTasks: Task[] = [
                createMockTask({
                    id: '8485093751',
                    content: 'Section task 1',
                    description: 'Task in specific section',
                    labels: ['urgent'],
                    childOrder: 1,
                    priority: 3,
                    projectId: '6cfCcrrCFg2xP94Q',
                    sectionId: 'section-123',
                    url: 'https://todoist.com/showTask?id=8485093751',
                    addedAt: '2025-08-13T22:09:59.123456Z',
                    due: {
                        date: '2025-08-16',
                        isRecurring: true,
                        lang: 'en',
                        string: 'every week',
                        timezone: null,
                    },
                }),
            ]

            mockTodoistApi.getTasks.mockResolvedValue({ results: mockTasks, nextCursor: null })

            const result = await tasksListForContainer.execute(
                { type: 'section', id: 'section-123', limit: 15 },
                mockTodoistApi,
            )

            expect(mockTodoistApi.getTasks).toHaveBeenCalledWith({
                limit: 15,
                cursor: null,
                sectionId: 'section-123',
            })

            expect(result).toEqual({
                tasks: [
                    expect.objectContaining({
                        id: '8485093751',
                        content: 'Section task 1',
                        description: 'Task in specific section',
                        dueDate: '2025-08-16',
                        recurring: 'every week',
                        priority: 3,
                        sectionId: 'section-123',
                        labels: ['urgent'],
                    }),
                ],
                nextCursor: null,
            })
        })

        it('should handle empty section', async () => {
            mockTodoistApi.getTasks.mockResolvedValue({ results: [], nextCursor: null })

            const result = await tasksListForContainer.execute(
                { type: 'section', id: 'empty-section-id', limit: 10 },
                mockTodoistApi,
            )

            expect(mockTodoistApi.getTasks).toHaveBeenCalledWith({
                limit: 10,
                cursor: null,
                sectionId: 'empty-section-id',
            })

            expect(result).toEqual({ tasks: [], nextCursor: null })
        })
    })

    describe('getting subtasks for a parent task', () => {
        it('should get subtasks for a specific parent task', async () => {
            const mockSubtasks: Task[] = [
                createMockTask({
                    id: '8485093752',
                    content: 'Subtask 1',
                    description: 'First subtask',
                    childOrder: 1,
                    priority: 1,
                    projectId: '6cfCcrrCFg2xP94Q',
                    parentId: 'parent-task-123',
                    url: 'https://todoist.com/showTask?id=8485093752',
                    addedAt: '2025-08-13T22:10:00.123456Z',
                }),
                createMockTask({
                    id: '8485093753',
                    content: 'Subtask 2',
                    description: 'Second subtask',
                    labels: ['follow-up'],
                    childOrder: 2,
                    priority: 2,
                    projectId: '6cfCcrrCFg2xP94Q',
                    parentId: 'parent-task-123',
                    url: 'https://todoist.com/showTask?id=8485093753',
                    addedAt: '2025-08-13T22:10:01.123456Z',
                    due: {
                        date: '2025-08-18',
                        isRecurring: false,
                        lang: 'en',
                        string: 'Aug 18',
                        timezone: null,
                    },
                }),
            ]

            mockTodoistApi.getTasks.mockResolvedValue({ results: mockSubtasks, nextCursor: null })

            const result = await tasksListForContainer.execute(
                { type: 'parent', id: 'parent-task-123', limit: 10 },
                mockTodoistApi,
            )

            expect(mockTodoistApi.getTasks).toHaveBeenCalledWith({
                parentId: 'parent-task-123',
                cursor: null,
                limit: 10,
            })

            expect(result).toEqual({
                tasks: [
                    expect.objectContaining({
                        id: '8485093752',
                        content: 'Subtask 1',
                        description: 'First subtask',
                        parentId: 'parent-task-123',
                        labels: [],
                    }),
                    expect.objectContaining({
                        id: '8485093753',
                        content: 'Subtask 2',
                        description: 'Second subtask',
                        dueDate: '2025-08-18',
                        parentId: 'parent-task-123',
                        priority: 2,
                        labels: ['follow-up'],
                    }),
                ],
                nextCursor: null,
            })
        })

        it('should handle parent task with no subtasks', async () => {
            mockTodoistApi.getTasks.mockResolvedValue({ results: [], nextCursor: null })

            const result = await tasksListForContainer.execute(
                { type: 'parent', id: 'parent-with-no-subtasks', limit: 10 },
                mockTodoistApi,
            )

            expect(mockTodoistApi.getTasks).toHaveBeenCalledWith({
                parentId: 'parent-with-no-subtasks',
                cursor: null,
                limit: 10,
            })

            expect(result).toEqual({ tasks: [], nextCursor: null })
        })
    })

    describe('pagination and limits', () => {
        it('should handle custom limit and cursor', async () => {
            mockTodoistApi.getTasks.mockResolvedValue({ results: [], nextCursor: 'next-cursor' })

            const result = await tasksListForContainer.execute(
                { type: 'section', id: 'test-section', limit: 25, cursor: 'current-cursor' },
                mockTodoistApi,
            )

            expect(mockTodoistApi.getTasks).toHaveBeenCalledWith({
                limit: 25,
                cursor: 'current-cursor',
                sectionId: 'test-section',
            })

            expect(result.nextCursor).toBe('next-cursor')
        })
    })

    describe('container type validation', () => {
        it('should handle all container types correctly', async () => {
            mockTodoistApi.getTasks.mockResolvedValue({ results: [], nextCursor: null })

            // Test project container
            await tasksListForContainer.execute(
                { type: 'project', id: 'proj-1', limit: 10 },
                mockTodoistApi,
            )
            expect(mockTodoistApi.getTasks).toHaveBeenLastCalledWith(
                expect.objectContaining({ projectId: 'proj-1' }),
            )

            // Test section container
            await tasksListForContainer.execute(
                { type: 'section', id: 'sect-1', limit: 10 },
                mockTodoistApi,
            )
            expect(mockTodoistApi.getTasks).toHaveBeenLastCalledWith(
                expect.objectContaining({ sectionId: 'sect-1' }),
            )

            // Test parent container
            await tasksListForContainer.execute(
                { type: 'parent', id: 'parent-1', limit: 10 },
                mockTodoistApi,
            )
            expect(mockTodoistApi.getTasks).toHaveBeenLastCalledWith(
                expect.objectContaining({ parentId: 'parent-1' }),
            )

            expect(mockTodoistApi.getTasks).toHaveBeenCalledTimes(3)
        })
    })

    describe('error handling', () => {
        it('should propagate API errors for project queries', async () => {
            const apiError = new Error('API Error: Project not found')
            mockTodoistApi.getTasks.mockRejectedValue(apiError)

            await expect(
                tasksListForContainer.execute(
                    { type: 'project', id: 'non-existent-project', limit: 10 },
                    mockTodoistApi,
                ),
            ).rejects.toThrow('API Error: Project not found')
        })

        it('should propagate API errors for section queries', async () => {
            const apiError = new Error('API Error: Section not found')
            mockTodoistApi.getTasks.mockRejectedValue(apiError)

            await expect(
                tasksListForContainer.execute(
                    { type: 'section', id: 'non-existent-section', limit: 10 },
                    mockTodoistApi,
                ),
            ).rejects.toThrow('API Error: Section not found')
        })

        it('should propagate API errors for parent task queries', async () => {
            const apiError = new Error('API Error: Parent task not found')
            mockTodoistApi.getTasks.mockRejectedValue(apiError)

            await expect(
                tasksListForContainer.execute(
                    { type: 'parent', id: 'non-existent-parent', limit: 10 },
                    mockTodoistApi,
                ),
            ).rejects.toThrow('API Error: Parent task not found')
        })

        it('should handle permission errors', async () => {
            const permissionError = new Error('API Error: Insufficient permissions')
            mockTodoistApi.getTasks.mockRejectedValue(permissionError)

            await expect(
                tasksListForContainer.execute(
                    { type: 'project', id: 'restricted-project', limit: 10 },
                    mockTodoistApi,
                ),
            ).rejects.toThrow('API Error: Insufficient permissions')
        })

        it('should handle cursor validation errors', async () => {
            const cursorError = new Error('API Error: Invalid cursor')
            mockTodoistApi.getTasks.mockRejectedValue(cursorError)

            await expect(
                tasksListForContainer.execute(
                    { type: 'project', id: 'test-project', cursor: 'invalid-cursor', limit: 10 },
                    mockTodoistApi,
                ),
            ).rejects.toThrow('API Error: Invalid cursor')
        })
    })
})
