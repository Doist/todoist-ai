import type { TodoistApi } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import { deleteOne } from '../delete-one'

// Mock the Todoist API
const mockTodoistApi = {
    deleteProject: jest.fn(),
    deleteSection: jest.fn(),
    deleteTask: jest.fn(),
} as unknown as jest.Mocked<TodoistApi>

describe('delete-one tool', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('deleting projects', () => {
        it('should delete a project by ID', async () => {
            mockTodoistApi.deleteProject.mockResolvedValue(true)

            const result = await deleteOne.execute(
                { type: 'project', id: '6cfCcrrCFg2xP94Q' },
                mockTodoistApi,
            )

            // Verify API was called correctly
            expect(mockTodoistApi.deleteProject).toHaveBeenCalledWith('6cfCcrrCFg2xP94Q')
            expect(mockTodoistApi.deleteSection).not.toHaveBeenCalled()
            expect(mockTodoistApi.deleteTask).not.toHaveBeenCalled()

            // Verify success response
            expect(result).toEqual({ success: true })
        })

        it('should propagate project deletion errors', async () => {
            const apiError = new Error('API Error: Cannot delete project with tasks')
            mockTodoistApi.deleteProject.mockRejectedValue(apiError)

            await expect(
                deleteOne.execute({ type: 'project', id: 'project-with-tasks' }, mockTodoistApi),
            ).rejects.toThrow('API Error: Cannot delete project with tasks')
        })
    })

    describe('deleting sections', () => {
        it('should delete a section by ID', async () => {
            mockTodoistApi.deleteSection.mockResolvedValue(true)

            const result = await deleteOne.execute(
                { type: 'section', id: 'section-123' },
                mockTodoistApi,
            )

            // Verify API was called correctly
            expect(mockTodoistApi.deleteSection).toHaveBeenCalledWith('section-123')
            expect(mockTodoistApi.deleteProject).not.toHaveBeenCalled()
            expect(mockTodoistApi.deleteTask).not.toHaveBeenCalled()

            // Verify success response
            expect(result).toEqual({ success: true })
        })

        it('should propagate section deletion errors', async () => {
            const apiError = new Error('API Error: Section not found')
            mockTodoistApi.deleteSection.mockRejectedValue(apiError)

            await expect(
                deleteOne.execute({ type: 'section', id: 'non-existent-section' }, mockTodoistApi),
            ).rejects.toThrow('API Error: Section not found')
        })
    })

    describe('deleting tasks', () => {
        it('should delete a task by ID', async () => {
            mockTodoistApi.deleteTask.mockResolvedValue(true)

            const result = await deleteOne.execute(
                { type: 'task', id: '8485093748' },
                mockTodoistApi,
            )

            // Verify API was called correctly
            expect(mockTodoistApi.deleteTask).toHaveBeenCalledWith('8485093748')
            expect(mockTodoistApi.deleteProject).not.toHaveBeenCalled()
            expect(mockTodoistApi.deleteSection).not.toHaveBeenCalled()

            // Verify success response
            expect(result).toEqual({ success: true })
        })

        it('should propagate task deletion errors', async () => {
            const apiError = new Error('API Error: Task not found')
            mockTodoistApi.deleteTask.mockRejectedValue(apiError)

            await expect(
                deleteOne.execute({ type: 'task', id: 'non-existent-task' }, mockTodoistApi),
            ).rejects.toThrow('API Error: Task not found')
        })

        it('should handle permission errors', async () => {
            const apiError = new Error('API Error: Insufficient permissions to delete task')
            mockTodoistApi.deleteTask.mockRejectedValue(apiError)

            await expect(
                deleteOne.execute({ type: 'task', id: 'restricted-task' }, mockTodoistApi),
            ).rejects.toThrow('API Error: Insufficient permissions to delete task')
        })
    })

    describe('type validation', () => {
        it('should handle all supported entity types', async () => {
            // Test all three supported types work correctly
            mockTodoistApi.deleteProject.mockResolvedValue(true)
            mockTodoistApi.deleteSection.mockResolvedValue(true)
            mockTodoistApi.deleteTask.mockResolvedValue(true)

            // Delete project
            await deleteOne.execute({ type: 'project', id: 'proj-1' }, mockTodoistApi)
            expect(mockTodoistApi.deleteProject).toHaveBeenCalledWith('proj-1')

            // Delete section
            await deleteOne.execute({ type: 'section', id: 'sect-1' }, mockTodoistApi)
            expect(mockTodoistApi.deleteSection).toHaveBeenCalledWith('sect-1')

            // Delete task
            await deleteOne.execute({ type: 'task', id: 'task-1' }, mockTodoistApi)
            expect(mockTodoistApi.deleteTask).toHaveBeenCalledWith('task-1')

            // Verify each API method was called exactly once
            expect(mockTodoistApi.deleteProject).toHaveBeenCalledTimes(1)
            expect(mockTodoistApi.deleteSection).toHaveBeenCalledTimes(1)
            expect(mockTodoistApi.deleteTask).toHaveBeenCalledTimes(1)
        })
    })
})
