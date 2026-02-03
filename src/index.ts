import { FEATURE_NAMES, type Feature, type FeatureName, type Features } from './mcp-helpers.js'
import { getMcpServer } from './mcp-server.js'
// Comment management tools
import { addComments } from './tools/add-comments.js'
// Project management tools
import { addProjects } from './tools/add-projects.js'
// Section management tools
import { addSections } from './tools/add-sections.js'
// Task management tools
import { addTasks } from './tools/add-tasks.js'
import { completeTasks } from './tools/complete-tasks.js'
// General tools
import { deleteObject } from './tools/delete-object.js'
import { fetch } from './tools/fetch.js'
// Activity and audit tools
import { findActivity } from './tools/find-activity.js'
import { findComments } from './tools/find-comments.js'
import { findCompletedTasks } from './tools/find-completed-tasks.js'
// Assignment and collaboration tools
import { findProjectCollaborators } from './tools/find-project-collaborators.js'
import { findProjects } from './tools/find-projects.js'
import { findSections } from './tools/find-sections.js'
import { findTasks } from './tools/find-tasks.js'
import { findTasksByDate } from './tools/find-tasks-by-date.js'
import { getOverview } from './tools/get-overview.js'
import { listWorkspaces } from './tools/list-workspaces.js'
import { manageAssignments } from './tools/manage-assignments.js'
import { search } from './tools/search.js'
import { updateComments } from './tools/update-comments.js'
import { updateProjects } from './tools/update-projects.js'
import { updateSections } from './tools/update-sections.js'
import { updateTasks } from './tools/update-tasks.js'
import { userInfo } from './tools/user-info.js'

const tools = {
    // Task management tools
    addTasks,
    completeTasks,
    updateTasks,
    findTasks,
    findTasksByDate,
    findCompletedTasks,
    // Project management tools
    addProjects,
    updateProjects,
    findProjects,
    // Section management tools
    addSections,
    updateSections,
    findSections,
    // Comment management tools
    addComments,
    updateComments,
    findComments,
    // Activity and audit tools
    findActivity,
    // General tools
    getOverview,
    deleteObject,
    userInfo,
    // Assignment and collaboration tools
    findProjectCollaborators,
    manageAssignments,
    // Workspace tools
    listWorkspaces,
    // OpenAI MCP tools
    search,
    fetch,
}

export { tools, getMcpServer, FEATURE_NAMES, type Feature, type FeatureName, type Features }

export {
    // Task management tools
    addTasks,
    completeTasks,
    updateTasks,
    findTasks,
    findTasksByDate,
    findCompletedTasks,
    // Project management tools
    addProjects,
    updateProjects,
    findProjects,
    // Section management tools
    addSections,
    updateSections,
    findSections,
    // Comment management tools
    addComments,
    updateComments,
    findComments,
    // Activity and audit tools
    findActivity,
    // General tools
    getOverview,
    deleteObject,
    userInfo,
    // Assignment and collaboration tools
    findProjectCollaborators,
    manageAssignments,
    // Workspace tools
    listWorkspaces,
    // OpenAI MCP tools
    search,
    fetch,
}
