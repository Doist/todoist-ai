import type { Label } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool.js'
import { mapLabel } from '../tool-helpers.js'
import { ColorSchema } from '../utils/colors.js'
import { LabelSchema as LabelOutputSchema } from '../utils/output-schemas.js'
import { ToolNames } from '../utils/tool-names.js'

const LabelSchema = z.object({
    name: z.string().min(1).max(128).describe('The name of the label.'),
    color: ColorSchema,
    order: z.number().int().optional().describe('The position of the label in the label list.'),
    isFavorite: z
        .boolean()
        .optional()
        .describe('Whether the label is a favorite. Defaults to false.'),
})

const ArgsSchema = {
    labels: z.array(LabelSchema).min(1).describe('The array of labels to add.'),
}

const OutputSchema = {
    labels: z.array(LabelOutputSchema).describe('The created labels.'),
    totalCount: z.number().describe('The total number of labels created.'),
}

const addLabels = {
    name: ToolNames.ADD_LABELS,
    description: 'Add one or more new personal labels.',
    parameters: ArgsSchema,
    outputSchema: OutputSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    async execute({ labels }, client) {
        const newLabels = await Promise.all(labels.map((label) => client.addLabel(label)))
        const textContent = generateTextContent({ labels: newLabels })
        const mappedLabels = newLabels.map(mapLabel)

        return {
            textContent,
            structuredContent: {
                labels: mappedLabels,
                totalCount: mappedLabels.length,
            },
        }
    },
} satisfies TodoistTool<typeof ArgsSchema, typeof OutputSchema>

function generateTextContent({ labels }: { labels: Label[] }) {
    const count = labels.length
    const labelList = labels.map((l) => `• ${l.name} (id=${l.id})`).join('\n')
    return `Added ${count} label${count === 1 ? '' : 's'}:\n${labelList}`
}

export { addLabels }
