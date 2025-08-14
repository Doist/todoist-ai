import type { Section, TodoistApi } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import { sectionsSearch } from '../sections-search'
import { TEST_ERRORS, TEST_IDS, createMockSection } from '../test-helpers'

// Mock the Todoist API
const mockTodoistApi = {
    getSections: jest.fn(),
} as unknown as jest.Mocked<TodoistApi>

describe('sections-search tool', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('listing all sections in a project', () => {
        it('should list all sections when no search parameter is provided', async () => {
            const mockSections: Section[] = [
                createMockSection({
                    id: TEST_IDS.SECTION_1,
                    projectId: TEST_IDS.PROJECT_TEST,
                    name: 'To Do',
                }),
                createMockSection({
                    id: TEST_IDS.SECTION_2,
                    projectId: TEST_IDS.PROJECT_TEST,
                    sectionOrder: 2,
                    name: 'In Progress',
                }),
                createMockSection({
                    id: 'section-789',
                    projectId: TEST_IDS.PROJECT_TEST,
                    sectionOrder: 3,
                    name: 'Done',
                }),
                createMockSection({
                    id: 'section-999',
                    projectId: TEST_IDS.PROJECT_TEST,
                    sectionOrder: 4,
                    name: 'Backlog Items',
                }),
            ]

            mockTodoistApi.getSections.mockResolvedValue({
                results: mockSections,
                nextCursor: null,
            })

            const result = await sectionsSearch.execute(
                { projectId: TEST_IDS.PROJECT_TEST },
                mockTodoistApi,
            )

            // Verify API was called correctly
            expect(mockTodoistApi.getSections).toHaveBeenCalledWith({
                projectId: TEST_IDS.PROJECT_TEST,
            })

            // Verify result is properly mapped (simplified format)
            expect(result).toEqual([
                { id: TEST_IDS.SECTION_1, name: 'To Do' },
                { id: TEST_IDS.SECTION_2, name: 'In Progress' },
                { id: 'section-789', name: 'Done' },
                { id: 'section-999', name: 'Backlog Items' },
            ])
        })

        it('should handle project with no sections', async () => {
            mockTodoistApi.getSections.mockResolvedValue({
                results: [],
                nextCursor: null,
            })

            const result = await sectionsSearch.execute(
                { projectId: 'empty-project-id' },
                mockTodoistApi,
            )

            expect(mockTodoistApi.getSections).toHaveBeenCalledWith({
                projectId: 'empty-project-id',
            })

            expect(result).toEqual([])
        })
    })

    describe('searching sections by name', () => {
        it('should filter sections by search term (case insensitive)', async () => {
            const mockSections: Section[] = [
                createMockSection({
                    id: TEST_IDS.SECTION_1,
                    projectId: TEST_IDS.PROJECT_TEST,
                    name: 'To Do',
                }),
                createMockSection({
                    id: TEST_IDS.SECTION_2,
                    projectId: TEST_IDS.PROJECT_TEST,
                    sectionOrder: 2,
                    name: 'In Progress',
                }),
                createMockSection({
                    id: 'section-789',
                    projectId: TEST_IDS.PROJECT_TEST,
                    sectionOrder: 3,
                    name: 'Done',
                }),
                createMockSection({
                    id: 'section-999',
                    projectId: TEST_IDS.PROJECT_TEST,
                    sectionOrder: 4,
                    name: 'Progress Review',
                }),
            ]

            mockTodoistApi.getSections.mockResolvedValue({
                results: mockSections,
                nextCursor: null,
            })

            const result = await sectionsSearch.execute(
                {
                    projectId: TEST_IDS.PROJECT_TEST,
                    search: 'progress',
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.getSections).toHaveBeenCalledWith({
                projectId: TEST_IDS.PROJECT_TEST,
            })

            // Should return both "In Progress" and "Progress Review" (case insensitive partial match)
            expect(result).toEqual([
                { id: TEST_IDS.SECTION_2, name: 'In Progress' },
                { id: 'section-999', name: 'Progress Review' },
            ])
        })

        it('should handle search with no matches', async () => {
            const mockSections: Section[] = [
                createMockSection({
                    id: TEST_IDS.SECTION_1,
                    projectId: TEST_IDS.PROJECT_TEST,
                    name: 'To Do',
                }),
                createMockSection({
                    id: TEST_IDS.SECTION_2,
                    projectId: TEST_IDS.PROJECT_TEST,
                    sectionOrder: 2,
                    name: 'In Progress',
                }),
            ]

            mockTodoistApi.getSections.mockResolvedValue({
                results: mockSections,
                nextCursor: null,
            })

            const result = await sectionsSearch.execute(
                {
                    projectId: TEST_IDS.PROJECT_TEST,
                    search: 'nonexistent',
                },
                mockTodoistApi,
            )

            expect(result).toEqual([])
        })

        it('should handle case sensitive search correctly', async () => {
            const mockSections: Section[] = [
                createMockSection({
                    id: TEST_IDS.SECTION_1,
                    projectId: TEST_IDS.PROJECT_TEST,
                    name: 'Important Tasks',
                }),
                createMockSection({
                    id: TEST_IDS.SECTION_2,
                    projectId: TEST_IDS.PROJECT_TEST,
                    sectionOrder: 2,
                    name: 'Regular Work',
                }),
            ]

            mockTodoistApi.getSections.mockResolvedValue({
                results: mockSections,
                nextCursor: null,
            })

            const result = await sectionsSearch.execute(
                {
                    projectId: TEST_IDS.PROJECT_TEST,
                    search: 'IMPORTANT',
                },
                mockTodoistApi,
            )

            // Should match despite different case
            expect(result).toHaveLength(1)
            expect(result[0]).toEqual({ id: TEST_IDS.SECTION_1, name: 'Important Tasks' })
        })

        it('should handle partial matches correctly', async () => {
            const mockSections: Section[] = [
                createMockSection({
                    id: TEST_IDS.SECTION_1,
                    projectId: TEST_IDS.PROJECT_TEST,
                    name: 'Development Tasks',
                }),
                createMockSection({
                    id: TEST_IDS.SECTION_2,
                    projectId: TEST_IDS.PROJECT_TEST,
                    sectionOrder: 2,
                    name: 'Testing Tasks',
                }),
                createMockSection({
                    id: 'section-789',
                    projectId: TEST_IDS.PROJECT_TEST,
                    sectionOrder: 3,
                    name: 'Deployment',
                }),
            ]

            mockTodoistApi.getSections.mockResolvedValue({
                results: mockSections,
                nextCursor: null,
            })

            const result = await sectionsSearch.execute(
                {
                    projectId: TEST_IDS.PROJECT_TEST,
                    search: 'task',
                },
                mockTodoistApi,
            )

            // Should match both sections with "task" in the name
            expect(result).toEqual([
                { id: TEST_IDS.SECTION_1, name: 'Development Tasks' },
                { id: TEST_IDS.SECTION_2, name: 'Testing Tasks' },
            ])
        })

        it('should handle exact matches', async () => {
            const mockSections: Section[] = [
                createMockSection({
                    id: TEST_IDS.SECTION_1,
                    projectId: TEST_IDS.PROJECT_TEST,
                    name: 'Done',
                }),
                createMockSection({
                    id: TEST_IDS.SECTION_2,
                    projectId: TEST_IDS.PROJECT_TEST,
                    sectionOrder: 2,
                    name: 'Done Soon',
                }),
            ]

            mockTodoistApi.getSections.mockResolvedValue({
                results: mockSections,
                nextCursor: null,
            })

            const result = await sectionsSearch.execute(
                {
                    projectId: TEST_IDS.PROJECT_TEST,
                    search: 'done',
                },
                mockTodoistApi,
            )

            // Should match both sections containing "done"
            expect(result).toEqual([
                { id: TEST_IDS.SECTION_1, name: 'Done' },
                { id: TEST_IDS.SECTION_2, name: 'Done Soon' },
            ])
        })
    })

    describe('error handling', () => {
        it.each([
            { error: 'API Error: Project not found', projectId: 'non-existent-project' },
            { error: TEST_ERRORS.API_UNAUTHORIZED, projectId: 'restricted-project' },
            { error: 'API Error: Invalid project ID format', projectId: 'invalid-id-format' },
        ])('should propagate $error', async ({ error, projectId }) => {
            mockTodoistApi.getSections.mockRejectedValue(new Error(error))
            await expect(sectionsSearch.execute({ projectId }, mockTodoistApi)).rejects.toThrow(
                error,
            )
        })
    })
})
