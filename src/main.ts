import dotenv from "dotenv";
import { startMcpServer } from "./mcp-server.js";

function main() {
	const todoistApiKey = process.env.TODOIST_API_KEY;
	if (!todoistApiKey) {
		throw new Error("TODOIST_API_KEY is not set");
	}

	startMcpServer({ todoistApiKey })
		.then(() => {
			// We use console.error because standard I/O is being used for the MCP server communication.
			console.error("Server started");
		})
		.catch((error) => {
			console.error("Error starting the Todoist MCP server:", error);
			process.exit(1);
		});
}

dotenv.config();
main();
