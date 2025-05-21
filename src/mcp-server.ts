import { TodoistApi } from "@doist/todoist-api-typescript";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { registerTool } from "./mcp-helpers.js";
import { tasksByDateRange } from "./tools/tasks-by-date-range.js";

const instructions = `
Tools to help you manage your todoist tasks.
`;

/**
 * Start the MCP server.
 * @param todoistApiKey - The API key for the todoist account.
 * @param transport - The transport to use for communication. Defaults to standard input/output.
 * @returns A promise that resolves when the server is started.
 */
export async function startMcpServer({
	todoistApiKey,
	transport,
}: {
	todoistApiKey: string;
	transport?: Transport;
}) {
	const server = new McpServer(
		{ name: "todoist-mcp-server", version: "0.1.0" },
		{ instructions },
	);

	const todoist = new TodoistApi(todoistApiKey);

	registerTool(tasksByDateRange, server, todoist);

	await server.connect(transport ?? new StdioServerTransport());
}
