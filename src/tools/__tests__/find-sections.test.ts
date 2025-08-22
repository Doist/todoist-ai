import type { Section, TodoistApi } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import {
    TEST_ERRORS,
    TEST_IDS,
    createMockSection,
    extractStructuredContent,
    extractTextContent,
} from '../../utils/test-helpers.js'
import { ToolNames } from '../../utils/tool-names.js'
import { findSections } from '../find-sections.js'

// Mock the Todoist API
const mockTodoistApi = {
    getSections: jest.fn(),
} as unknown as jest.Mocked<TodoistApi>

const { FIND_SECTIONS, ADD_SECTIONS } = ToolNames

describe(`${FIND_SECTIONS} tool`, () => {
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

            const result = await findSections.execute(
                { projectId: TEST_IDS.PROJECT_TEST },
                mockTodoistApi,
            )

            expect(mockTodoistApi.getSections).toHaveBeenCalledWith({
                projectId: TEST_IDS.PROJECT_TEST,
            })

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('Sections in project')
            expect(textContent).toContain('To Do • id=')
            expect(textContent).toContain('In Progress • id=')
            expect(textContent).toContain('Done • id=')
            expect(textContent).toContain('Backlog Items • id=')

            // Verify structured content
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent.sections).toHaveLength(4)
            expect(structuredContent.totalCount).toBe(4)
            expect(structuredContent.appliedFilters).toEqual({
                projectId: TEST_IDS.PROJECT_TEST,
                search: undefined,
            })
        })

        it('should handle project with no sections', async () => {
            mockTodoistApi.getSections.mockResolvedValue({
                results: [],
                nextCursor: null,
            })

            const result = await findSections.execute(
                { projectId: 'empty-project-id' },
                mockTodoistApi,
            )

            expect(mockTodoistApi.getSections).toHaveBeenCalledWith({
                projectId: 'empty-project-id',
            })

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('Project has no sections yet')
            expect(textContent).toContain(`Use ${ADD_SECTIONS} to create sections`)

            // Verify structured content
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent.sections).toHaveLength(0)
            expect(structuredContent.totalCount).toBe(0)
            expect(structuredContent.appliedFilters).toEqual({
                projectId: 'empty-project-id',
                search: undefined,
            })
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

            const result = await findSections.execute(
                { projectId: TEST_IDS.PROJECT_TEST, search: 'progress' },
                mockTodoistApi,
            )

            expect(mockTodoistApi.getSections).toHaveBeenCalledWith({
                projectId: TEST_IDS.PROJECT_TEST,
            })

            // Should return both "In Progress" and "Progress Review" (case insensitive partial match)
            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('matching "progress"')
            expect(textContent).toContain('In Progress • id=')
            expect(textContent).toContain('Progress Review • id=')
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

            const result = await findSections.execute(
                { projectId: TEST_IDS.PROJECT_TEST, search: 'nonexistent' },
                mockTodoistApi,
            )

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('Try broader search terms')
            expect(textContent).toContain('Check spelling')
            expect(textContent).toContain('Remove search to see all sections')
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

            const result = await findSections.execute(
                { projectId: TEST_IDS.PROJECT_TEST, search: 'IMPORTANT' },
                mockTodoistApi,
            )

            // Should match despite different case
            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('matching "IMPORTANT"')
            expect(textContent).toContain('Important Tasks • id=')
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

            const result = await findSections.execute(
                { projectId: TEST_IDS.PROJECT_TEST, search: 'task' },
                mockTodoistApi,
            )

            // Should match both sections with "task" in the name
            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('matching "task"')
            expect(textContent).toContain('Development Tasks • id=')
            expect(textContent).toContain('Testing Tasks • id=')
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

            const result = await findSections.execute(
                { projectId: TEST_IDS.PROJECT_TEST, search: 'done' },
                mockTodoistApi,
            )

            // Should match both sections containing "done"
            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('matching "done"')
            expect(textContent).toContain('Done • id=')
            expect(textContent).toContain('Done Soon • id=')
        })
    })

    describe('error handling', () => {
        it.each([
            { error: 'API Error: Project not found', projectId: 'non-existent-project' },
            { error: TEST_ERRORS.API_UNAUTHORIZED, projectId: 'restricted-project' },
            { error: 'API Error: Invalid project ID format', projectId: 'invalid-id-format' },
        ])('should propagate $error', async ({ error, projectId }) => {
            mockTodoistApi.getSections.mockRejectedValue(new Error(error))
            await expect(findSections.execute({ projectId }, mockTodoistApi)).rejects.toThrow(error)
        })
    })
})
