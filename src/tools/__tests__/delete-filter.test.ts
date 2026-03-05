import type { TodoistApi } from '@doist/todoist-api-typescript'
import { type Mocked, vi } from 'vitest'
import { TEST_ERRORS } from '../../utils/test-helpers.js'
import { ToolNames } from '../../utils/tool-names.js'
import { deleteFilter } from '../delete-filter.js'

const mockTodoistApi = {
    sync: vi.fn(),
} as unknown as Mocked<TodoistApi>

const { DELETE_FILTER } = ToolNames

describe(`${DELETE_FILTER} tool`, () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('deleting a filter', () => {
        it('should delete a filter by ID', async () => {
            mockTodoistApi.sync.mockResolvedValue({
                syncStatus: { 'some-uuid': 'ok' },
            })

            const result = await deleteFilter.execute({ id: 'filter-123' }, mockTodoistApi)

            expect(mockTodoistApi.sync).toHaveBeenCalledOnce()
            const syncCall = mockTodoistApi.sync.mock.calls[0]?.[0]
            expect(syncCall?.commands).toHaveLength(1)
            expect(syncCall?.commands?.[0]?.type).toBe('filter_delete')
            expect(syncCall?.commands?.[0]?.args).toEqual({ id: 'filter-123' })

            expect(result.structuredContent).toEqual({
                deletedFilter: { id: 'filter-123' },
                success: true,
            })
            expect(result.textContent).toContain('Deleted filter: id=filter-123')
        })

        it('should return the correct filter ID in the response', async () => {
            mockTodoistApi.sync.mockResolvedValue({})

            const result = await deleteFilter.execute({ id: 'my-custom-filter-id' }, mockTodoistApi)

            expect(result.structuredContent.deletedFilter.id).toBe('my-custom-filter-id')
            expect(result.structuredContent.success).toBe(true)
        })
    })

    describe('error handling', () => {
        it('should propagate API errors', async () => {
            mockTodoistApi.sync.mockRejectedValue(new Error(TEST_ERRORS.API_UNAUTHORIZED))

            await expect(
                deleteFilter.execute({ id: 'filter-123' }, mockTodoistApi),
            ).rejects.toThrow(TEST_ERRORS.API_UNAUTHORIZED)
        })

        it('should propagate filter not found errors', async () => {
            mockTodoistApi.sync.mockRejectedValue(new Error('API Error: Filter not found'))

            await expect(
                deleteFilter.execute({ id: 'nonexistent-filter' }, mockTodoistApi),
            ).rejects.toThrow('API Error: Filter not found')
        })
    })
})
