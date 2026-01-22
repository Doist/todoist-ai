import type { TodoistApi } from '@doist/todoist-api-typescript'
import { type Mocked, type MockedFunction, vi } from 'vitest'
import { getTasksByFilter, MappedTask } from '../../tool-helpers.js'
import {
    createMappedTask,
    createMockUser,
    TEST_ERRORS,
    TEST_IDS,
} from '../../utils/test-helpers.js'
import { ToolNames } from '../../utils/tool-names.js'
import { resolveUserNameToId } from '../../utils/user-resolver.js'
import { findTasksByFilter } from '../find-tasks-by-filter.js'

// Mock only getTasksByFilter, use actual implementations for everything else
vi.mock('../../tool-helpers', async () => {
    const actual = (await vi.importActual(
        '../../tool-helpers',
    )) as typeof import('../../tool-helpers.js')
    return {
        ...actual,
        getTasksByFilter: vi.fn(),
    }
})

// Mock user resolver
vi.mock('../../utils/user-resolver', () => ({
    resolveUserNameToId: vi.fn(),
}))

const mockGetTasksByFilter = getTasksByFilter as MockedFunction<typeof getTasksByFilter>
const mockResolveUserNameToId = resolveUserNameToId as MockedFunction<typeof resolveUserNameToId>

// Mock the Todoist API
const mockTodoistApi = {
    getUser: vi.fn(),
} as unknown as Mocked<TodoistApi>

// Mock the Todoist User
const mockTodoistUser = createMockUser()

const { FIND_TASKS_BY_FILTER } = ToolNames

describe(`${FIND_TASKS_BY_FILTER} tool`, () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockTodoistApi.getUser.mockResolvedValue(mockTodoistUser)
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('basic filter queries', () => {
        it('should execute a basic project hierarchy filter (##Work)', async () => {
            const mockTasks = [
                createMappedTask({ content: 'Task in Work project', projectId: 'work-project' }),
                createMappedTask({
                    id: TEST_IDS.TASK_2,
                    content: 'Task in sub-project',
                    projectId: 'sub-project',
                }),
            ]
            const mockResponse = { tasks: mockTasks, nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await findTasksByFilter.execute(
                { filter: '##Work', limit: 10 },
                mockTodoistApi,
            )

            expect(mockGetTasksByFilter).toHaveBeenCalledWith({
                client: mockTodoistApi,
                query: '##Work',
                cursor: undefined,
                limit: 10,
            })

            expect(result.structuredContent.tasks).toHaveLength(2)
            expect(result.structuredContent.appliedFilter).toBe('##Work')
            expect(result.textContent).toMatchSnapshot()
        })

        it('should execute a complex filter with logical operators', async () => {
            const mockTasks = [
                createMappedTask({
                    content: 'High priority overdue task',
                    priority: 'p1',
                    dueDate: '2025-08-10',
                }),
            ]
            const mockResponse = { tasks: mockTasks, nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await findTasksByFilter.execute(
                { filter: '(today | overdue) & p1', limit: 50 },
                mockTodoistApi,
            )

            expect(mockGetTasksByFilter).toHaveBeenCalledWith({
                client: mockTodoistApi,
                query: '(today | overdue) & p1',
                cursor: undefined,
                limit: 50,
            })

            expect(result.structuredContent.tasks).toHaveLength(1)
            expect(result.textContent).toMatchSnapshot()
        })

        it('should execute a single project filter (#Inbox)', async () => {
            const mockTasks = [
                createMappedTask({ content: 'Inbox task', projectId: TEST_IDS.PROJECT_INBOX }),
            ]
            const mockResponse = { tasks: mockTasks, nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await findTasksByFilter.execute(
                { filter: '#Inbox', limit: 10 },
                mockTodoistApi,
            )

            expect(mockGetTasksByFilter).toHaveBeenCalledWith({
                client: mockTodoistApi,
                query: '#Inbox',
                cursor: undefined,
                limit: 10,
            })

            expect(result.structuredContent.tasks).toHaveLength(1)
            expect(result.textContent).toMatchSnapshot()
        })
    })

    describe('pagination', () => {
        it('should handle pagination with cursor', async () => {
            const mockTasks = [createMappedTask({ content: 'Page 2 task' })]
            const mockResponse = { tasks: mockTasks, nextCursor: 'next-page-cursor' }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await findTasksByFilter.execute(
                { filter: '##Work', limit: 10, cursor: 'current-cursor' },
                mockTodoistApi,
            )

            expect(mockGetTasksByFilter).toHaveBeenCalledWith({
                client: mockTodoistApi,
                query: '##Work',
                cursor: 'current-cursor',
                limit: 10,
            })

            expect(result.structuredContent.nextCursor).toBe('next-page-cursor')
            expect(result.structuredContent.hasMore).toBe(true)
            expect(result.textContent).toMatchSnapshot()
        })
    })

    describe('combining filter with labels', () => {
        it('should combine filter with single label', async () => {
            const mockTasks = [
                createMappedTask({
                    content: 'Urgent work task',
                    labels: ['urgent'],
                }),
            ]
            const mockResponse = { tasks: mockTasks, nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await findTasksByFilter.execute(
                { filter: '##Work', labels: ['urgent'], limit: 10 },
                mockTodoistApi,
            )

            expect(mockGetTasksByFilter).toHaveBeenCalledWith({
                client: mockTodoistApi,
                query: '##Work & (@urgent)',
                cursor: undefined,
                limit: 10,
            })

            expect(result.structuredContent.appliedFilter).toBe('##Work & (@urgent)')
            expect(result.textContent).toMatchSnapshot()
        })

        it('should combine filter with multiple labels using AND operator', async () => {
            const mockTasks = [
                createMappedTask({
                    content: 'Important urgent task',
                    labels: ['important', 'urgent'],
                }),
            ]
            const mockResponse = { tasks: mockTasks, nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await findTasksByFilter.execute(
                {
                    filter: '##Work',
                    labels: ['important', 'urgent'],
                    labelsOperator: 'and',
                    limit: 10,
                },
                mockTodoistApi,
            )

            expect(mockGetTasksByFilter).toHaveBeenCalledWith({
                client: mockTodoistApi,
                query: '##Work & (@important  &  @urgent)',
                cursor: undefined,
                limit: 10,
            })

            expect(result.textContent).toMatchSnapshot()
        })
    })

    describe('combining filter with responsible user', () => {
        it('should combine filter with specific user', async () => {
            mockResolveUserNameToId.mockResolvedValue({
                userId: 'user-123',
                displayName: 'John Doe',
                email: 'john@example.com',
            })

            const mockTasks = [
                createMappedTask({
                    content: 'Task assigned to John',
                    responsibleUid: 'user-123',
                }),
            ]
            const mockResponse = { tasks: mockTasks, nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await findTasksByFilter.execute(
                { filter: '##Work', responsibleUser: 'john@example.com', limit: 10 },
                mockTodoistApi,
            )

            expect(mockResolveUserNameToId).toHaveBeenCalledWith(mockTodoistApi, 'john@example.com')
            expect(mockGetTasksByFilter).toHaveBeenCalledWith({
                client: mockTodoistApi,
                query: '##Work & assigned to: john@example.com',
                cursor: undefined,
                limit: 10,
            })

            expect(result.textContent).toContain('assigned to: john@example.com')
            expect(result.textContent).toMatchSnapshot()
        })

        it('should default responsibleUserFiltering to "all" to preserve filter behavior', async () => {
            const mockTasks = [createMappedTask({ content: 'Task 1' })]
            const mockResponse = { tasks: mockTasks, nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            await findTasksByFilter.execute({ filter: '##Work', limit: 10 }, mockTodoistApi)

            // Should not add any assignment filter when responsibleUserFiltering defaults to 'all'
            expect(mockGetTasksByFilter).toHaveBeenCalledWith({
                client: mockTodoistApi,
                query: '##Work',
                cursor: undefined,
                limit: 10,
            })
        })

        it('should allow overriding responsibleUserFiltering', async () => {
            const mockTasks = [createMappedTask({ content: 'My task or unassigned' })]
            const mockResponse = { tasks: mockTasks, nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            await findTasksByFilter.execute(
                { filter: '##Work', responsibleUserFiltering: 'unassignedOrMe', limit: 10 },
                mockTodoistApi,
            )

            expect(mockGetTasksByFilter).toHaveBeenCalledWith({
                client: mockTodoistApi,
                query: '##Work & !assigned to: others',
                cursor: undefined,
                limit: 10,
            })
        })
    })

    describe('sorting', () => {
        it('should sort by priority (p1 first by default)', async () => {
            const mockTasks = [
                createMappedTask({ id: '1', content: 'Low priority', priority: 'p4' }),
                createMappedTask({ id: '2', content: 'High priority', priority: 'p1' }),
                createMappedTask({ id: '3', content: 'Medium priority', priority: 'p2' }),
            ]
            const mockResponse = { tasks: mockTasks, nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await findTasksByFilter.execute(
                { filter: '##Work', sortBy: 'priority', limit: 10 },
                mockTodoistApi,
            )

            const tasks = result.structuredContent.tasks as MappedTask[]
            // Default desc order for priority: p1 first (lowest number = highest priority)
            // With desc multiplier, lower values come first
            expect(tasks).toHaveLength(3)
            expect(tasks[0]?.priority).toBe('p1')
            expect(tasks[1]?.priority).toBe('p2')
            expect(tasks[2]?.priority).toBe('p4')
            expect(result.textContent).toContain('sorted by: priority (desc)')
        })

        it('should sort by priority ascending (p4 first)', async () => {
            const mockTasks = [
                createMappedTask({ id: '1', content: 'Low priority', priority: 'p4' }),
                createMappedTask({ id: '2', content: 'High priority', priority: 'p1' }),
                createMappedTask({ id: '3', content: 'Medium priority', priority: 'p2' }),
            ]
            const mockResponse = { tasks: mockTasks, nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await findTasksByFilter.execute(
                { filter: '##Work', sortBy: 'priority', sortOrder: 'asc', limit: 10 },
                mockTodoistApi,
            )

            const tasks = result.structuredContent.tasks as MappedTask[]
            expect(tasks).toHaveLength(3)
            expect(tasks[0]?.priority).toBe('p4')
            expect(tasks[1]?.priority).toBe('p2')
            expect(tasks[2]?.priority).toBe('p1')
        })

        it('should sort by due_date (soonest first by default, no-date at end)', async () => {
            const mockTasks = [
                createMappedTask({ id: '1', content: 'No due date', dueDate: undefined }),
                createMappedTask({ id: '2', content: 'Later task', dueDate: '2025-08-25' }),
                createMappedTask({ id: '3', content: 'Earlier task', dueDate: '2025-08-15' }),
            ]
            const mockResponse = { tasks: mockTasks, nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await findTasksByFilter.execute(
                { filter: '##Work', sortBy: 'due_date', limit: 10 },
                mockTodoistApi,
            )

            const tasks = result.structuredContent.tasks as MappedTask[]
            expect(tasks).toHaveLength(3)
            expect(tasks[0]?.dueDate).toBe('2025-08-15')
            expect(tasks[1]?.dueDate).toBe('2025-08-25')
            expect(tasks[2]?.dueDate).toBeUndefined()
            expect(result.textContent).toContain('sorted by: due_date (asc)')
        })

        it('should sort by due_date descending (latest first)', async () => {
            const mockTasks = [
                createMappedTask({ id: '1', content: 'No due date', dueDate: undefined }),
                createMappedTask({ id: '2', content: 'Earlier task', dueDate: '2025-08-15' }),
                createMappedTask({ id: '3', content: 'Later task', dueDate: '2025-08-25' }),
            ]
            const mockResponse = { tasks: mockTasks, nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await findTasksByFilter.execute(
                { filter: '##Work', sortBy: 'due_date', sortOrder: 'desc', limit: 10 },
                mockTodoistApi,
            )

            const tasks = result.structuredContent.tasks as MappedTask[]
            expect(tasks).toHaveLength(3)
            expect(tasks[0]?.dueDate).toBe('2025-08-25')
            expect(tasks[1]?.dueDate).toBe('2025-08-15')
            expect(tasks[2]?.dueDate).toBeUndefined()
        })

        it('should sort by project (alphabetical by default)', async () => {
            const mockTasks = [
                createMappedTask({ id: '1', content: 'Task C', projectId: 'project-c' }),
                createMappedTask({ id: '2', content: 'Task A', projectId: 'project-a' }),
                createMappedTask({ id: '3', content: 'Task B', projectId: 'project-b' }),
            ]
            const mockResponse = { tasks: mockTasks, nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await findTasksByFilter.execute(
                { filter: '##Work', sortBy: 'project', limit: 10 },
                mockTodoistApi,
            )

            const tasks = result.structuredContent.tasks as MappedTask[]
            expect(tasks).toHaveLength(3)
            expect(tasks[0]?.projectId).toBe('project-a')
            expect(tasks[1]?.projectId).toBe('project-b')
            expect(tasks[2]?.projectId).toBe('project-c')
            expect(result.textContent).toContain('sorted by: project (asc)')
        })

        it('should sort by created (newest first by default)', async () => {
            const mockTasks = [
                createMappedTask({ id: 'aaa', content: 'Older task' }),
                createMappedTask({ id: 'zzz', content: 'Newer task' }),
                createMappedTask({ id: 'mmm', content: 'Middle task' }),
            ]
            const mockResponse = { tasks: mockTasks, nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await findTasksByFilter.execute(
                { filter: '##Work', sortBy: 'created', limit: 10 },
                mockTodoistApi,
            )

            const tasks = result.structuredContent.tasks as MappedTask[]
            // Descending order: highest/latest ID first
            expect(tasks).toHaveLength(3)
            expect(tasks[0]?.id).toBe('zzz')
            expect(tasks[1]?.id).toBe('mmm')
            expect(tasks[2]?.id).toBe('aaa')
            expect(result.textContent).toContain('sorted by: created (desc)')
        })

        it('should not sort when sortBy is "default"', async () => {
            const mockTasks = [
                createMappedTask({ id: '3', content: 'Task 3' }),
                createMappedTask({ id: '1', content: 'Task 1' }),
                createMappedTask({ id: '2', content: 'Task 2' }),
            ]
            const mockResponse = { tasks: mockTasks, nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await findTasksByFilter.execute(
                { filter: '##Work', sortBy: 'default', limit: 10 },
                mockTodoistApi,
            )

            const tasks = result.structuredContent.tasks as MappedTask[]
            // Order should be preserved
            expect(tasks).toHaveLength(3)
            expect(tasks[0]?.id).toBe('3')
            expect(tasks[1]?.id).toBe('1')
            expect(tasks[2]?.id).toBe('2')
            expect(result.textContent).not.toContain('sorted by')
        })

        it('should not sort when sortBy is not provided', async () => {
            const mockTasks = [
                createMappedTask({ id: '3', content: 'Task 3' }),
                createMappedTask({ id: '1', content: 'Task 1' }),
            ]
            const mockResponse = { tasks: mockTasks, nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await findTasksByFilter.execute(
                { filter: '##Work', limit: 10 },
                mockTodoistApi,
            )

            const tasks = result.structuredContent.tasks as MappedTask[]
            // Order should be preserved
            expect(tasks).toHaveLength(2)
            expect(tasks[0]?.id).toBe('3')
            expect(tasks[1]?.id).toBe('1')
        })
    })

    describe('empty results handling', () => {
        it('should handle empty results gracefully', async () => {
            const mockResponse = { tasks: [], nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await findTasksByFilter.execute(
                { filter: '##NonExistent', limit: 10 },
                mockTodoistApi,
            )

            expect(result.structuredContent.tasks).toHaveLength(0)
            expect(result.structuredContent.totalCount).toBe(0)
            expect(result.structuredContent.hasMore).toBe(false)
            expect(result.textContent).toContain('Verify filter syntax is correct')
            expect(result.textContent).toMatchSnapshot()
        })

        it('should provide helpful hints for empty ## filter results', async () => {
            const mockResponse = { tasks: [], nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await findTasksByFilter.execute(
                { filter: '##Work', limit: 10 },
                mockTodoistApi,
            )

            expect(result.textContent).toContain(
                'Ensure the parent project exists and has sub-projects',
            )
        })

        it('should provide helpful hints for empty # filter results', async () => {
            const mockResponse = { tasks: [], nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await findTasksByFilter.execute(
                { filter: '#InvalidProject', limit: 10 },
                mockTodoistApi,
            )

            expect(result.textContent).toContain('Verify the project name is correct')
        })
    })

    describe('error handling', () => {
        it('should propagate invalid filter error', async () => {
            mockGetTasksByFilter.mockRejectedValue(new Error(TEST_ERRORS.INVALID_FILTER))

            await expect(
                findTasksByFilter.execute({ filter: 'invalid((syntax', limit: 10 }, mockTodoistApi),
            ).rejects.toThrow(TEST_ERRORS.INVALID_FILTER)
        })

        it('should propagate API rate limit error', async () => {
            mockGetTasksByFilter.mockRejectedValue(new Error(TEST_ERRORS.API_RATE_LIMIT))

            await expect(
                findTasksByFilter.execute({ filter: '##Work', limit: 10 }, mockTodoistApi),
            ).rejects.toThrow(TEST_ERRORS.API_RATE_LIMIT)
        })

        it('should throw error when responsible user cannot be resolved', async () => {
            mockResolveUserNameToId.mockResolvedValue(null)

            await expect(
                findTasksByFilter.execute(
                    { filter: '##Work', responsibleUser: 'nonexistent@example.com', limit: 10 },
                    mockTodoistApi,
                ),
            ).rejects.toThrow(
                'Could not find user: "nonexistent@example.com". Make sure the user is a collaborator on a shared project.',
            )
        })
    })

    describe('output format', () => {
        it('should return correct structured content', async () => {
            const mockTasks = [createMappedTask({ content: 'Test task' })]
            const mockResponse = { tasks: mockTasks, nextCursor: 'next-cursor' }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await findTasksByFilter.execute(
                { filter: '##Work', limit: 10 },
                mockTodoistApi,
            )

            expect(result.structuredContent).toEqual({
                tasks: mockTasks,
                nextCursor: 'next-cursor',
                totalCount: 1,
                hasMore: true,
                appliedFilter: '##Work',
            })
        })

        it('should include appliedFilter showing the final constructed query', async () => {
            mockResolveUserNameToId.mockResolvedValue({
                userId: 'user-123',
                displayName: 'John Doe',
                email: 'john@example.com',
            })

            const mockResponse = { tasks: [], nextCursor: null }
            mockGetTasksByFilter.mockResolvedValue(mockResponse)

            const result = await findTasksByFilter.execute(
                {
                    filter: '##Work',
                    labels: ['urgent'],
                    responsibleUser: 'john@example.com',
                    limit: 10,
                },
                mockTodoistApi,
            )

            expect(result.structuredContent.appliedFilter).toBe(
                '##Work & (@urgent) & assigned to: john@example.com',
            )
        })
    })
})
