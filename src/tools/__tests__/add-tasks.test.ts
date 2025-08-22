import type { Task, TodoistApi } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import {
    TODAY,
    createMockTask,
    extractStructuredContent,
    extractTextContent,
} from '../../utils/test-helpers.js'
import { ToolNames } from '../../utils/tool-names.js'
import { addTasks } from '../add-tasks.js'

// Mock the Todoist API
const mockTodoistApi = {
    addTask: jest.fn(),
} as unknown as jest.Mocked<TodoistApi>

const { ADD_TASKS, GET_OVERVIEW } = ToolNames

describe(`${ADD_TASKS} tool`, () => {
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

            const result = await addTasks.execute(
                {
                    tasks: [
                        { content: 'First task content', projectId: '6cfCcrrCFg2xP94Q' },
                        {
                            content: 'Second task content',
                            description: 'Task description',
                            priority: 2,
                            dueString: 'Aug 15',
                            projectId: '6cfCcrrCFg2xP94Q',
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

            // Verify result is a concise summary
            expect(extractTextContent(result)).toMatchSnapshot()

            // Verify structured content
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent.tasks).toHaveLength(2)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    totalCount: 2,
                    tasks: expect.arrayContaining([
                        expect.objectContaining({ id: '8485093748' }),
                        expect.objectContaining({ id: '8485093749' }),
                    ]),
                }),
            )
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

            const result = await addTasks.execute(
                {
                    tasks: [
                        {
                            content: 'Subtask content',
                            description: 'Subtask description',
                            priority: 3,
                            projectId: '6cfCcrrCFg2xP94Q',
                            sectionId: 'section-123',
                            parentId: 'parent-task-456',
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

            // Verify result is a concise summary
            expect(extractTextContent(result)).toMatchSnapshot()

            // Verify structured content
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    totalCount: 1,
                    tasks: expect.arrayContaining([expect.objectContaining({ id: '8485093750' })]),
                }),
            )
        })

        it('should add tasks with duration', async () => {
            const mockApiResponse1: Task = createMockTask({
                id: '8485093752',
                content: 'Task with 2 hour duration',
                duration: { amount: 120, unit: 'minute' },
                url: 'https://todoist.com/showTask?id=8485093752',
                addedAt: '2025-08-13T22:09:56.123456Z',
            })

            const mockApiResponse2: Task = createMockTask({
                id: '8485093753',
                content: 'Task with 45 minute duration',
                duration: { amount: 45, unit: 'minute' },
                url: 'https://todoist.com/showTask?id=8485093753',
                addedAt: '2025-08-13T22:09:57.123456Z',
            })

            mockTodoistApi.addTask
                .mockResolvedValueOnce(mockApiResponse1)
                .mockResolvedValueOnce(mockApiResponse2)

            const result = await addTasks.execute(
                {
                    tasks: [
                        {
                            content: 'Task with 2 hour duration',
                            duration: '2h',
                            projectId: '6cfCcrrCFg2xP94Q',
                        },
                        {
                            content: 'Task with 45 minute duration',
                            duration: '45m',
                            projectId: '6cfCcrrCFg2xP94Q',
                        },
                    ],
                },
                mockTodoistApi,
            )

            // Verify API was called with parsed duration
            expect(mockTodoistApi.addTask).toHaveBeenNthCalledWith(1, {
                content: 'Task with 2 hour duration',
                projectId: '6cfCcrrCFg2xP94Q',
                sectionId: undefined,
                parentId: undefined,
                duration: 120,
                durationUnit: 'minute',
            })
            expect(mockTodoistApi.addTask).toHaveBeenNthCalledWith(2, {
                content: 'Task with 45 minute duration',
                projectId: '6cfCcrrCFg2xP94Q',
                sectionId: undefined,
                parentId: undefined,
                duration: 45,
                durationUnit: 'minute',
            })

            // Verify result is a concise summary
            expect(extractTextContent(result)).toMatchSnapshot()

            // Verify structured content
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent.tasks).toHaveLength(2)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    totalCount: 2,
                    tasks: expect.arrayContaining([
                        expect.objectContaining({ id: '8485093752' }),
                        expect.objectContaining({ id: '8485093753' }),
                    ]),
                }),
            )
        })

        it('should handle various duration formats', async () => {
            const mockApiResponse: Task = createMockTask({
                id: '8485093754',
                content: 'Task with combined duration',
                duration: { amount: 150, unit: 'minute' },
                url: 'https://todoist.com/showTask?id=8485093754',
                addedAt: '2025-08-13T22:09:56.123456Z',
            })

            mockTodoistApi.addTask.mockResolvedValue(mockApiResponse)

            // Test different duration formats
            const testCases = [
                { input: '2h30m', expectedMinutes: 150 },
                { input: '1.5h', expectedMinutes: 90 },
                { input: ' 90m ', expectedMinutes: 90 },
                { input: '2H30M', expectedMinutes: 150 },
            ]

            for (const testCase of testCases) {
                mockTodoistApi.addTask.mockClear()

                await addTasks.execute(
                    { tasks: [{ content: 'Test task', duration: testCase.input }] },
                    mockTodoistApi,
                )

                expect(mockTodoistApi.addTask).toHaveBeenCalledWith(
                    expect.objectContaining({
                        duration: testCase.expectedMinutes,
                        durationUnit: 'minute',
                    }),
                )
            }
        })
    })

    describe('error handling', () => {
        it('should throw error for invalid duration format', async () => {
            await expect(
                addTasks.execute(
                    { tasks: [{ content: 'Task with invalid duration', duration: 'invalid' }] },
                    mockTodoistApi,
                ),
            ).rejects.toThrow(
                'Task "Task with invalid duration": Invalid duration format "invalid"',
            )
        })

        it('should throw error for duration exceeding 24 hours', async () => {
            await expect(
                addTasks.execute(
                    { tasks: [{ content: 'Task with too long duration', duration: '25h' }] },
                    mockTodoistApi,
                ),
            ).rejects.toThrow(
                'Task "Task with too long duration": Invalid duration format "25h": Duration cannot exceed 24 hours (1440 minutes)',
            )
        })

        it('should propagate API errors', async () => {
            const apiError = new Error('API Error: Task content is required')
            mockTodoistApi.addTask.mockRejectedValue(apiError)

            await expect(
                addTasks.execute({ tasks: [{ content: '' }] }, mockTodoistApi),
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
                addTasks.execute(
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

    describe('next steps logic', () => {
        it('should suggest find-tasks-by-date for today when hasToday is true', async () => {
            const mockApiResponse: Task = createMockTask({
                id: '8485093755',
                content: 'Task due today',
                url: 'https://todoist.com/showTask?id=8485093755',
                addedAt: '2025-08-13T22:09:56.123456Z',
                due: {
                    date: TODAY,
                    isRecurring: false,
                    lang: 'en',
                    string: 'today',
                    timezone: null,
                },
            })

            mockTodoistApi.addTask.mockResolvedValue(mockApiResponse)

            const result = await addTasks.execute(
                { tasks: [{ content: 'Task due today', dueString: 'today' }] },
                mockTodoistApi,
            )

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain(
                `Use ${GET_OVERVIEW} to see your updated project organization`,
            )
        })

        it('should suggest overview tool when no hasToday context', async () => {
            const mockApiResponse: Task = createMockTask({
                id: '8485093756',
                content: 'Regular task',
                url: 'https://todoist.com/showTask?id=8485093756',
                addedAt: '2025-08-13T22:09:56.123456Z',
            })

            mockTodoistApi.addTask.mockResolvedValue(mockApiResponse)

            const result = await addTasks.execute(
                {
                    tasks: [{ content: 'Regular task', projectId: '6cfCcrrCFg2xP94Q' }],
                },
                mockTodoistApi,
            )

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain(
                `Use ${GET_OVERVIEW} to see your updated project organization`,
            )
        })
    })
})
