# Tool Design Guidelines

## Philosophy: Intelligent Consolidation

We use **12 workflow-focused tools** instead of 30+ API-endpoint tools.

**Traditional** (API-centric): `add-project`, `update-project`, `delete-project`, `get-project`...  
**Our approach** (workflow-centric): `manage-projects` (handles create/update), `delete-object` (universal deletion)

## Core Principles

1. **User Intent Over API Structure** - Match workflows, not API organization
2. **Batch Operations** - Support multiple items when logical (`add-tasks` takes array)
3. **Smart Branching** - Auto-detect intent (`manage-projects` creates vs updates based on ID presence)
4. **Context-Aware Responses** - Provide next-step suggestions after operations
5. **Universal Patterns** - Unify similar operations (`delete-object` handles all entity types)

## Implementation Pattern

```typescript
// Smart branching based on parameters
if (args.id) {
    // Update existing
} else {
    // Create new
}

// Always return both structured data AND human-readable text with next steps
return getToolOutput({
    textContent: `Action completed: ${result}\n${formatNextSteps(suggestions)}`,
    structuredContent: { data, metadata }
})
```

## Key Design Decisions

| Choice | Rationale |
|--------|-----------|
| `manage-projects` (create/update) vs separate tools | Users don't distinguish "add" vs "update" in natural language |
| `delete-object` (universal) vs type-specific tools | Deletion logic similar across types, reduces LLM cognitive load |
| `add-tasks` (batch) vs single task | Common to add multiple related tasks at once |
| Rich responses with next steps | Maintains workflow momentum, helps LLMs choose follow-up actions |

## Guidelines

### When to Create New Tool
- Represents distinct user workflow
- Can't elegantly extend existing tools
- Has unique parameter requirements

### When to Extend Existing Tool  
- Closely related to existing tool's purpose
- Can be handled with additional parameters
- Follows same workflow pattern

### Naming & Design
- **Action verbs**: `find-`, `add-`, `manage-`, `complete-`
- **User terminology**: `complete-tasks` not `close-tasks`
- **Batch support**: When users commonly do multiple items
- **Smart defaults**: Optional parameters, auto-detect intent
- **Rich responses**: Structured data + human text + next steps

## Anti-Patterns ❌
- One-to-one API mapping without added value
- Overly complex parameters for basic operations  
- Inconsistent interfaces across similar tools
- Raw API responses without context
- Forcing multiple tool calls for related operations
