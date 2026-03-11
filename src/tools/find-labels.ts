import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool.js'
import { mapLabel, searchAllLabels } from '../tool-helpers.js'
import { ApiLimits } from '../utils/constants.js'
import { LabelSchema as LabelOutputSchema } from '../utils/output-schemas.js'
import { formatLabelPreview, summarizeList } from '../utils/response-builders.js'
import { ToolNames } from '../utils/tool-names.js'

const ArgsSchema = {
    search: z
        .string()
        .optional()
        .describe('Search for a label by exact name. If omitted, all labels are returned.'),
    limit: z
        .number()
        .int()
        .min(1)
        .max(ApiLimits.LABELS_MAX)
        .default(ApiLimits.LABELS_DEFAULT)
        .describe('The maximum number of labels to return.'),
    cursor: z
        .string()
        .optional()
        .describe(
            'The cursor to get the next page of labels (cursor is obtained from the previous call to this tool, with the same parameters). Ignored when search is provided.',
        ),
}

const OutputSchema = {
    labels: z.array(LabelOutputSchema).describe('The found labels.'),
    nextCursor: z.string().optional().describe('Cursor for the next page of results.'),
    totalCount: z.number().describe('The total number of labels in this page.'),
    hasMore: z.boolean().describe('Whether there are more results available.'),
    appliedFilters: z
        .record(z.string(), z.unknown())
        .describe('The filters that were applied to the search.'),
}

const findLabels = {
    name: ToolNames.FIND_LABELS,
    description:
        'List all personal labels or search for a label by exact name. When searching, all matching labels are fetched across all pages and returned as a single result set (limit and cursor are ignored). When not searching, labels are returned with pagination.',
    parameters: ArgsSchema,
    outputSchema: OutputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async execute(args, client) {
        let results: Awaited<ReturnType<typeof client.getLabels>>['results']
        let nextCursor = null

        if (args.search) {
            results = await searchAllLabels(client, args.search)
        } else {
            const response = await client.getLabels({
                limit: args.limit,
                cursor: args.cursor ?? null,
            })
            results = response.results
            nextCursor = response.nextCursor
        }

        const labels = results.map(mapLabel)

        return {
            textContent: generateTextContent({ labels, args, nextCursor }),
            structuredContent: {
                labels,
                nextCursor: nextCursor ?? undefined,
                totalCount: labels.length,
                hasMore: Boolean(nextCursor),
                appliedFilters: args,
            },
        }
    },
} satisfies TodoistTool<typeof ArgsSchema, typeof OutputSchema>

function generateTextContent({
    labels,
    args,
    nextCursor,
}: {
    labels: ReturnType<typeof mapLabel>[]
    args: z.infer<z.ZodObject<typeof ArgsSchema>>
    nextCursor: string | null
}) {
    const subject = args.search ? `All labels matching "${args.search}"` : 'Labels'

    const filterHints: string[] = []
    if (args.search) {
        filterHints.push(`search: "${args.search}"`)
    }

    const previewLimit = 10
    const previewLabels = labels.slice(0, previewLimit)
    const previewLines = previewLabels.map(formatLabelPreview).join('\n')
    const remainingCount = labels.length - previewLimit
    const previewWithMore =
        remainingCount > 0 ? `${previewLines}\n    …and ${remainingCount} more` : previewLines

    const zeroReasonHints: string[] = []
    if (labels.length === 0) {
        if (args.search) {
            zeroReasonHints.push('Search requires the exact label name')
            zeroReasonHints.push('Check spelling')
            zeroReasonHints.push('Remove search to see all labels')
        } else {
            zeroReasonHints.push('No personal labels created yet')
        }
    }

    return summarizeList({
        subject,
        count: labels.length,
        limit: args.search ? undefined : args.limit,
        nextCursor: nextCursor ?? undefined,
        filterHints,
        previewLines: previewWithMore,
        zeroReasonHints,
    })
}

export { findLabels }
