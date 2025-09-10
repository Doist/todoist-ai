import type { PersonalProject, Section, Task } from '@doist/todoist-api-typescript'
import { getToolOutput } from '../mcp-helpers'

/**
 * Mapped task type matching the output of mapTask function.
 * Used for filter-based query test mocks.
 */
export type MappedTask = {
    id: string
    content: string
    description: string
    dueDate: string | undefined
    recurring: string | boolean
    priority: number
    projectId: string
    sectionId: string | null
    parentId: string | null
    labels: string[]
    duration: string | null
    responsibleUid: string | null
    assignedByUid: string | null
}

/**
 * Creates a mock Task with all required properties and sensible defaults.
 * Pass only the properties you want to override for your specific test.
 */
export function createMockTask(overrides: Partial<Task> = {}): Task {
    return {
        id: '8485093748',
        content: 'Test task content',
        description: '',
        completedAt: null,
        labels: [],
        childOrder: 1,
        priority: 1,
        projectId: '6cfCcrrCFg2xP94Q',
        sectionId: null,
        parentId: null,
        url: 'https://todoist.com/showTask?id=8485093748',
        // Use correct property names from Task schema
        noteCount: 0,
        addedByUid: '713437',
        addedAt: '2025-08-13T22:09:56.123456Z',
        deadline: null,
        responsibleUid: null,
        assignedByUid: null,
        isCollapsed: false,
        isDeleted: false,
        duration: null,
        checked: false,
        updatedAt: '2025-08-13T22:09:56.123456Z',
        due: null,
        dayOrder: 0,
        userId: '713437',
        ...overrides,
    }
}

/**
 * Creates a mock Section with all required properties and sensible defaults.
 * Pass only the properties you want to override for your specific test.
 */
export function createMockSection(overrides: Partial<Section> = {}): Section {
    return {
        id: 'section-123',
        projectId: '6cfCcrrCFg2xP94Q',
        sectionOrder: 1,
        userId: 'test-user',
        addedAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        archivedAt: null,
        isArchived: false,
        isDeleted: false,
        isCollapsed: false,
        name: 'Test Section',
        url: 'https://todoist.com/sections/section-123',
        ...overrides,
    }
}

/**
 * Creates a mock PersonalProject with all required properties and sensible defaults.
 * Pass only the properties you want to override for your specific test.
 */
export function createMockProject(overrides: Partial<PersonalProject> = {}): PersonalProject {
    return {
        id: '6cfCcrrCFg2xP94Q',
        name: 'Test Project',
        color: 'charcoal',
        isFavorite: false,
        isShared: false,
        parentId: null,
        inboxProject: false,
        viewStyle: 'list',
        url: 'https://todoist.com/projects/6cfCcrrCFg2xP94Q',
        isDeleted: false,
        updatedAt: '2025-08-13T22:09:55.841800Z',
        createdAt: '2025-08-13T22:09:55.841785Z',
        childOrder: 1,
        defaultOrder: 0,
        description: '',
        isCollapsed: false,
        canAssignTasks: false,
        isFrozen: false,
        isArchived: false,
        ...overrides,
    }
}

/**
 * Creates a mock API response object with results and nextCursor.
 */
export function createMockApiResponse<T>(
    results: T[],
    nextCursor: string | null = null,
): {
    results: T[]
    nextCursor: string | null
} {
    return {
        results,
        nextCursor,
    }
}

/**
 * Creates a simplified mapped task (matches mapTask output) for filter-based query tests.
 */
export function createMappedTask(overrides: Partial<MappedTask> = {}): MappedTask {
    return {
        id: TEST_IDS.TASK_1,
        content: 'Test task content',
        description: '',
        dueDate: undefined,
        recurring: false,
        priority: 1,
        projectId: TEST_IDS.PROJECT_TEST,
        sectionId: null,
        parentId: null,
        labels: [],
        duration: null,
        responsibleUid: null,
        assignedByUid: null,
        ...overrides,
    }
}

/**
 * Common error messages used across tests.
 */
export const TEST_ERRORS = {
    API_RATE_LIMIT: 'API Error: Rate limit exceeded',
    API_UNAUTHORIZED: 'API Error: Unauthorized',
    INVALID_CURSOR: 'Invalid cursor format',
    INVALID_FILTER: 'Invalid filter query',
} as const

/**
 * Creates multiple test cases for parameterized testing.
 */
export function createTestCases<T, E = unknown>(
    cases: Array<{ name: string; input: T; expected?: E }>,
) {
    return cases
}

/**
 * Extracts the text content from a tool output for snapshot testing.
 * This allows tests to match against just the text content while tools return structured output.
 */
export function extractTextContent(toolOutput: unknown): string {
    if (typeof toolOutput === 'string') {
        return toolOutput
    }

    if (typeof toolOutput === 'object' && toolOutput !== null && 'content' in toolOutput) {
        const output = toolOutput as { content: unknown }
        if (
            Array.isArray(output.content) &&
            output.content[0] &&
            typeof output.content[0] === 'object' &&
            output.content[0] !== null &&
            'type' in output.content[0] &&
            'text' in output.content[0] &&
            output.content[0].type === 'text'
        ) {
            return output.content[0].text as string
        }
    }

    throw new Error('Expected tool output to have text content')
}

/**
 * Extracts the structured content from a tool output for testing.
 * This handles both the new `structuredContent` field and legacy JSON-encoded content.
 */
export function extractStructuredContent(
    output: ReturnType<typeof getToolOutput>,
): Record<string, unknown> {
    // Check for new structuredContent field first
    if ('structuredContent' in output && typeof output.structuredContent === 'object') {
        return output.structuredContent as Record<string, unknown>
    }

    // Fall back to checking for JSON content in the content array
    if ('content' in output && Array.isArray(output.content)) {
        for (const item of output.content) {
            if (
                typeof item === 'object' &&
                item !== null &&
                'type' in item &&
                'text' in item &&
                item.type === 'text' &&
                item.mimeType === 'application/json'
            ) {
                return JSON.parse(item.text) as Record<string, unknown>
            }
        }
    }

    throw new Error('Expected tool output to have structured content')
}

/**
 * Common mock IDs used across tests for consistency.
 */
export const TEST_IDS = {
    TASK_1: '8485093748',
    TASK_2: '8485093749',
    TASK_3: '8485093750',
    PROJECT_INBOX: 'inbox-project-id',
    PROJECT_WORK: 'work-project-id',
    PROJECT_TEST: '6cfCcrrCFg2xP94Q',
    SECTION_1: 'section-123',
    SECTION_2: 'section-456',
    USER_ID: '713437',
} as const

/**
 * Fixed date for consistent test snapshots.
 * Use this instead of new Date() in tests to avoid snapshot drift.
 */
export const TODAY = '2025-08-17' as const
