import type { PersonalProject, Section, Task, TodoistApi } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import { overview } from '../overview.js'
import {
    TEST_ERRORS,
    TEST_IDS,
    createMockProject,
    createMockSection,
    createMockTask,
    extractTextContent,
} from '../test-helpers.js'

// Mock the Todoist API
const mockTodoistApi = {
    getProjects: jest.fn(),
    getProject: jest.fn(),
    getSections: jest.fn(),
    getTasks: jest.fn(),
} as unknown as jest.Mocked<TodoistApi>

describe('overview tool', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('account overview (no projectId)', () => {
        it('should generate account overview with projects and sections', async () => {
            const mockProjects: PersonalProject[] = [
                createMockProject({
                    id: TEST_IDS.PROJECT_INBOX,
                    name: 'Inbox',
                    color: 'grey',
                    inboxProject: true,
                    childOrder: 0,
                }),
                createMockProject({
                    id: TEST_IDS.PROJECT_TEST,
                    name: 'test-abc123def456-project',
                    childOrder: 1,
                }),
            ]

            const mockSections: Section[] = [
                createMockSection({
                    id: TEST_IDS.SECTION_1,
                    projectId: TEST_IDS.PROJECT_TEST,
                    name: 'test-section',
                }),
            ]

            mockTodoistApi.getProjects.mockResolvedValue({
                results: mockProjects,
                nextCursor: null,
            })
            mockTodoistApi.getSections.mockImplementation(({ projectId }) => {
                if (projectId === TEST_IDS.PROJECT_TEST) {
                    return Promise.resolve({ results: mockSections, nextCursor: null })
                }
                return Promise.resolve({ results: [], nextCursor: null })
            })

            const result = await overview.execute({}, mockTodoistApi)

            expect(mockTodoistApi.getProjects).toHaveBeenCalledWith({})
            expect(mockTodoistApi.getSections).toHaveBeenCalledTimes(2) // Once for each project

            // Test text content with snapshot
            expect(extractTextContent(result)).toMatchSnapshot()

            // Test structured content sanity checks
            const { structuredContent } = result
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    type: 'account_overview',
                    inbox: expect.objectContaining({
                        id: TEST_IDS.PROJECT_INBOX,
                        name: 'Inbox',
                        sections: expect.any(Array),
                    }),
                    projects: expect.any(Array),
                    totalProjects: 2,
                    totalSections: 1,
                    hasNestedProjects: false,
                }),
            )
            expect(structuredContent.projects).toHaveLength(1) // Only non-inbox projects
        })

        it('should handle empty projects list', async () => {
            mockTodoistApi.getProjects.mockResolvedValue({ results: [], nextCursor: null })

            const result = await overview.execute({}, mockTodoistApi)

            // Test text content with snapshot
            expect(extractTextContent(result)).toMatchSnapshot()

            // Test structured content sanity checks
            const { structuredContent } = result
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    type: 'account_overview',
                    inbox: null,
                    projects: [],
                    totalProjects: 0,
                    totalSections: 0,
                    hasNestedProjects: false,
                }),
            )
        })
    })

    describe('project overview (with projectId)', () => {
        it('should generate detailed project overview with tasks', async () => {
            const mockProject = createMockProject({
                id: TEST_IDS.PROJECT_TEST,
                name: 'test-abc123def456-project',
            })

            const mockSections: Section[] = [
                createMockSection({
                    id: TEST_IDS.SECTION_1,
                    projectId: TEST_IDS.PROJECT_TEST,
                    name: 'To Do',
                }),
                createMockSection({
                    id: TEST_IDS.SECTION_2,
                    projectId: TEST_IDS.PROJECT_TEST,
                    sectionOrder: 2,
                    name: 'In Progress',
                }),
            ]

            const mockTasks: Task[] = [
                createMockTask({
                    id: TEST_IDS.TASK_1,
                    content: 'Task without section',
                    projectId: TEST_IDS.PROJECT_TEST,
                    deadline: {
                        date: '2025-08-15',
                        lang: 'en',
                    },
                    responsibleUid: TEST_IDS.USER_ID,
                    assignedByUid: TEST_IDS.USER_ID,
                }),
                createMockTask({
                    id: TEST_IDS.TASK_2,
                    content: 'Task in To Do section',
                    description: 'Important task',
                    labels: ['work'],
                    priority: 2,
                    projectId: TEST_IDS.PROJECT_TEST,
                    sectionId: TEST_IDS.SECTION_1,
                }),
                createMockTask({
                    id: TEST_IDS.TASK_3,
                    content: 'Subtask of important task',
                    childOrder: 2,
                    projectId: TEST_IDS.PROJECT_TEST,
                    sectionId: TEST_IDS.SECTION_1,
                    parentId: TEST_IDS.TASK_2,
                }),
            ]

            mockTodoistApi.getProject.mockResolvedValue(mockProject)
            mockTodoistApi.getSections.mockResolvedValue({
                results: mockSections,
                nextCursor: null,
            })
            mockTodoistApi.getTasks.mockResolvedValue({
                results: mockTasks,
                nextCursor: null,
            })

            const result = await overview.execute(
                { projectId: TEST_IDS.PROJECT_TEST },
                mockTodoistApi,
            )

            expect(mockTodoistApi.getProject).toHaveBeenCalledWith(TEST_IDS.PROJECT_TEST)
            expect(mockTodoistApi.getSections).toHaveBeenCalledWith({
                projectId: TEST_IDS.PROJECT_TEST,
            })
            expect(mockTodoistApi.getTasks).toHaveBeenCalledWith({
                projectId: TEST_IDS.PROJECT_TEST,
                limit: 50,
                cursor: undefined,
            })

            // Test text content with snapshot
            expect(extractTextContent(result)).toMatchSnapshot()

            // Test structured content sanity checks
            const { structuredContent } = result
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    type: 'project_overview',
                    project: expect.objectContaining({
                        id: TEST_IDS.PROJECT_TEST,
                        name: 'test-abc123def456-project',
                    }),
                    sections: expect.any(Array),
                    tasks: expect.any(Array),
                    stats: expect.objectContaining({
                        totalTasks: 3,
                        totalSections: 2,
                        tasksWithoutSection: 1,
                    }),
                }),
            )
            expect(structuredContent.sections).toHaveLength(2)
            expect(structuredContent.tasks).toHaveLength(3)
        })

        it('should handle project with no tasks', async () => {
            const mockProject = createMockProject({
                id: 'empty-project-id',
                name: 'Empty Project',
                color: 'blue',
            })

            mockTodoistApi.getProject.mockResolvedValue(mockProject)
            mockTodoistApi.getSections.mockResolvedValue({ results: [], nextCursor: null })
            mockTodoistApi.getTasks.mockResolvedValue({ results: [], nextCursor: null })

            const result = await overview.execute({ projectId: 'empty-project-id' }, mockTodoistApi)

            // Test text content with snapshot
            expect(extractTextContent(result)).toMatchSnapshot()

            // Test structured content sanity checks
            const { structuredContent } = result
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    type: 'project_overview',
                    project: expect.objectContaining({
                        id: 'empty-project-id',
                        name: 'Empty Project',
                    }),
                    sections: [],
                    tasks: [],
                    stats: expect.objectContaining({
                        totalTasks: 0,
                        totalSections: 0,
                        tasksWithoutSection: 0,
                    }),
                }),
            )
        })
    })

    describe('error handling', () => {
        it.each([
            {
                scenario: 'project retrieval',
                error: 'API Error: Project not found',
                params: { projectId: 'non-existent-project' },
                mockMethod: 'getProject' as const,
            },
            {
                scenario: 'projects list',
                error: TEST_ERRORS.API_UNAUTHORIZED,
                params: {},
                mockMethod: 'getProjects' as const,
            },
        ])('should propagate API errors for $scenario', async ({ error, params, mockMethod }) => {
            const apiError = new Error(error)
            mockTodoistApi[mockMethod].mockRejectedValue(apiError)

            await expect(overview.execute(params, mockTodoistApi)).rejects.toThrow(error)
        })
    })
})
