#!/usr/bin/env node

/**
 * Schema Validation Script for Todoist AI MCP Server
 *
 * This script validates that all tool parameter schemas follow Gemini API compatibility rules.
 * Specifically, it checks that no Zod string schemas use both .nullable() and .optional().
 *
 * This version imports the actual tools from the compiled index.js and validates their
 * runtime Zod schemas for maximum accuracy.
 *
 * Usage:
 *   npm run build && node scripts/validate-schemas.js
 *   npm run build && node scripts/validate-schemas.js --verbose
 *   npm run build && node scripts/validate-schemas.js --json
 */

import { z } from 'zod'

interface ValidationIssue {
    toolName: string
    parameterPath: string
    issue: string
    suggestion: string
}

interface ValidationResult {
    success: boolean
    issues: ValidationIssue[]
    toolsChecked: number
    parametersChecked: number
}

/**
 * Recursively walk a Zod schema and detect problematic patterns
 */
function walkZodSchema(
    schema: z.ZodTypeAny,
    path: string,
    issues: ValidationIssue[],
    toolName: string,
): void {
    // biome-ignore lint/suspicious/noExplicitAny: accessing Zod internals
    const def = schema._def as any
    const typeName = def.typeName

    // Check for ZodOptional containing a ZodNullable ZodString
    if (typeName === 'ZodOptional') {
        const innerSchema = def.innerType
        if (innerSchema?._def?.typeName === 'ZodNullable') {
            const nullableInner = innerSchema._def.innerType
            if (nullableInner?._def?.typeName === 'ZodString') {
                issues.push({
                    toolName,
                    parameterPath: path,
                    issue: 'GEMINI_API_INCOMPATIBLE: z.string().nullable().optional() pattern detected',
                    suggestion:
                        'REQUIRED FIX: Change "z.string().nullable().optional()" to "z.string().optional()" and use special strings like "remove" or "unassign" in description to handle clearing. This pattern causes HTTP 400 errors in Google Gemini API due to OpenAPI 3.1 nullable type incompatibility.',
                })
            }
        }
    }

    // Check for ZodNullable containing a ZodOptional ZodString
    if (typeName === 'ZodNullable') {
        const innerSchema = def.innerType
        if (innerSchema?._def?.typeName === 'ZodOptional') {
            const optionalInner = innerSchema._def.innerType
            if (optionalInner?._def?.typeName === 'ZodString') {
                issues.push({
                    toolName,
                    parameterPath: path,
                    issue: 'GEMINI_API_INCOMPATIBLE: z.string().optional().nullable() pattern detected',
                    suggestion:
                        'REQUIRED FIX: Change "z.string().optional().nullable()" to "z.string().optional()" and use special strings like "remove" or "unassign" in description to handle clearing. This pattern causes HTTP 400 errors in Google Gemini API due to OpenAPI 3.1 nullable type incompatibility.',
                })
            }
        }
    }

    // Recursively check nested schemas
    switch (typeName) {
        case 'ZodObject': {
            const shape = typeof def.shape === 'function' ? def.shape() : def.shape
            if (shape) {
                for (const [key, value] of Object.entries(shape)) {
                    const newPath = path ? `${path}.${key}` : key
                    walkZodSchema(value as z.ZodTypeAny, newPath, issues, toolName)
                }
            }
            break
        }
        case 'ZodArray':
            if (def.type) {
                walkZodSchema(def.type, `${path}[]`, issues, toolName)
            }
            break

        case 'ZodOptional':
        case 'ZodNullable':
        case 'ZodDefault':
            if (def.innerType) {
                walkZodSchema(def.innerType, path, issues, toolName)
            }
            break

        case 'ZodUnion':
        case 'ZodDiscriminatedUnion': {
            const options = def.options || def.discriminatedUnion
            if (Array.isArray(options)) {
                options.forEach((option: z.ZodTypeAny, index: number) => {
                    walkZodSchema(option, `${path}[union:${index}]`, issues, toolName)
                })
            }
            break
        }
        case 'ZodIntersection':
            if (def.left) walkZodSchema(def.left, `${path}[left]`, issues, toolName)
            if (def.right) walkZodSchema(def.right, `${path}[right]`, issues, toolName)
            break

        case 'ZodRecord':
            if (def.valueType) {
                walkZodSchema(def.valueType, `${path}[value]`, issues, toolName)
            }
            break

        case 'ZodTuple':
            if (def.items) {
                def.items.forEach((item: z.ZodTypeAny, index: number) => {
                    walkZodSchema(item, `${path}[${index}]`, issues, toolName)
                })
            }
            break
    }
}

/**
 * Validate a single tool's parameter schema
 */
// biome-ignore lint/suspicious/noExplicitAny: this is a tooling script
function validateToolSchema(tool: any): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const toolName = tool.name || 'unknown'

    if (!tool.parameters) {
        return issues
    }

    try {
        const schema = z.object(tool.parameters)
        walkZodSchema(schema, '', issues, toolName)
    } catch (error) {
        issues.push({
            toolName,
            parameterPath: 'root',
            issue: `Failed to analyze schema: ${error}`,
            suggestion: 'Check that the tool parameters are valid Zod schemas',
        })
    }

    return issues
}

/**
 * Main validation function using runtime schema analysis
 */
async function validateAllSchemas(verbose: boolean = false): Promise<ValidationResult> {
    try {
        const { tools } = await import(`${process.cwd()}/dist/index.js`)

        const allIssues: ValidationIssue[] = []
        let totalParameters = 0
        const toolNames = Object.keys(tools)

        for (const toolName of toolNames) {
            const tool = tools[toolName]
            const toolIssues = validateToolSchema(tool)
            allIssues.push(...toolIssues)

            // Count parameters for stats
            if (tool.parameters) {
                try {
                    const schema = z.object(tool.parameters)
                    // biome-ignore lint/suspicious/noExplicitAny: accessing Zod internals
                    const def = schema._def as any
                    const shape = typeof def.shape === 'function' ? def.shape() : def.shape
                    if (shape) {
                        totalParameters += Object.keys(shape).length
                    }
                } catch {
                    // Skip counting if schema is invalid
                }
            }

            if (verbose) {
                const issueCount = toolIssues.length
                const status = issueCount === 0 ? '✅' : `❌ (${issueCount} issues)`
                const paramCount = tool.parameters ? Object.keys(tool.parameters).length : 0
                console.log(`${status} ${toolName} (${paramCount} parameters)`)

                if (issueCount > 0) {
                    toolIssues.forEach((issue) => {
                        console.log(`    ${issue.parameterPath}: ${issue.issue}`)
                    })
                }
            }
        }

        return {
            success: allIssues.length === 0,
            issues: allIssues,
            toolsChecked: toolNames.length,
            parametersChecked: totalParameters,
        }
    } catch (error) {
        return {
            success: false,
            issues: [
                {
                    toolName: 'system',
                    parameterPath: 'import',
                    issue: `Failed to import tools: ${error}`,
                    suggestion: 'Ensure the project is built and dist/index.js exists',
                },
            ],
            toolsChecked: 0,
            parametersChecked: 0,
        }
    }
}

/**
 * CLI interface
 */
async function main() {
    const args = process.argv.slice(2)
    const verbose = args.includes('--verbose')
    const jsonOutput = args.includes('--json')

    try {
        const result = await validateAllSchemas(verbose)

        if (jsonOutput) {
            console.log(JSON.stringify(result, null, 2))
        } else {
            if (result.success) {
                console.log('✅ Schema validation passed!')
                console.log(
                    `   Checked ${result.toolsChecked} tools with ${result.parametersChecked} parameters`,
                )
                console.log(
                    '   All schemas are Gemini API compatible (no .nullable() on optional strings)',
                )
            } else {
                console.log('❌ Schema validation failed!')
                console.log(
                    `   Found ${result.issues.length} issue(s) in ${result.toolsChecked} tools:\n`,
                )

                result.issues.forEach((issue, index) => {
                    console.log(`\n${index + 1}. 🚫 VALIDATION FAILURE`)
                    console.log(`   Tool: ${issue.toolName}`)
                    console.log(`   Parameter: ${issue.parameterPath}`)
                    console.log(`   Issue: ${issue.issue}`)
                    console.log(`   Action Required: ${issue.suggestion}`)
                    console.log(`   File Location: src/tools/${issue.toolName}.ts`)
                    console.log(`   Fix Pattern: Remove .nullable() from the parameter schema`)
                    console.log(
                        `   Example Fix: Change z.string().nullable().optional() → z.string().optional()`,
                    )
                    console.log(
                        `   ⚠️  This validation failure will cause Gemini API HTTP 400 errors\n`,
                    )
                })
            }
        }

        process.exit(result.success ? 0 : 1)
    } catch (error) {
        console.error('Fatal error during schema validation:', error)
        process.exit(1)
    }
}

// Run if this script is executed directly
if (process.argv[1]?.endsWith('validate-schemas.js')) {
    main()
}

export type { ValidationResult, ValidationIssue }
export { validateAllSchemas }
