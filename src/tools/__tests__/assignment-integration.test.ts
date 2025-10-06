import type { Task, TodoistApi } from '@doist/todoist-api-typescript'
import {
    createMockProject,
    extractStructuredContent,
    extractTextContent,
} from '../../utils/test-helpers.js'
import { addTasks } from '../add-tasks.js'
import { findProjectCollaborators } from '../find-project-collaborators.js'
import { manageAssignments } from '../manage-assignments.js'
import { updateTasks } from '../update-tasks.js'

// Mock the assignment validator
jest.mock('../../utils/assignment-validator.js', () => ({
    assignmentValidator: {
        validateTaskCreationAssignment: jest.fn(),
        validateTaskUpdateAssignment: jest.fn(),
        validateBulkAssignment: jest.fn(),
    },
}))

// Mock the user resolver
jest.mock('../../utils/user-resolver.js', () => ({
    userResolver: {
        resolveUser: jest.fn(),
        getProjectCollaborators: jest.fn(),
    },
}))

describe('Assignment Integration Tests', () => {
    let mockTodoistApi: jest.Mocked<TodoistApi>

    const mockValidUser = {
        userId: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
    }

    const mockTask: Task = {
        id: 'task-123',
        content: 'Test task',
        projectId: 'project-123',
        sectionId: null,
        parentId: null,
        priority: 1,
        labels: [],
        description: '',
        url: 'https://todoist.com/showTask?id=task-123',
        noteCount: 0,
        addedByUid: 'creator-123',
        addedAt: new Date().toISOString(),
        deadline: null,
        responsibleUid: null,
        assignedByUid: null,
        isCollapsed: false,
        isDeleted: false,
        duration: null,
        checked: false,
        updatedAt: new Date().toISOString(),
        due: null,
        dayOrder: 0,
        userId: 'creator-123',
        completedAt: null,
        childOrder: 1,
    }

    const mockProject = createMockProject({
        id: 'project-123',
        name: 'Test Project',
        color: 'blue',
        isShared: true,
        canAssignTasks: true,
        url: 'https://todoist.com/showProject?id=project-123',
    })

    beforeEach(() => {
        jest.clearAllMocks()

        mockTodoistApi = {
            addTask: jest.fn(),
            updateTask: jest.fn(),
            getTask: jest.fn(),
            getProjects: jest.fn(),
            getProject: jest.fn(),
        } as unknown as jest.Mocked<TodoistApi>

        // Mock assignment validator responses
        const mockAssignmentValidator =
            require('../../utils/assignment-validator.js').assignmentValidator
        mockAssignmentValidator.validateTaskCreationAssignment.mockResolvedValue({
            isValid: true,
            resolvedUser: mockValidUser,
        })
        mockAssignmentValidator.validateTaskUpdateAssignment.mockResolvedValue({
            isValid: true,
            resolvedUser: mockValidUser,
        })
        mockAssignmentValidator.validateBulkAssignment.mockResolvedValue([
            { isValid: true, resolvedUser: mockValidUser },
            { isValid: true, resolvedUser: mockValidUser },
            { isValid: true, resolvedUser: mockValidUser },
        ])

        // Mock user resolver
        const mockUserResolver = require('../../utils/user-resolver.js').userResolver
        mockUserResolver.resolveUser.mockResolvedValue(mockValidUser)
        mockUserResolver.getProjectCollaborators.mockResolvedValue([
            { id: 'user-123', name: 'John Doe', email: 'john@example.com' },
            { id: 'user-456', name: 'Jane Smith', email: 'jane@example.com' },
        ])

        // Mock API responses
        mockTodoistApi.getProjects.mockResolvedValue({
            results: [mockProject],
            nextCursor: null,
        })
        mockTodoistApi.getProject.mockResolvedValue(mockProject)
        mockTodoistApi.addTask.mockResolvedValue({ ...mockTask, responsibleUid: 'user-123' })
        mockTodoistApi.updateTask.mockResolvedValue({ ...mockTask, responsibleUid: 'user-123' })
        mockTodoistApi.getTask.mockResolvedValue(mockTask)
    })

    describe('Task Creation with Assignment', () => {
        it('should assign task during creation', async () => {
            const result = await addTasks.execute(
                {
                    tasks: [
                        {
                            content: 'New assigned task',
                            projectId: 'project-123',
                            responsibleUser: 'john@example.com',
                        },
                    ],
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.addTask).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: 'New assigned task',
                    projectId: 'project-123',
                    assigneeId: 'user-123', // Should be resolved user ID
                }),
            )

            expect(extractTextContent(result)).toContain('Added 1 task')
        })

        it('should validate assignment before creating task', async () => {
            const mockAssignmentValidator =
                require('../../utils/assignment-validator.js').assignmentValidator
            mockAssignmentValidator.validateTaskCreationAssignment.mockResolvedValueOnce({
                isValid: false,
                error: {
                    message: 'User not found in project collaborators',
                    suggestions: ['Use find-project-collaborators to see valid assignees'],
                },
            })

            await expect(
                addTasks.execute(
                    {
                        tasks: [
                            {
                                content: 'Invalid assignment task',
                                projectId: 'project-123',
                                responsibleUser: 'nonexistent@example.com',
                            },
                        ],
                    },
                    mockTodoistApi,
                ),
            ).rejects.toThrow(
                'Task "Invalid assignment task": User not found in project collaborators. Use find-project-collaborators to see valid assignees',
            )

            expect(mockTodoistApi.addTask).not.toHaveBeenCalled()
        })

        it('should handle assignment for subtasks', async () => {
            mockTodoistApi.getTask.mockResolvedValueOnce({
                ...mockTask,
                id: 'parent-123',
                projectId: 'project-123',
            })

            await addTasks.execute(
                {
                    tasks: [
                        {
                            content: 'Subtask with assignment',
                            parentId: 'parent-123',
                            responsibleUser: 'john@example.com',
                        },
                    ],
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.addTask).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: 'Subtask with assignment',
                    parentId: 'parent-123',
                    assigneeId: 'user-123',
                }),
            )
        })
    })

    describe('Task Update with Assignment', () => {
        it('should update task assignment', async () => {
            const result = await updateTasks.execute(
                {
                    tasks: [
                        {
                            id: 'task-123',
                            responsibleUser: 'jane@example.com',
                        },
                    ],
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.updateTask).toHaveBeenCalledWith(
                'task-123',
                expect.objectContaining({
                    assigneeId: 'user-123',
                }),
            )

            expect(extractTextContent(result)).toContain('Updated 1 task')
        })

        it('should unassign task when responsibleUser is null', async () => {
            await updateTasks.execute(
                {
                    tasks: [
                        {
                            id: 'task-123',
                            responsibleUser: null,
                        },
                    ],
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.updateTask).toHaveBeenCalledWith(
                'task-123',
                expect.objectContaining({
                    assigneeId: null,
                }),
            )
        })

        it('should validate assignment changes', async () => {
            const mockAssignmentValidator =
                require('../../utils/assignment-validator.js').assignmentValidator
            mockAssignmentValidator.validateTaskUpdateAssignment.mockResolvedValueOnce({
                isValid: false,
                error: {
                    message: 'User cannot be assigned to this project',
                },
            })

            await expect(
                updateTasks.execute(
                    {
                        tasks: [
                            {
                                id: 'task-123',
                                responsibleUser: 'invalid@example.com',
                            },
                        ],
                    },
                    mockTodoistApi,
                ),
            ).rejects.toThrow('Task task-123: User cannot be assigned to this project')

            expect(mockTodoistApi.updateTask).not.toHaveBeenCalled()
        })
    })

    describe('Bulk Assignment Operations', () => {
        beforeEach(() => {
            mockTodoistApi.getTask
                .mockResolvedValueOnce({ ...mockTask, id: 'task-1' })
                .mockResolvedValueOnce({ ...mockTask, id: 'task-2' })
                .mockResolvedValueOnce({ ...mockTask, id: 'task-3' })
        })

        it('should perform bulk assignment', async () => {
            const result = await manageAssignments.execute(
                {
                    operation: 'assign',
                    taskIds: ['task-1', 'task-2', 'task-3'],
                    responsibleUser: 'john@example.com',
                    dryRun: false,
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.updateTask).toHaveBeenCalledTimes(3)
            expect(mockTodoistApi.updateTask).toHaveBeenCalledWith('task-1', {
                assigneeId: 'user-123',
            })
            expect(mockTodoistApi.updateTask).toHaveBeenCalledWith('task-2', {
                assigneeId: 'user-123',
            })
            expect(mockTodoistApi.updateTask).toHaveBeenCalledWith('task-3', {
                assigneeId: 'user-123',
            })

            expect(extractTextContent(result)).toContain('3 tasks were successfully assigned')
        })

        it('should perform bulk unassignment', async () => {
            const result = await manageAssignments.execute(
                {
                    operation: 'unassign',
                    taskIds: ['task-1', 'task-2'],
                    dryRun: false,
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.updateTask).toHaveBeenCalledTimes(2)
            expect(mockTodoistApi.updateTask).toHaveBeenCalledWith('task-1', {
                assigneeId: null,
            })
            expect(mockTodoistApi.updateTask).toHaveBeenCalledWith('task-2', {
                assigneeId: null,
            })

            expect(extractTextContent(result)).toContain('2 tasks were successfully unassigned')
        })

        it('should handle dry-run mode', async () => {
            // Mock validation for 2 tasks
            const mockAssignmentValidator =
                require('../../utils/assignment-validator.js').assignmentValidator
            mockAssignmentValidator.validateBulkAssignment.mockResolvedValueOnce([
                { isValid: true, resolvedUser: mockValidUser },
                { isValid: true, resolvedUser: mockValidUser },
            ])

            const result = await manageAssignments.execute(
                {
                    operation: 'assign',
                    taskIds: ['task-1', 'task-2'],
                    responsibleUser: 'john@example.com',
                    dryRun: true,
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.updateTask).not.toHaveBeenCalled()
            expect(extractTextContent(result)).toContain('Dry Run: Bulk assign operation')
            expect(extractTextContent(result)).toContain('2 tasks would be successfully assigned')
        })

        it('should handle mixed success and failure results', async () => {
            // Mock validation for 3 tasks - 2 valid, 1 invalid
            const mockAssignmentValidator =
                require('../../utils/assignment-validator.js').assignmentValidator
            mockAssignmentValidator.validateBulkAssignment.mockResolvedValueOnce([
                { isValid: true, resolvedUser: mockValidUser },
                { isValid: false, error: { message: 'API Error' } },
                { isValid: true, resolvedUser: mockValidUser },
            ])

            mockTodoistApi.updateTask
                .mockResolvedValueOnce({ ...mockTask, id: 'task-1' })
                .mockResolvedValueOnce({ ...mockTask, id: 'task-3' })

            const result = await manageAssignments.execute(
                {
                    operation: 'assign',
                    taskIds: ['task-1', 'task-2', 'task-3'],
                    responsibleUser: 'john@example.com',
                    dryRun: false,
                },
                mockTodoistApi,
            )

            expect(extractTextContent(result)).toContain('2 tasks were successfully assigned')
            expect(extractTextContent(result)).toContain('1 task failed')
            expect(extractTextContent(result)).toContain('API Error')
        })
    })

    describe('Project Collaborators Discovery', () => {
        it('should find project collaborators', async () => {
            const result = await findProjectCollaborators.execute(
                {
                    projectId: 'project-123',
                },
                mockTodoistApi,
            )

            expect(extractTextContent(result)).toContain('Project collaborators')
            expect(extractTextContent(result)).toContain('John Doe (john@example.com)')
            expect(extractTextContent(result)).toContain('Jane Smith (jane@example.com)')
            expect(extractStructuredContent(result).collaborators).toHaveLength(2)
        })

        it('should filter collaborators by search term', async () => {
            const result = await findProjectCollaborators.execute(
                {
                    projectId: 'project-123',
                    searchTerm: 'John',
                },
                mockTodoistApi,
            )

            expect(extractTextContent(result)).toContain('matching "John"')
        })

        it('should handle non-shared projects', async () => {
            mockTodoistApi.getProject.mockResolvedValueOnce({ ...mockProject, isShared: false })

            const result = await findProjectCollaborators.execute(
                {
                    projectId: 'project-123',
                },
                mockTodoistApi,
            )

            expect(extractTextContent(result)).toContain('is not shared and has no collaborators')
            expect(extractStructuredContent(result).collaborators).toBeUndefined() // Empty arrays are removed
        })

        it('should handle project not found', async () => {
            mockTodoistApi.getProject.mockRejectedValueOnce(new Error('Project not found'))

            await expect(
                findProjectCollaborators.execute(
                    {
                        projectId: 'nonexistent-project',
                    },
                    mockTodoistApi,
                ),
            ).rejects.toThrow('Failed to access project "nonexistent-project"')
        })
    })

    describe('Error Handling and Edge Cases', () => {
        it('should handle assignment validation errors gracefully', async () => {
            const mockAssignmentValidator =
                require('../../utils/assignment-validator.js').assignmentValidator
            mockAssignmentValidator.validateTaskCreationAssignment.mockResolvedValueOnce({
                isValid: false,
                error: {
                    message: 'Project not shared',
                    suggestions: ['Share the project to enable assignments'],
                },
            })

            await expect(
                addTasks.execute(
                    {
                        tasks: [
                            {
                                content: 'Task in unshared project',
                                projectId: 'project-123',
                                responsibleUser: 'john@example.com',
                            },
                        ],
                    },
                    mockTodoistApi,
                ),
            ).rejects.toThrow(
                'Task "Task in unshared project": Project not shared. Share the project to enable assignments',
            )
        })

        it('should handle inbox assignment restriction', async () => {
            await expect(
                addTasks.execute(
                    {
                        tasks: [
                            {
                                content: 'Inbox task with assignment',
                                responsibleUser: 'john@example.com',
                            },
                        ],
                    },
                    mockTodoistApi,
                ),
            ).rejects.toThrow(
                'Task "Inbox task with assignment": Cannot assign tasks without specifying project context. Please specify a projectId, sectionId, or parentId.',
            )
        })

        it('should handle parent task not found', async () => {
            mockTodoistApi.getTask.mockRejectedValueOnce(new Error('Task not found'))

            await expect(
                addTasks.execute(
                    {
                        tasks: [
                            {
                                content: 'Subtask with bad parent',
                                parentId: 'nonexistent-parent',
                                responsibleUser: 'john@example.com',
                            },
                        ],
                    },
                    mockTodoistApi,
                ),
            ).rejects.toThrow(
                'Task "Subtask with bad parent": Parent task "nonexistent-parent" not found',
            )
        })

        it('should require responsibleUser for assign operations', async () => {
            await expect(
                manageAssignments.execute(
                    {
                        operation: 'assign',
                        taskIds: ['task-1'],
                        dryRun: false,
                    },
                    mockTodoistApi,
                ),
            ).rejects.toThrow('assign operation requires responsibleUser parameter')
        })

        it('should require responsibleUser for reassign operations', async () => {
            await expect(
                manageAssignments.execute(
                    {
                        operation: 'reassign',
                        taskIds: ['task-1'],
                        dryRun: false,
                    },
                    mockTodoistApi,
                ),
            ).rejects.toThrow('reassign operation requires responsibleUser parameter')
        })
    })

    describe('End-to-End Assignment Workflows', () => {
        it('should support complete assignment lifecycle', async () => {
            // 1. Create assigned task
            const createResult = await addTasks.execute(
                {
                    tasks: [
                        {
                            content: 'Task for lifecycle test',
                            projectId: 'project-123',
                            responsibleUser: 'john@example.com',
                        },
                    ],
                },
                mockTodoistApi,
            )

            expect(extractTextContent(createResult)).toContain('Added 1 task')

            // 2. Update assignment
            const updateResult = await updateTasks.execute(
                {
                    tasks: [
                        {
                            id: 'task-123',
                            responsibleUser: 'jane@example.com',
                        },
                    ],
                },
                mockTodoistApi,
            )

            expect(extractTextContent(updateResult)).toContain('Updated 1 task')

            // 3. Unassign task
            const unassignResult = await updateTasks.execute(
                {
                    tasks: [
                        {
                            id: 'task-123',
                            responsibleUser: null,
                        },
                    ],
                },
                mockTodoistApi,
            )

            expect(extractTextContent(unassignResult)).toContain('Updated 1 task')
        })
    })
})
