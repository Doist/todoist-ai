# Todoist AI MCP Server - Development Guidelines

## Tool Schema Design Rules

### ⚠️ CRITICAL: Gemini API Compatibility

**Never use `.nullable()` on optional string fields in Zod schemas for MCP tools.**

Google's Gemini API does not support OpenAPI 3.1 style nullable types that use `["string", "null"]` format. This causes HTTP 400 errors or complete tool call failures.

### Pattern to Follow

#### ❌ WRONG - Causes Gemini API failures:
```typescript
fieldName: z.string().nullable().optional()
```

#### ✅ CORRECT - Gemini API compatible:
```typescript
fieldName: z.string().optional()
```

### Removing/Clearing Optional Fields

When you need to support clearing an optional field:

1. **Use a special string value** (not `null`)
   - For assignments: use `"unassign"`
   - For other fields: use `"remove"` or similar descriptive string

2. **Handle both legacy and new patterns in runtime logic** for backward compatibility:
   ```typescript
   if (fieldValue === null || fieldValue === 'remove') {
       // Convert to null for API call
       updateArgs = { ...updateArgs, fieldName: null }
   }
   ```

3. **Update schema description** to document the special string value

### Examples from Codebase

- **PR #181**: Fixed `responsibleUser` field - changed from `.nullable()` to using `"unassign"` string
- **Latest commit**: Fixed `deadlineDate` field - changed from `.nullable()` to using `"remove"` string

### Why This Matters

- Ensures compatibility with **all LLM providers** (OpenAI, Anthropic, Gemini, etc.)
- Maintains backward compatibility through dual handling
- Creates self-documenting APIs with explicit action strings

## Testing Requirements

When adding new tool parameters:

1. Add comprehensive test coverage for new fields
2. Test setting values
3. Test clearing values (if applicable)
4. Verify build and type checking pass
5. Run full test suite (all 333+ tests must pass)

## Documentation Requirements

When adding new tool features:

1. Update tool schema descriptions in the source file
2. Update `src/mcp-server.ts` tool usage guidelines
3. Add tests demonstrating the feature
4. Include examples in descriptions where helpful
