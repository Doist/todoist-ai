/**
 * Centralized tool names module
 *
 * This module provides a single source of truth for all tool names used throughout the codebase.
 * Each tool should import its own name from this module to avoid hardcoded strings.
 * This prevents outdated references when tool names change.
 */

export const TOOL_NAMES = {
    // Task management tools
    TASKS_ADD_MULTIPLE: 'tasks-add-multiple',
    TASKS_COMPLETE_MULTIPLE: 'tasks-complete-multiple',
    TASKS_UPDATE_MULTIPLE: 'tasks-update-multiple',
    TASKS_SEARCH: 'tasks-search',
    TASKS_LIST_BY_DATE: 'tasks-list-by-date',
    TASKS_LIST_COMPLETED: 'tasks-list-completed',
    TASKS_LIST_FOR_CONTAINER: 'tasks-list-for-container',

    // Project management tools
    PROJECTS_LIST: 'projects-list',
    PROJECTS_MANAGE: 'projects-manage',

    // Section management tools
    SECTIONS_SEARCH: 'sections-search',
    SECTIONS_MANAGE: 'sections-manage',

    // General tools
    OVERVIEW: 'overview',
    DELETE_ONE: 'delete-one',
} as const

// Type for all tool names
export type ToolName = (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES]
