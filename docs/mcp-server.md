# MCP Server Setup

This document outlines the steps necessary to run this MCP server and connect to an MCP host application, such as Claude Desktop or Cursor.

Start by cloning this repository and setting it up locally, if you haven't done so yet.

```sh
git clone https://github.com/doist/todoist-ai-tools
npm run setup
```

Then, proceed depending on the MCP protocol transport you'll use.

## Using Standard I/O Transport

Add this `todoist-ai-tools` section to your `mcp.json` config in Cursor, Claude, Raycast, etc.

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

Update the configuration above as follows

- Replace `TODOIST_API_KEY` with your Todoist API token.
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
