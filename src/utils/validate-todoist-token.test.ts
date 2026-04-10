import { TodoistApi } from '@doist/todoist-sdk'
import { type Mock, vi } from 'vitest'

import { validateTodoistToken } from './validate-todoist-token.js'

const mockGetUser = vi.fn()

vi.mock('@doist/todoist-sdk', () => ({
    TodoistApi: vi.fn().mockImplementation(function () {
        return { getUser: mockGetUser }
    }),
}))

describe('validateTodoistToken', () => {
    beforeEach(() => {
        mockGetUser.mockReset()
        ;(TodoistApi as unknown as Mock).mockClear()
    })

    it('should return true for a valid token', async () => {
        mockGetUser.mockResolvedValue({ id: '123', full_name: 'Test' })

        const result = await validateTodoistToken('valid-token')

        expect(result).toBe(true)
        expect(mockGetUser).toHaveBeenCalledOnce()
    })

    it('should return false for a 401 error', async () => {
        mockGetUser.mockRejectedValue({ httpStatusCode: 401, message: 'Unauthorized' })

        const result = await validateTodoistToken('invalid-token')

        expect(result).toBe(false)
    })

    it('should return false for a 403 error', async () => {
        mockGetUser.mockRejectedValue({ httpStatusCode: 403, message: 'Forbidden' })

        const result = await validateTodoistToken('forbidden-token')

        expect(result).toBe(false)
    })

    it('should throw on 5xx errors', async () => {
        mockGetUser.mockRejectedValue({ httpStatusCode: 500, message: 'Internal Server Error' })

        await expect(validateTodoistToken('valid-token')).rejects.toEqual({
            httpStatusCode: 500,
            message: 'Internal Server Error',
        })
    })

    it('should throw on network errors', async () => {
        mockGetUser.mockRejectedValue(new Error('fetch failed'))

        await expect(validateTodoistToken('valid-token')).rejects.toThrow('fetch failed')
    })

    it('should pass baseUrl to TodoistApi', async () => {
        mockGetUser.mockResolvedValue({ id: '123' })

        await validateTodoistToken('token', 'https://custom.api.com')

        expect(TodoistApi).toHaveBeenCalledWith('token', { baseUrl: 'https://custom.api.com' })
    })
})
