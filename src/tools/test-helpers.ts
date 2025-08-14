import type { PersonalProject, Section, Task } from '@doist/todoist-api-typescript'

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
