/**
 * Centralized tool names module
 *
 * This module provides a single source of truth for all tool names used throughout the codebase.
 * Each tool should import its own name from this module to avoid hardcoded strings.
 * This prevents outdated references when tool names change.
 */
export const ToolNames = {
    // Task management tools
    ADD_TASKS: 'add-tasks',
    COMPLETE_TASKS: 'complete-tasks',
    UPDATE_TASKS: 'update-tasks',
    FIND_TASKS: 'find-tasks',
    FIND_TASKS_BY_DATE: 'find-tasks-by-date',
    FIND_COMPLETED_TASKS: 'find-completed-tasks',

    // Project management tools
    ADD_PROJECTS: 'add-projects',
    UPDATE_PROJECTS: 'update-projects',
    FIND_PROJECTS: 'find-projects',

    // Section management tools
    ADD_SECTIONS: 'add-sections',
    UPDATE_SECTIONS: 'update-sections',
    FIND_SECTIONS: 'find-sections',

    // General tools
    GET_OVERVIEW: 'get-overview',
    DELETE_OBJECT: 'delete-object',
} as const

// Type for all tool names
export type ToolName = (typeof ToolNames)[keyof typeof ToolNames]
