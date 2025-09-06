# MCP Server Setup

This document outlines the steps necessary to run this MCP server and connect to an MCP host application, such as Claude Desktop or Cursor.

## Quick Setup

The easiest way to use this MCP server is with npx:

```bash
npx @doist/todoist-ai
```

You'll need to set your Todoist API key as an environment variable `TODOIST_API_KEY`, or store it securely in keychain (automatically used when no environment variable is set).

## Local Development Setup

Start by cloning this repository and setting it up locally, if you haven't done so yet.

```sh
git clone https://github.com/doist/todoist-ai-tools
npm run setup
```

To test the server locally before connecting it to an MCP client, you can use:

```sh
npm start
```

This will build the project and run the MCP inspector for manual testing.

### Creating a Custom MCP Server

For convenience, we also include a function that initializes an MCP Server with all the tools available:

```js
import { getMcpServer } from "@doist/todoist-ai";

async function main() {
    const server = getMcpServer({ todoistApiKey: process.env.TODOIST_API_KEY });
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
```

Then, proceed depending on the MCP protocol transport you'll use.

## Using Standard I/O Transport

### Quick Setup with npx

Add this section to your `mcp.json` config in Claude, Cursor, etc.:

#### Using Environment Variables
```json
{
    "mcpServers": {
        "todoist-ai": {
            "type": "stdio",
            "command": "npx",
            "args": ["@doist/todoist-ai"],
            "env": {
                "TODOIST_API_KEY": "your-todoist-token-here"
            }
        }
    }
}
```

#### Using Keychain (Recommended)
First, store your API key securely:
```bash
npx todoist-ai-setup-keychain
```

Then configure without any environment variables (automatically uses keychain):
```json
{
    "mcpServers": {
        "todoist-ai": {
            "type": "stdio",
            "command": "npx",
            "args": ["@doist/todoist-ai"]
        }
    }
}
```

### Using local installation

Add this `todoist-ai-tools` section to your `mcp.json` config in Cursor, Claude, Raycast, etc.

#### Using Environment Variables
```json
{
    "mcpServers": {
        "todoist-ai-tools": {
            "type": "stdio",
            "command": "node",
            "args": [
                "/Users/<your_user_name>/code/todoist-ai-tools/dist/main.js"
            ],
            "env": {
                "TODOIST_API_KEY": "your-todoist-token-here"
            }
        }
    }
}
```

#### Using Keychain (Recommended)
```json
{
    "mcpServers": {
        "todoist-ai-tools": {
            "type": "stdio",
            "command": "node",
            "args": [
                "/Users/<your_user_name>/code/todoist-ai-tools/dist/main.js"
            ]
        }
    }
}
```

Update the configuration above as follows:
- For environment variable setup: Replace `TODOIST_API_KEY` with your Todoist API token.
- For keychain setup: Run `npm run setup-keychain` first to store your API key securely.
- Replace the path in the `args` array with the correct path to where you cloned the repository

> [!NOTE]
> You may also need to change the command, passing the full path to your `node` binary, depending one how you installed `node`.

## Using Streamable HTTP Server Transport

Unfortunately, MCP host applications do not yet support connecting to an MCP server hosted via HTTP. There's a workaround to run them through a bridge that exposes them locally via Standard I/O.

Start by running the service via a web server. You can do it locally like this:

```sh
PORT=8080 npm run dev:http
```

This will expose the service at the URL http://localhost:8080/mcp. You can now configure Claude Desktop:

```json
{
	"mcpServers": {
		"todoist-mcp-http": {
            "type": "stdio",
			"command": "npx",
			"args": ["mcp-remote", "http://localhost:8080/mcp"]
		}
	}
}
```

> [!NOTE]
> You may also need to change the command, passing the full path to your `npx` binary, depending one how you installed `node`.
