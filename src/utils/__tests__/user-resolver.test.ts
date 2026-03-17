import type { TodoistApi } from '@doist/todoist-api-typescript'
import { type Mocked, vi } from 'vitest'
import { SELF_USER_KEYWORD, UserResolver } from '../user-resolver.js'

describe('UserResolver', () => {
    let resolver: UserResolver
    let mockClient: Mocked<TodoistApi>

    const mockCurrentUser = {
        id: '12345',
        fullName: 'Test User',
        email: 'test@example.com',
    }

    beforeEach(() => {
        resolver = new UserResolver()
        resolver.clearCache()

        mockClient = {
            getUser: vi.fn().mockResolvedValue(mockCurrentUser),
            getProjects: vi.fn().mockResolvedValue({ results: [], nextCursor: null }),
        } as unknown as Mocked<TodoistApi>
    })

    describe('SELF_USER_KEYWORD', () => {
        it('should export "me" as the self-user keyword', () => {
            expect(SELF_USER_KEYWORD).toBe('me')
        })
    })

    describe('"me" keyword resolution', () => {
        it('should resolve "me" to the current authenticated user', async () => {
            const result = await resolver.resolveUser(mockClient, 'me')

            expect(mockClient.getUser).toHaveBeenCalledOnce()
            expect(result).toEqual({
                userId: '12345',
                displayName: 'Test User',
                email: 'test@example.com',
            })
        })

        it('should resolve "Me" case-insensitively', async () => {
            const result = await resolver.resolveUser(mockClient, 'Me')

            expect(mockClient.getUser).toHaveBeenCalledOnce()
            expect(result).toEqual({
                userId: '12345',
                displayName: 'Test User',
                email: 'test@example.com',
            })
        })

        it('should not cache "me" resolution (cache is process-global)', async () => {
            await resolver.resolveUser(mockClient, 'me')
            await resolver.resolveUser(mockClient, 'me')

            expect(mockClient.getUser).toHaveBeenCalledTimes(2)
        })

        it('should return null if getUser fails', async () => {
            mockClient.getUser.mockRejectedValueOnce(new Error('Auth failed'))

            const result = await resolver.resolveUser(mockClient, 'me')

            expect(result).toBeNull()
        })
    })
})
