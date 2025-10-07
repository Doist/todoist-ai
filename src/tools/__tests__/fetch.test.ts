import type { TodoistApi } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import { createMockProject, createMockTask, TEST_IDS } from '../../utils/test-helpers.js'
import { ToolNames } from '../../utils/tool-names.js'
import { fetch } from '../fetch.js'

// Mock the Todoist API
const mockTodoistApi = {
    getTask: jest.fn(),
    getProject: jest.fn(),
} as unknown as jest.Mocked<TodoistApi>

const { FETCH } = ToolNames

describe(`${FETCH} tool`, () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('fetching tasks', () => {
        it('should fetch a task by composite ID and return full content', async () => {
            const mockTask = createMockTask({
                id: TEST_IDS.TASK_1,
                content: 'Important meeting with team',
                description: 'Discuss project roadmap and timeline',
                labels: ['work', 'urgent'],
                priority: 2,
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

            // Verify result structure
            expect(result.content).toHaveLength(1)
            expect(result.content[0]?.type).toBe('text')

            // Parse the JSON response
            const jsonResponse = JSON.parse(result.content[0]?.text ?? '{}')
            expect(jsonResponse).toEqual({
                id: `task:${TEST_IDS.TASK_1}`,
                title: 'Important meeting with team',
                text: 'Important meeting with team\n\nDescription: Discuss project roadmap and timeline\nDue: 2025-10-15\nLabels: work, urgent',
                url: `https://app.todoist.com/app/task/${TEST_IDS.TASK_1}`,
                metadata: {
                    priority: 2,
                    projectId: TEST_IDS.PROJECT_WORK,
                    sectionId: TEST_IDS.SECTION_1,
                    parentId: null,
                    recurring: false,
                    duration: null,
                    responsibleUid: null,
                    assignedByUid: null,
                },
            })
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

            const jsonResponse = JSON.parse(result.content[0]?.text ?? '{}')
            expect(jsonResponse.title).toBe('Simple task')
            expect(jsonResponse.text).toBe('Simple task')
            expect(jsonResponse.metadata).toEqual({
                priority: 1,
                projectId: TEST_IDS.PROJECT_TEST,
                sectionId: null,
                parentId: null,
                recurring: false,
                duration: null,
                responsibleUid: null,
                assignedByUid: null,
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

            const jsonResponse = JSON.parse(result.content[0]?.text ?? '{}')
            expect(jsonResponse.metadata.recurring).toBe('every monday')
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

            const jsonResponse = JSON.parse(result.content[0]?.text ?? '{}')
            expect(jsonResponse.metadata.duration).toBe('1h30m')
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

            const jsonResponse = JSON.parse(result.content[0]?.text ?? '{}')
            expect(jsonResponse.metadata.responsibleUid).toBe('user-123')
            expect(jsonResponse.metadata.assignedByUid).toBe('user-456')
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

            // Verify result structure
            expect(result.content).toHaveLength(1)
            expect(result.content[0]?.type).toBe('text')

            // Parse the JSON response
            const jsonResponse = JSON.parse(result.content[0]?.text ?? '{}')
            expect(jsonResponse).toEqual({
                id: `project:${TEST_IDS.PROJECT_WORK}`,
                title: 'Work Project',
                text: 'Work Project\n\nShared project\nFavorite: Yes',
                url: `https://app.todoist.com/app/project/${TEST_IDS.PROJECT_WORK}`,
                metadata: {
                    color: 'blue',
                    isFavorite: true,
                    isShared: true,
                    parentId: null,
                    inboxProject: false,
                    viewStyle: 'board',
                },
            })
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

            const jsonResponse = JSON.parse(result.content[0]?.text ?? '{}')
            expect(jsonResponse.title).toBe('Simple Project')
            expect(jsonResponse.text).toBe('Simple Project')
            expect(jsonResponse.metadata.isFavorite).toBe(false)
            expect(jsonResponse.metadata.isShared).toBe(false)
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

            const jsonResponse = JSON.parse(result.content[0]?.text ?? '{}')
            expect(jsonResponse.metadata.inboxProject).toBe(true)
        })

        it('should fetch project with parent ID', async () => {
            const mockProject = createMockProject({
                id: 'sub-project-id',
                name: 'Sub Project',
                parentId: TEST_IDS.PROJECT_WORK,
            })

            mockTodoistApi.getProject.mockResolvedValue(mockProject)

            const result = await fetch.execute({ id: 'project:sub-project-id' }, mockTodoistApi)

            const jsonResponse = JSON.parse(result.content[0]?.text ?? '{}')
            expect(jsonResponse.metadata.parentId).toBe(TEST_IDS.PROJECT_WORK)
        })
    })

    describe('error handling', () => {
        it('should return error response for invalid ID format (missing colon)', async () => {
            const result = await fetch.execute({ id: 'invalid-id' }, mockTodoistApi)

            expect(result.isError).toBe(true)
            expect(result.content[0]?.text).toContain('Invalid ID format')
        })

        it('should return error response for invalid ID format (missing type)', async () => {
            const result = await fetch.execute({ id: ':8485093748' }, mockTodoistApi)

            expect(result.isError).toBe(true)
            expect(result.content[0]?.text).toContain('Invalid ID format')
        })

        it('should return error response for invalid ID format (missing object ID)', async () => {
            const result = await fetch.execute({ id: 'task:' }, mockTodoistApi)

            expect(result.isError).toBe(true)
            expect(result.content[0]?.text).toContain('Invalid ID format')
        })

        it('should return error response for invalid type', async () => {
            const result = await fetch.execute({ id: 'section:123' }, mockTodoistApi)

            expect(result.isError).toBe(true)
            expect(result.content[0]?.text).toContain('Invalid ID format')
        })

        it('should return error response for task fetch failure', async () => {
            mockTodoistApi.getTask.mockRejectedValue(new Error('Task not found'))

            const result = await fetch.execute({ id: `task:${TEST_IDS.TASK_1}` }, mockTodoistApi)

            expect(result.isError).toBe(true)
            expect(result.content[0]?.text).toBe('Task not found')
        })

        it('should return error response for project fetch failure', async () => {
            mockTodoistApi.getProject.mockRejectedValue(new Error('Project not found'))

            const result = await fetch.execute(
                { id: `project:${TEST_IDS.PROJECT_WORK}` },
                mockTodoistApi,
            )

            expect(result.isError).toBe(true)
            expect(result.content[0]?.text).toBe('Project not found')
        })
    })

    describe('OpenAI MCP spec compliance', () => {
        it('should return exactly one content item with type "text"', async () => {
            const mockTask = createMockTask({ id: TEST_IDS.TASK_1, content: 'Test' })
            mockTodoistApi.getTask.mockResolvedValue(mockTask)

            const result = await fetch.execute({ id: `task:${TEST_IDS.TASK_1}` }, mockTodoistApi)

            expect(result.content).toHaveLength(1)
            expect(result.content[0]?.type).toBe('text')
        })

        it('should return valid JSON string in text field', async () => {
            const mockTask = createMockTask({ id: TEST_IDS.TASK_1, content: 'Test' })
            mockTodoistApi.getTask.mockResolvedValue(mockTask)

            const result = await fetch.execute({ id: `task:${TEST_IDS.TASK_1}` }, mockTodoistApi)

            expect(() => JSON.parse(result.content[0]?.text ?? '{}')).not.toThrow()
        })

        it('should include all required fields (id, title, text, url)', async () => {
            const mockTask = createMockTask({ id: TEST_IDS.TASK_1, content: 'Test' })
            mockTodoistApi.getTask.mockResolvedValue(mockTask)

            const result = await fetch.execute({ id: `task:${TEST_IDS.TASK_1}` }, mockTodoistApi)

            const jsonResponse = JSON.parse(result.content[0]?.text ?? '{}')
            expect(jsonResponse).toHaveProperty('id')
            expect(jsonResponse).toHaveProperty('title')
            expect(jsonResponse).toHaveProperty('text')
            expect(jsonResponse).toHaveProperty('url')
            expect(typeof jsonResponse.id).toBe('string')
            expect(typeof jsonResponse.title).toBe('string')
            expect(typeof jsonResponse.text).toBe('string')
            expect(typeof jsonResponse.url).toBe('string')
        })

        it('should include optional metadata field', async () => {
            const mockTask = createMockTask({ id: TEST_IDS.TASK_1, content: 'Test' })
            mockTodoistApi.getTask.mockResolvedValue(mockTask)

            const result = await fetch.execute({ id: `task:${TEST_IDS.TASK_1}` }, mockTodoistApi)

            const jsonResponse = JSON.parse(result.content[0]?.text ?? '{}')
            expect(jsonResponse).toHaveProperty('metadata')
            expect(typeof jsonResponse.metadata).toBe('object')
        })
    })
})
