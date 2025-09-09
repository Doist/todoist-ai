import type { TodoistApi } from '@doist/todoist-api-typescript'

export interface ResolvedUser {
    userId: string
    displayName: string
}

export interface ProjectCollaborator {
    id: string
    name: string
    email: string
}

// User resolution cache for performance with TTL
const userResolutionCache = new Map<
    string,
    {
        result: ResolvedUser | null
        timestamp: number
    }
>()

// Project collaborators cache
const collaboratorsCache = new Map<
    string,
    {
        result: ProjectCollaborator[]
        timestamp: number
    }
>()

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export class UserResolver {
    /**
     * Resolve a user name or ID to a user ID by looking up collaborators across all shared projects.
     * Supports exact name matches, partial matches, and email matches.
     */
    async resolveUser(client: TodoistApi, nameOrId: string): Promise<ResolvedUser | null> {
        // Input validation
        if (!nameOrId || nameOrId.trim().length === 0) {
            return null
        }

        const trimmedInput = nameOrId.trim()

        // Check cache first
        const cached = userResolutionCache.get(trimmedInput)
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.result
        }

        // If it looks like a user ID already, return as-is
        // Support numeric IDs and alphanumeric IDs but avoid obvious user names
        if (
            /^[0-9]+$/.test(trimmedInput) ||
            (/^[a-f0-9-]{8,}$/i.test(trimmedInput) && trimmedInput.includes('-')) ||
            (/^[a-z0-9_]{6,}$/i.test(trimmedInput) &&
                !/^[a-z]+[\s\-]/.test(trimmedInput) &&
                /[0-9_]/.test(trimmedInput))
        ) {
            const result = { userId: trimmedInput, displayName: trimmedInput }
            userResolutionCache.set(trimmedInput, { result, timestamp: Date.now() })
            return result
        }

        try {
            // Get all collaborators from shared projects
            const allCollaborators = await this.getAllCollaborators(client)

            if (allCollaborators.length === 0) {
                const result = null // No shared projects, can't resolve collaborators
                userResolutionCache.set(trimmedInput, { result, timestamp: Date.now() })
                return result
            }

            const searchTerm = nameOrId.toLowerCase().trim()

            // Try exact name match first
            let match = allCollaborators.find((c) => c.name.toLowerCase() === searchTerm)
            if (match) {
                const result = { userId: match.id, displayName: match.name }
                userResolutionCache.set(trimmedInput, { result, timestamp: Date.now() })
                return result
            }

            // Try exact email match
            match = allCollaborators.find((c) => c.email.toLowerCase() === searchTerm)
            if (match) {
                const result = { userId: match.id, displayName: match.name }
                userResolutionCache.set(trimmedInput, { result, timestamp: Date.now() })
                return result
            }

            // Try partial name match (contains)
            match = allCollaborators.find((c) => c.name.toLowerCase().includes(searchTerm))
            if (match) {
                const result = { userId: match.id, displayName: match.name }
                userResolutionCache.set(trimmedInput, { result, timestamp: Date.now() })
                return result
            }

            // Try partial email match
            match = allCollaborators.find((c) => c.email.toLowerCase().includes(searchTerm))
            if (match) {
                const result = { userId: match.id, displayName: match.name }
                userResolutionCache.set(trimmedInput, { result, timestamp: Date.now() })
                return result
            }

            // No match found
            const result = null
            userResolutionCache.set(trimmedInput, { result, timestamp: Date.now() })
            return result
        } catch (_error) {
            // If we can't fetch collaborators, return null instead of dangerous fallback
            const result = null
            userResolutionCache.set(trimmedInput, { result, timestamp: Date.now() })
            return result
        }
    }

    /**
     * Validate that a user is a collaborator on a specific project
     */
    async validateProjectCollaborator(
        client: TodoistApi,
        projectId: string,
        userId: string,
    ): Promise<boolean> {
        try {
            const collaborators = await this.getProjectCollaborators(client, projectId)
            return collaborators.some((collaborator) => collaborator.id === userId)
        } catch (_error) {
            return false
        }
    }

    /**
     * Get collaborators for a specific project
     */
    async getProjectCollaborators(
        client: TodoistApi,
        projectId: string,
    ): Promise<ProjectCollaborator[]> {
        // Check cache first
        const cacheKey = `project_${projectId}`
        const cached = collaboratorsCache.get(cacheKey)
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.result
        }

        try {
            const response = await client.getProjectCollaborators(projectId)
            // API returns { results: [...], nextCursor: null } or just array
            const collaborators = Array.isArray(response) ? response : response.results || []

            const validCollaborators = collaborators.filter((c) => c?.id && c.name && c.email)

            collaboratorsCache.set(cacheKey, {
                result: validCollaborators,
                timestamp: Date.now(),
            })

            return validCollaborators
        } catch (_error) {
            // Return empty array on error, don't cache failed requests
            return []
        }
    }

    /**
     * Get all collaborators from all shared projects
     */
    private async getAllCollaborators(client: TodoistApi): Promise<ProjectCollaborator[]> {
        // Check cache first
        const cacheKey = 'all_collaborators'
        const cached = collaboratorsCache.get(cacheKey)
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.result
        }

        try {
            // Get all projects to find shared ones
            const { results: projects } = await client.getProjects({})
            const sharedProjects = projects.filter((p) => p.isShared)

            if (sharedProjects.length === 0) {
                const result: ProjectCollaborator[] = []
                collaboratorsCache.set(cacheKey, { result, timestamp: Date.now() })
                return result
            }

            // Collect all collaborators from shared projects
            const allCollaborators: ProjectCollaborator[] = []
            const seenIds = new Set<string>()

            for (const project of sharedProjects) {
                try {
                    const collaborators = await this.getProjectCollaborators(client, project.id)
                    for (const collaborator of collaborators) {
                        if (collaborator && !seenIds.has(collaborator.id)) {
                            allCollaborators.push(collaborator)
                            seenIds.add(collaborator.id)
                        }
                    }
                } catch (_error) {
                    // Skip failed project, continue with others
                }
            }

            collaboratorsCache.set(cacheKey, {
                result: allCollaborators,
                timestamp: Date.now(),
            })

            return allCollaborators
        } catch (_error) {
            // Return empty array on error, don't cache failed requests
            return []
        }
    }

    /**
     * Clear all caches - useful for testing
     */
    clearCache(): void {
        userResolutionCache.clear()
        collaboratorsCache.clear()
    }
}

// Export singleton instance
export const userResolver = new UserResolver()

// Legacy function for backwards compatibility
export async function resolveUserNameToId(
    client: TodoistApi,
    nameOrId: string,
): Promise<{ userId: string; displayName: string } | null> {
    return userResolver.resolveUser(client, nameOrId)
}
