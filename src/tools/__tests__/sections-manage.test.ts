import type { Section, TodoistApi } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import { sectionsManage } from '../sections-manage.js'
import {
    TEST_IDS,
    createMockSection,
    extractStructuredContent,
    extractTextContent,
} from '../test-helpers.js'

// Mock the Todoist API
const mockTodoistApi = {
    addSection: jest.fn(),
    updateSection: jest.fn(),
} as unknown as jest.Mocked<TodoistApi>

describe('sections-manage tool', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('creating a new section', () => {
        it('should create a section and return result', async () => {
            const mockApiResponse = createMockSection({
                id: TEST_IDS.SECTION_1,
                projectId: TEST_IDS.PROJECT_TEST,
                name: 'test-abc123def456-section',
            })

            mockTodoistApi.addSection.mockResolvedValue(mockApiResponse)

            const result = await sectionsManage.execute(
                { name: 'test-abc123def456-section', projectId: TEST_IDS.PROJECT_TEST },
                mockTodoistApi,
            )

            expect(mockTodoistApi.addSection).toHaveBeenCalledWith({
                name: 'test-abc123def456-section',
                projectId: TEST_IDS.PROJECT_TEST,
            })

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('Created section: test-abc123def456-section')
            expect(textContent).toContain(`id=${TEST_IDS.SECTION_1}`)
            expect(textContent).toContain('Use tasks-list-for-container with type=section')

            // Verify structured content
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    section: expect.objectContaining({
                        id: TEST_IDS.SECTION_1,
                        name: 'test-abc123def456-section',
                    }),
                    operation: 'created',
                }),
            )
        })

        it('should handle different section properties from API', async () => {
            const mockApiResponse = createMockSection({
                id: TEST_IDS.SECTION_2,
                projectId: 'project-789',
                sectionOrder: 2,
                name: 'My Section Name',
            })

            mockTodoistApi.addSection.mockResolvedValue(mockApiResponse)

            const result = await sectionsManage.execute(
                { name: 'My Section Name', projectId: 'project-789' },
                mockTodoistApi,
            )

            expect(mockTodoistApi.addSection).toHaveBeenCalledWith({
                name: 'My Section Name',
                projectId: 'project-789',
            })

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('Created section: My Section Name')
            expect(textContent).toContain(`id=${TEST_IDS.SECTION_2}`)
            expect(textContent).toContain('Use tasks-add-multiple with sectionId')

            // Verify structured content
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    section: expect.objectContaining({
                        id: TEST_IDS.SECTION_2,
                        name: 'My Section Name',
                    }),
                    operation: 'created',
                }),
            )
        })

        it('should throw error when projectId is missing for new section', async () => {
            await expect(
                sectionsManage.execute({ name: 'test-section' }, mockTodoistApi),
            ).rejects.toThrow(
                'Error: projectId is required when creating a new section (when id is not provided).',
            )

            expect(mockTodoistApi.addSection).not.toHaveBeenCalled()
        })
    })

    describe('updating an existing section', () => {
        it('should update a section when id is provided', async () => {
            const mockApiResponse: Section = {
                id: 'existing-section-123',
                projectId: '6cfCcrrCFg2xP94Q',
                sectionOrder: 1,
                userId: 'test-user',
                addedAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
                archivedAt: null,
                isArchived: false,
                isDeleted: false,
                isCollapsed: false,
                name: 'Updated Section Name',
            }

            mockTodoistApi.updateSection.mockResolvedValue(mockApiResponse)

            const result = await sectionsManage.execute(
                { id: 'existing-section-123', name: 'Updated Section Name' },
                mockTodoistApi,
            )

            expect(mockTodoistApi.updateSection).toHaveBeenCalledWith('existing-section-123', {
                name: 'Updated Section Name',
            })

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('Updated section: Updated Section Name')
            expect(textContent).toContain('id=existing-section-123')
            expect(textContent).toContain('Use tasks-list-for-container with type=section')

            // Verify structured content
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    section: expect.objectContaining({
                        id: 'existing-section-123',
                        name: 'Updated Section Name',
                    }),
                    operation: 'updated',
                }),
            )
        })

        it('should update section without requiring projectId', async () => {
            const mockApiResponse: Section = {
                id: 'section-update-test',
                projectId: 'original-project-id',
                sectionOrder: 3,
                userId: 'test-user',
                addedAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
                archivedAt: null,
                isArchived: false,
                isDeleted: false,
                isCollapsed: false,
                name: 'Section New Name',
            }

            mockTodoistApi.updateSection.mockResolvedValue(mockApiResponse)

            const result = await sectionsManage.execute(
                {
                    id: 'section-update-test',
                    name: 'Section New Name',
                    // Note: projectId not provided for update
                },
                mockTodoistApi,
            )

            expect(mockTodoistApi.updateSection).toHaveBeenCalledWith('section-update-test', {
                name: 'Section New Name',
            })

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('Updated section: Section New Name')
            expect(textContent).toContain('id=section-update-test')
            expect(textContent).toContain('Use tasks-list-for-container with type=section')

            // Verify structured content
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    section: expect.objectContaining({
                        id: 'section-update-test',
                        name: 'Section New Name',
                    }),
                    operation: 'updated',
                }),
            )
        })
    })

    describe('error handling', () => {
        it('should propagate API errors for section creation', async () => {
            const apiError = new Error('API Error: Section name is required')
            mockTodoistApi.addSection.mockRejectedValue(apiError)

            await expect(
                sectionsManage.execute({ name: '', projectId: '6cfCcrrCFg2xP94Q' }, mockTodoistApi),
            ).rejects.toThrow('API Error: Section name is required')
        })

        it('should propagate API errors for section updates', async () => {
            const apiError = new Error('API Error: Section not found')
            mockTodoistApi.updateSection.mockRejectedValue(apiError)

            await expect(
                sectionsManage.execute(
                    { id: 'non-existent-section', name: 'Updated Name' },
                    mockTodoistApi,
                ),
            ).rejects.toThrow('API Error: Section not found')
        })
    })
})
