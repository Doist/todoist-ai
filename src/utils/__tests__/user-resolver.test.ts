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

        it('should cache "me" resolution', async () => {
            await resolver.resolveUser(mockClient, 'me')
            await resolver.resolveUser(mockClient, 'me')

            expect(mockClient.getUser).toHaveBeenCalledOnce()
        })

        it('should return null if getUser fails', async () => {
            mockClient.getUser.mockRejectedValueOnce(new Error('Auth failed'))

            const result = await resolver.resolveUser(mockClient, 'me')

            expect(result).toBeNull()
        })

        it('should not match "me" case-insensitively (exact keyword only)', async () => {
            // "Me" and "ME" should not match the keyword — they go through normal resolution
            const result = await resolver.resolveUser(mockClient, 'ME')

            // getUser is still called (via the collaborator fallback path), but "ME"
            // doesn't match the exact keyword so it goes through normal name matching
            expect(result).toBeNull() // No collaborator named "ME"
        })
    })
})
