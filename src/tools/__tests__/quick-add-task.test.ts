import type { Task, TodoistApi } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import {
    createMockTask,
    extractStructuredContent,
    extractTextContent,
} from '../../utils/test-helpers.js'
import { ToolNames } from '../../utils/tool-names.js'
import { quickAddTask } from '../quick-add-task.js'

// Mock the Todoist API
const mockTodoistApi = {
    quickAddTask: jest.fn(),
} as unknown as jest.Mocked<TodoistApi>

const { QUICK_ADD_TASK } = ToolNames

describe(`${QUICK_ADD_TASK} tool`, () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('adding multiple tasks', () => {
        it('should quick add multiple tasks and return mapped results', async () => {
            // Mock API responses for each task
            const mockApiResponse1: Task = createMockTask({
                id: '9000000001',
                content: 'Quick task 1',
                url: 'https://todoist.com/showTask?id=9000000001',
            })
            const mockApiResponse2: Task = createMockTask({
                id: '9000000002',
                content: 'Quick task 2',
                description: 'Quick description',
                url: 'https://todoist.com/showTask?id=9000000002',
            })

            mockTodoistApi.quickAddTask
                .mockResolvedValueOnce(mockApiResponse1)
                .mockResolvedValueOnce(mockApiResponse2)

            const result = await quickAddTask.execute(
                {
                    tasks: [
                        { text: 'Quick task 1' },
                        { text: 'Quick task 2', note: 'Quick description' },
                    ],
                },
                mockTodoistApi,
            )

            // Verify API was called correctly for each task
            expect(mockTodoistApi.quickAddTask).toHaveBeenCalledTimes(2)
            expect(mockTodoistApi.quickAddTask).toHaveBeenNthCalledWith(1, {
                text: 'Quick task 1',
            })
            expect(mockTodoistApi.quickAddTask).toHaveBeenNthCalledWith(2, {
                text: 'Quick task 2',
                note: 'Quick description',
            })

            // Verify result is a concise summary
            expect(extractTextContent(result)).toMatchSnapshot()
            const structuredContent = extractStructuredContent(result)
            expect(Array.isArray((structuredContent as any).tasks)).toBe(true)
            expect((structuredContent as any).tasks).toHaveLength(2)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    totalCount: 2,
                    tasks: expect.arrayContaining([
                        expect.objectContaining({ id: '9000000001' }),
                        expect.objectContaining({ id: '9000000002' }),
                    ]),
                }),
            )
        })
    })

    describe('reminders and meta fields', () => {
        it('should handle quick add with reminder and meta', async () => {
            const mockApiResponse: Task = createMockTask({
                id: '9000000003',
                content: 'Quick task with reminder',
            })

            mockTodoistApi.quickAddTask.mockResolvedValue(mockApiResponse)

            const result = await quickAddTask.execute(
                {
                    tasks: [
                        {
                            text: 'Quick task with reminder',
                            reminder: 'tomorrow 9am',
                            meta: true,
                        },
                    ],
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.quickAddTask).toHaveBeenCalledWith({
                text: 'Quick task with reminder',
                reminder: 'tomorrow 9am',
                meta: true,
            })

            expect(extractTextContent(result)).toMatchSnapshot()
            const structuredContent = extractStructuredContent(result)
            expect(Array.isArray((structuredContent as any).tasks)).toBe(true)
            expect((structuredContent as any).tasks).toHaveLength(1)
            expect((structuredContent as any).tasks[0]).toEqual(
                expect.objectContaining({ id: '9000000003' }),
            )
        })
    })

    describe('error handling', () => {
        it('should propagate API errors', async () => {
            const apiError = new Error('API Error: Quick add failed')
            mockTodoistApi.quickAddTask.mockRejectedValue(apiError)

            await expect(
                quickAddTask.execute({ tasks: [{ text: 'fail' }] }, mockTodoistApi),
            ).rejects.toThrow(apiError.message)
        })
    })
})
