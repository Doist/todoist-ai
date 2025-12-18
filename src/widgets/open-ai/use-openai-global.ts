import { useSyncExternalStore } from 'react'
import { type OpenAiGlobals, SET_GLOBALS_EVENT_TYPE, SetGlobalsEvent } from './types'

export function useOpenAiGlobal<T = unknown, K extends keyof OpenAiGlobals = keyof OpenAiGlobals>(
    key: K,
): T | null {
    return useSyncExternalStore(
        (onChange) => {
            if (typeof window === 'undefined') {
                return () => {}
            }

            const handleSetGlobal = (event: SetGlobalsEvent) => {
                const value = event.detail.globals[key]
                if (value === undefined) {
                    return
                }

                onChange()
            }

            window.addEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal, {
                passive: true,
            })

            return () => {
                window.removeEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal)
            }
        },
        () => window.openai?.[key] ?? null,
        () => window.openai?.[key] ?? null,
    ) as T | null
}
