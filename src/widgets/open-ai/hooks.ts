import { z } from 'zod'

import { findTasksByDate } from '../../tools/find-tasks-by-date'
import { useOpenAiGlobal } from './use-openai-global'

type OutputSchema = z.infer<z.ZodObject<typeof findTasksByDate.outputSchema>>

export function useToolOutput(): OutputSchema | null {
    return useOpenAiGlobal<OutputSchema>('toolOutput')
}
