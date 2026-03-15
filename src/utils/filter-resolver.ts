import type { TodoistApi } from '@doist/todoist-api-typescript'
import type { Filter } from '@doist/todoist-api-typescript/dist/types/types/sync/resources/filters.js'

export type ResolvedFilter = {
    filterId: string
    filterName: string
    filterQuery: string
}

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export class FilterResolver {
    private cache: { filters: Filter[]; timestamp: number } | null = null

    private async getFilters(client: TodoistApi): Promise<Filter[]> {
        if (this.cache && Date.now() - this.cache.timestamp < CACHE_TTL) {
            return this.cache.filters
        }

        const syncResponse = await client.sync({
            resourceTypes: ['filters'],
            syncToken: '*',
        })
        const filters = (syncResponse.filters ?? []).filter((f) => !f.isDeleted)
        this.cache = { filters, timestamp: Date.now() }
        return filters
    }

    /**
     * Resolve a filter name or ID to a filter ID, name, and query.
     *
     * Resolution order:
     * 1. Exact ID match
     * 2. Exact case-insensitive name match
     * 3. Unique partial case-insensitive name match
     * 4. Multiple partial matches → throw ambiguous error
     * 5. No match → throw not-found error
     */
    async resolveFilter(client: TodoistApi, nameOrId: string): Promise<ResolvedFilter> {
        const trimmed = nameOrId.trim()
        if (!trimmed) {
            throw new Error('Filter reference cannot be empty')
        }

        const filters = await this.getFilters(client)

        // Try exact ID match first
        const byId = filters.find((f) => f.id === trimmed)
        if (byId) {
            return { filterId: byId.id, filterName: byId.name, filterQuery: byId.query }
        }

        const searchTerm = trimmed.toLowerCase()

        // Exact case-insensitive name match
        const exactMatch = filters.find((f) => f.name.toLowerCase() === searchTerm)
        if (exactMatch) {
            return {
                filterId: exactMatch.id,
                filterName: exactMatch.name,
                filterQuery: exactMatch.query,
            }
        }

        // Partial case-insensitive name match
        const partialMatches = filters.filter((f) => f.name.toLowerCase().includes(searchTerm))

        const singleMatch = partialMatches.length === 1 ? partialMatches[0] : undefined
        if (singleMatch) {
            return {
                filterId: singleMatch.id,
                filterName: singleMatch.name,
                filterQuery: singleMatch.query,
            }
        }

        if (partialMatches.length > 1) {
            const listed = partialMatches
                .slice(0, 5)
                .map((f) => `  - "${f.name}" (id: ${f.id})`)
                .join('\n')
            throw new Error(
                `Ambiguous filter reference "${trimmed}". Multiple filters match:\n${listed}` +
                    (partialMatches.length > 5
                        ? `\n  ... and ${partialMatches.length - 5} more`
                        : ''),
            )
        }

        // No match
        throw new Error(`Filter "${trimmed}" not found.`)
    }

    /**
     * Clear the filter cache — useful for testing.
     */
    clearCache(): void {
        this.cache = null
    }
}

// Export singleton instance
export const filterResolver = new FilterResolver()
