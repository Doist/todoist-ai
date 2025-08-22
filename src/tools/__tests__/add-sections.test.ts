import type { Section, TodoistApi } from '@doist/todoist-api-typescript'
import { jest } from '@jest/globals'
import {
    TEST_IDS,
    createMockSection,
    extractStructuredContent,
    extractTextContent,
} from '../../utils/test-helpers.js'
import { ToolNames } from '../../utils/tool-names.js'
import { addSections } from '../add-sections.js'

// Mock the Todoist API
const mockTodoistApi = {
    addSection: jest.fn(),
} as unknown as jest.Mocked<TodoistApi>

const { ADD_TASKS, ADD_SECTIONS, FIND_TASKS } = ToolNames

describe(`${ADD_SECTIONS} tool`, () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('creating a single section', () => {
        it('should create a section and return mapped result', async () => {
            const mockApiResponse = createMockSection({
                id: TEST_IDS.SECTION_1,
                projectId: TEST_IDS.PROJECT_TEST,
                name: 'test-abc123def456-section',
            })

            mockTodoistApi.addSection.mockResolvedValue(mockApiResponse)

            const result = await addSections.execute(
                {
                    sections: [
                        { name: 'test-abc123def456-section', projectId: TEST_IDS.PROJECT_TEST },
                    ],
                },
                mockTodoistApi,
            )

            // Verify API was called correctly
            expect(mockTodoistApi.addSection).toHaveBeenCalledWith({
                name: 'test-abc123def456-section',
                projectId: TEST_IDS.PROJECT_TEST,
            })

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('Added 1 section:')
            expect(textContent).toContain('test-abc123def456-section')
            expect(textContent).toContain(`id=${TEST_IDS.SECTION_1}`)
            expect(textContent).toContain(`Use ${ADD_TASKS} with sectionId`)

            // Verify structured content
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    sections: [
                        expect.objectContaining({
                            id: TEST_IDS.SECTION_1,
                            name: 'test-abc123def456-section',
                        }),
                    ],
                    totalCount: 1,
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

            const result = await addSections.execute(
                { sections: [{ name: 'My Section Name', projectId: 'project-789' }] },
                mockTodoistApi,
            )

            expect(mockTodoistApi.addSection).toHaveBeenCalledWith({
                name: 'My Section Name',
                projectId: 'project-789',
            })

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('Added 1 section:')
            expect(textContent).toContain('My Section Name')
            expect(textContent).toContain(`id=${TEST_IDS.SECTION_2}`)
            expect(textContent).toContain(`Use ${FIND_TASKS} with sectionId`)
        })
    })

    describe('creating multiple sections', () => {
        it('should create multiple sections and return mapped results', async () => {
            const mockSections = [
                createMockSection({
                    id: 'section-1',
                    projectId: TEST_IDS.PROJECT_TEST,
                    name: 'First Section',
                }),
                createMockSection({
                    id: 'section-2',
                    projectId: TEST_IDS.PROJECT_TEST,
                    name: 'Second Section',
                }),
                createMockSection({
                    id: 'section-3',
                    projectId: 'different-project',
                    name: 'Third Section',
                }),
            ]

            const [section1, section2, section3] = mockSections as [Section, Section, Section]
            mockTodoistApi.addSection
                .mockResolvedValueOnce(section1)
                .mockResolvedValueOnce(section2)
                .mockResolvedValueOnce(section3)

            const result = await addSections.execute(
                {
                    sections: [
                        { name: 'First Section', projectId: TEST_IDS.PROJECT_TEST },
                        { name: 'Second Section', projectId: TEST_IDS.PROJECT_TEST },
                        { name: 'Third Section', projectId: 'different-project' },
                    ],
                },
                mockTodoistApi,
            )

            // Verify API was called correctly for each section
            expect(mockTodoistApi.addSection).toHaveBeenCalledTimes(3)
            expect(mockTodoistApi.addSection).toHaveBeenNthCalledWith(1, {
                name: 'First Section',
                projectId: TEST_IDS.PROJECT_TEST,
            })
            expect(mockTodoistApi.addSection).toHaveBeenNthCalledWith(2, {
                name: 'Second Section',
                projectId: TEST_IDS.PROJECT_TEST,
            })
            expect(mockTodoistApi.addSection).toHaveBeenNthCalledWith(3, {
                name: 'Third Section',
                projectId: 'different-project',
            })

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('Added 3 sections:')
            expect(textContent).toContain('First Section (id=section-1, projectId=')
            expect(textContent).toContain('Second Section (id=section-2, projectId=')
            expect(textContent).toContain(
                'Third Section (id=section-3, projectId=different-project)',
            )

            // Verify structured content
            const structuredContent = extractStructuredContent(result)
            expect(structuredContent).toEqual(
                expect.objectContaining({
                    sections: mockSections,
                    totalCount: 3,
                }),
            )
        })

        it('should handle sections for the same project', async () => {
            const mockSections = [
                createMockSection({
                    id: 'section-1',
                    projectId: TEST_IDS.PROJECT_TEST,
                    name: 'To Do',
                }),
                createMockSection({
                    id: 'section-2',
                    projectId: TEST_IDS.PROJECT_TEST,
                    name: 'In Progress',
                }),
            ]

            const [section1, section2] = mockSections as [Section, Section]
            mockTodoistApi.addSection
                .mockResolvedValueOnce(section1)
                .mockResolvedValueOnce(section2)

            const result = await addSections.execute(
                {
                    sections: [
                        { name: 'To Do', projectId: TEST_IDS.PROJECT_TEST },
                        { name: 'In Progress', projectId: TEST_IDS.PROJECT_TEST },
                    ],
                },
                mockTodoistApi,
            )

            const textContent = extractTextContent(result)
            expect(textContent).toMatchSnapshot()
            expect(textContent).toContain('Added 2 sections:')
            expect(textContent).toContain(`Use ${ADD_TASKS} to add tasks to these new sections`)
        })
    })

    describe('error handling', () => {
        it('should propagate API errors', async () => {
            const apiError = new Error('API Error: Section name is required')
            mockTodoistApi.addSection.mockRejectedValue(apiError)

            await expect(
                addSections.execute(
                    { sections: [{ name: '', projectId: TEST_IDS.PROJECT_TEST }] },
                    mockTodoistApi,
                ),
            ).rejects.toThrow('API Error: Section name is required')
        })

        it('should handle partial failures in multiple sections', async () => {
            const mockSection = createMockSection({
                id: 'section-1',
                projectId: TEST_IDS.PROJECT_TEST,
                name: 'First Section',
            })

            mockTodoistApi.addSection
                .mockResolvedValueOnce(mockSection)
                .mockRejectedValueOnce(new Error('API Error: Invalid project ID'))

            await expect(
                addSections.execute(
                    {
                        sections: [
                            { name: 'First Section', projectId: TEST_IDS.PROJECT_TEST },
                            { name: 'Second Section', projectId: 'invalid-project' },
                        ],
                    },
                    mockTodoistApi,
                ),
            ).rejects.toThrow('API Error: Invalid project ID')
        })
    })
})
