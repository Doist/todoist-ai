import type { TodoistApi } from '@doist/todoist-api-typescript'
import { type Mocked, vi } from 'vitest'
import { createMockProject, createMockTask, TEST_IDS } from '../../utils/test-helpers.js'
import { ToolNames } from '../../utils/tool-names.js'
import { fetch } from '../fetch.js'

// Mock the Todoist API
const mockTodoistApi = {
    getTask: vi.fn(),
    getProject: vi.fn(),
} as unknown as Mocked<TodoistApi>

const { FETCH } = ToolNames

describe(`${FETCH} tool`, () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('fetching tasks', () => {
        it('should fetch a task by composite ID and return full content', async () => {
            const mockTask = createMockTask({
                id: TEST_IDS.TASK_1,
                content: 'Important meeting with team',
                description: 'Discuss project roadmap and timeline',
                labels: ['work', 'urgent'],
                priority: 'p3',
                projectId: TEST_IDS.PROJECT_WORK,
                sectionId: TEST_IDS.SECTION_1,
                due: {
                    date: '2025-10-15',
                    isRecurring: false,
                    datetime: null,
                    string: '2025-10-15',
                    timezone: null,
                    lang: 'en',
                },
            })

            mockTodoistApi.getTask.mockResolvedValue(mockTask)

            const result = await fetch.execute({ id: `task:${TEST_IDS.TASK_1}` }, mockTodoistApi)

            // Verify API was called correctly
            expect(mockTodoistApi.getTask).toHaveBeenCalledWith(TEST_IDS.TASK_1)

            // Verify structured content
            expect(result.structuredContent).toMatchObject({
                id: `task:${TEST_IDS.TASK_1}`,
                title: 'Important meeting with team',
                text: 'Important meeting with team\n\nDescription: Discuss project roadmap and timeline\nDue: 2025-10-15\nLabels: work, urgent',
                url: `https://app.todoist.com/app/task/${TEST_IDS.TASK_1}`,
                metadata: {
                    priority: 'p3',
                    projectId: TEST_IDS.PROJECT_WORK,
                    sectionId: TEST_IDS.SECTION_1,
                    recurring: false,
                    checked: false,
                },
            })

            // Verify human-readable text
            expect(result.textContent).toBe(
                `Fetched task: Important meeting with team • id=task:${TEST_IDS.TASK_1} • url=https://app.todoist.com/app/task/${TEST_IDS.TASK_1}`,
            )
        })

        it('should fetch a task without optional fields', async () => {
            const mockTask = createMockTask({
                id: TEST_IDS.TASK_2,
                content: 'Simple task',
                description: '',
                labels: [],
                due: null,
            })

            mockTodoistApi.getTask.mockResolvedValue(mockTask)

            const result = await fetch.execute({ id: `task:${TEST_IDS.TASK_2}` }, mockTodoistApi)

            expect(result.structuredContent?.title).toBe('Simple task')
            expect(result.structuredContent?.text).toBe('Simple task')
            expect(result.structuredContent?.metadata).toMatchObject({
                priority: 'p4',
                projectId: TEST_IDS.PROJECT_TEST,
                recurring: false,
                checked: false,
            })
        })

        it('should handle tasks with recurring due dates', async () => {
            const mockTask = createMockTask({
                id: TEST_IDS.TASK_3,
                content: 'Weekly meeting',
                due: {
                    date: '2025-10-15',
                    isRecurring: true,
                    datetime: null,
                    string: 'every monday',
                    timezone: null,
                    lang: 'en',
                },
            })

            mockTodoistApi.getTask.mockResolvedValue(mockTask)

            const result = await fetch.execute({ id: `task:${TEST_IDS.TASK_3}` }, mockTodoistApi)

            expect(result.structuredContent?.metadata?.recurring).toBe('every monday')
        })

        it('should handle tasks with duration', async () => {
            const mockTask = createMockTask({
                id: TEST_IDS.TASK_1,
                content: 'Task with duration',
                duration: {
                    amount: 90,
                    unit: 'minute',
                },
            })

            mockTodoistApi.getTask.mockResolvedValue(mockTask)

            const result = await fetch.execute({ id: `task:${TEST_IDS.TASK_1}` }, mockTodoistApi)

            expect(result.structuredContent?.metadata?.duration).toBe('1h30m')
        })

        it('should handle tasks with assignments', async () => {
            const mockTask = createMockTask({
                id: TEST_IDS.TASK_1,
                content: 'Assigned task',
                responsibleUid: 'user-123',
                assignedByUid: 'user-456',
            })

            mockTodoistApi.getTask.mockResolvedValue(mockTask)

            const result = await fetch.execute({ id: `task:${TEST_IDS.TASK_1}` }, mockTodoistApi)

            expect(result.structuredContent?.metadata?.responsibleUid).toBe('user-123')
            expect(result.structuredContent?.metadata?.assignedByUid).toBe('user-456')
        })
    })

    describe('fetching projects', () => {
        it('should fetch a project by composite ID and return full content', async () => {
            const mockProject = createMockProject({
                id: TEST_IDS.PROJECT_WORK,
                name: 'Work Project',
                color: 'blue',
                isFavorite: true,
                isShared: true,
                viewStyle: 'board',
                parentId: null,
                inboxProject: false,
            })

            mockTodoistApi.getProject.mockResolvedValue(mockProject)

            const result = await fetch.execute(
                { id: `project:${TEST_IDS.PROJECT_WORK}` },
                mockTodoistApi,
            )

            // Verify API was called correctly
            expect(mockTodoistApi.getProject).toHaveBeenCalledWith(TEST_IDS.PROJECT_WORK)

            // Verify structured content
            expect(result.structuredContent).toMatchObject({
                id: `project:${TEST_IDS.PROJECT_WORK}`,
                title: 'Work Project',
                text: 'Work Project\n\nShared project\nFavorite: Yes',
                url: `https://app.todoist.com/app/project/${TEST_IDS.PROJECT_WORK}`,
                metadata: {
                    color: 'blue',
                    isFavorite: true,
                    isShared: true,
                    inboxProject: false,
                    viewStyle: 'board',
                },
            })

            // Verify human-readable text
            expect(result.textContent).toBe(
                `Fetched project: Work Project • id=project:${TEST_IDS.PROJECT_WORK} • url=https://app.todoist.com/app/project/${TEST_IDS.PROJECT_WORK}`,
            )
        })

        it('should fetch a project without optional flags', async () => {
            const mockProject = createMockProject({
                id: TEST_IDS.PROJECT_TEST,
                name: 'Simple Project',
                isFavorite: false,
                isShared: false,
            })

            mockTodoistApi.getProject.mockResolvedValue(mockProject)

            const result = await fetch.execute(
                { id: `project:${TEST_IDS.PROJECT_TEST}` },
                mockTodoistApi,
            )

            expect(result.structuredContent?.title).toBe('Simple Project')
            expect(result.structuredContent?.text).toBe('Simple Project')
            expect(result.structuredContent?.metadata?.isFavorite).toBe(false)
            expect(result.structuredContent?.metadata?.isShared).toBe(false)
        })

        it('should fetch inbox project', async () => {
            const mockProject = createMockProject({
                id: TEST_IDS.PROJECT_INBOX,
                name: 'Inbox',
                inboxProject: true,
            })

            mockTodoistApi.getProject.mockResolvedValue(mockProject)

            const result = await fetch.execute(
                { id: `project:${TEST_IDS.PROJECT_INBOX}` },
                mockTodoistApi,
            )

            expect(result.structuredContent?.metadata?.inboxProject).toBe(true)
        })

        it('should fetch project with parent ID', async () => {
            const mockProject = createMockProject({
                id: 'sub-project-id',
                name: 'Sub Project',
                parentId: TEST_IDS.PROJECT_WORK,
            })

            mockTodoistApi.getProject.mockResolvedValue(mockProject)

            const result = await fetch.execute({ id: 'project:sub-project-id' }, mockTodoistApi)

            expect(result.structuredContent?.metadata?.parentId).toBe(TEST_IDS.PROJECT_WORK)
        })
    })

    describe('error handling', () => {
        it('should throw error for invalid ID format (missing colon)', async () => {
            await expect(fetch.execute({ id: 'invalid-id' }, mockTodoistApi)).rejects.toThrow(
                'Invalid ID format',
            )
        })

        it('should throw error for invalid ID format (missing type)', async () => {
            await expect(fetch.execute({ id: ':8485093748' }, mockTodoistApi)).rejects.toThrow(
                'Invalid ID format',
            )
        })

        it('should throw error for invalid ID format (missing object ID)', async () => {
            await expect(fetch.execute({ id: 'task:' }, mockTodoistApi)).rejects.toThrow(
                'Invalid ID format',
            )
        })

        it('should throw error for invalid type', async () => {
            await expect(fetch.execute({ id: 'section:123' }, mockTodoistApi)).rejects.toThrow(
                'Invalid ID format',
            )
        })

        it('should throw error for task fetch failure', async () => {
            mockTodoistApi.getTask.mockRejectedValue(new Error('Task not found'))

            await expect(
                fetch.execute({ id: `task:${TEST_IDS.TASK_1}` }, mockTodoistApi),
            ).rejects.toThrow('Task not found')
        })

        it('should throw error for project fetch failure', async () => {
            mockTodoistApi.getProject.mockRejectedValue(new Error('Project not found'))

            await expect(
                fetch.execute({ id: `project:${TEST_IDS.PROJECT_WORK}` }, mockTodoistApi),
            ).rejects.toThrow('Project not found')
        })
    })

    describe('human-readable text content', () => {
        it('should return human-readable text for a task', async () => {
            const mockTask = createMockTask({ id: TEST_IDS.TASK_1, content: 'Test Task' })
            mockTodoistApi.getTask.mockResolvedValue(mockTask)

            const result = await fetch.execute({ id: `task:${TEST_IDS.TASK_1}` }, mockTodoistApi)

            expect(result.textContent).toContain('Fetched task:')
            expect(result.textContent).toContain('Test Task')
            expect(result.textContent).toContain(`id=task:${TEST_IDS.TASK_1}`)
            expect(result.textContent).toContain('url=')
        })

        it('should return human-readable text for a project', async () => {
            const mockProject = createMockProject({
                id: TEST_IDS.PROJECT_WORK,
                name: 'Test Project',
            })
            mockTodoistApi.getProject.mockResolvedValue(mockProject)

            const result = await fetch.execute(
                { id: `project:${TEST_IDS.PROJECT_WORK}` },
                mockTodoistApi,
            )

            expect(result.textContent).toContain('Fetched project:')
            expect(result.textContent).toContain('Test Project')
            expect(result.textContent).toContain(`id=project:${TEST_IDS.PROJECT_WORK}`)
            expect(result.textContent).toContain('url=')
        })

        it('should include all required fields (id, title, text, url) in structuredContent', async () => {
            const mockTask = createMockTask({ id: TEST_IDS.TASK_1, content: 'Test' })
            mockTodoistApi.getTask.mockResolvedValue(mockTask)

            const result = await fetch.execute({ id: `task:${TEST_IDS.TASK_1}` }, mockTodoistApi)

            expect(result.structuredContent).toHaveProperty('id')
            expect(result.structuredContent).toHaveProperty('title')
            expect(result.structuredContent).toHaveProperty('text')
            expect(result.structuredContent).toHaveProperty('url')
            expect(typeof result.structuredContent?.id).toBe('string')
            expect(typeof result.structuredContent?.title).toBe('string')
            expect(typeof result.structuredContent?.text).toBe('string')
            expect(typeof result.structuredContent?.url).toBe('string')
        })

        it('should include optional metadata field in structuredContent', async () => {
            const mockTask = createMockTask({ id: TEST_IDS.TASK_1, content: 'Test' })
            mockTodoistApi.getTask.mockResolvedValue(mockTask)

            const result = await fetch.execute({ id: `task:${TEST_IDS.TASK_1}` }, mockTodoistApi)

            expect(result.structuredContent).toHaveProperty('metadata')
            expect(typeof result.structuredContent?.metadata).toBe('object')
        })
    })
})
