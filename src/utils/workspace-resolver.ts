import type { TodoistApi, Workspace } from '@doist/todoist-api-typescript'

export type ResolvedWorkspace = {
    workspaceId: string
    workspaceName: string
}

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Check if a string looks like a workspace ID (purely numeric).
 */
export function looksLikeWorkspaceId(ref: string): boolean {
    return /^\d+$/.test(ref)
}

export class WorkspaceResolver {
    private cache: { workspaces: Workspace[]; timestamp: number } | null = null

    private async getWorkspaces(client: TodoistApi): Promise<Workspace[]> {
        if (this.cache && Date.now() - this.cache.timestamp < CACHE_TTL) {
            return this.cache.workspaces
        }

        const workspaces = await client.getWorkspaces()
        this.cache = { workspaces, timestamp: Date.now() }
        return workspaces
    }

    /**
     * Resolve a workspace name or ID to a workspace ID and name.
     *
     * Resolution order:
     * 1. If input looks like an ID (numeric), try ID match first. If not found, pass through as-is.
     * 2. Exact case-insensitive name match
     * 3. Unique partial case-insensitive name match
     * 4. Multiple partial matches → throw ambiguous error
     * 5. No match → throw not-found error
     */
    async resolveWorkspace(client: TodoistApi, nameOrId: string): Promise<ResolvedWorkspace> {
        const trimmed = nameOrId.trim()
        if (!trimmed) {
            throw new Error('Workspace reference cannot be empty')
        }

        const workspaces = await this.getWorkspaces(client)

        // If it looks like an ID, try ID match first
        if (looksLikeWorkspaceId(trimmed)) {
            const byId = workspaces.find((w) => w.id === trimmed)
            if (byId) {
                return { workspaceId: byId.id, workspaceName: byId.name }
            }
            // Not found by ID — pass through as-is (API will validate)
            return { workspaceId: trimmed, workspaceName: trimmed }
        }

        const searchTerm = trimmed.toLowerCase()

        // Exact case-insensitive name match
        const exactMatch = workspaces.find((w) => w.name.toLowerCase() === searchTerm)
        if (exactMatch) {
            return { workspaceId: exactMatch.id, workspaceName: exactMatch.name }
        }

        // Partial case-insensitive name match
        const partialMatches = workspaces.filter((w) => w.name.toLowerCase().includes(searchTerm))

        const singleMatch = partialMatches.length === 1 ? partialMatches[0] : undefined
        if (singleMatch) {
            return { workspaceId: singleMatch.id, workspaceName: singleMatch.name }
        }

        if (partialMatches.length > 1) {
            const listed = partialMatches
                .slice(0, 5)
                .map((w) => `  - "${w.name}" (id: ${w.id})`)
                .join('\n')
            throw new Error(
                `Ambiguous workspace reference "${trimmed}". Multiple workspaces match:\n${listed}` +
                    (partialMatches.length > 5
                        ? `\n  ... and ${partialMatches.length - 5} more`
                        : ''),
            )
        }

        // No match
        throw new Error(
            `Workspace "${trimmed}" not found. Use list-workspaces to see available workspaces.`,
        )
    }

    /**
     * Clear the workspace cache — useful for testing.
     */
    clearCache(): void {
        this.cache = null
    }
}

// Export singleton instance
export const workspaceResolver = new WorkspaceResolver()
