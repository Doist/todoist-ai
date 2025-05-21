# Todoist AI Tools

A set of tools to connect to AI agents, to allow them to use Todoist on a user's behalf.

These tools can be used both through an MCP server, or imported directly in other projects to
integrate them to your own AI conversational interfaces.

## Using tools

### 1. Add this repository as a dependency

```sh
npm install github:doist/todoist-ai-tools
```

### 2. Import the tools and plug them to an AI

Here's an example using [Vercel's AI SDK](https://ai-sdk.dev/docs/ai-sdk-core/generating-text#streamtext).

```js
import { tasksByDateRange } from "todoist-ai-tools/tools";
import { streamText } from "ai";

const result = streamText({
    model: yourModel,
    system: "You are a helpful Todoist assistant",
    tools: {
        tasksByDateRange,
    },
});
```

## MCP server setup

### 1. Clone this repository

```sh
git clone https://github.com/doist/todoist-ai-tools
```

### 2. Install dependencies and set up environment

```sh
npm run setup
```

### 3. Add this `todoist-ai-tools` section to your `mcp.json` config in Cursor, Claude, Raycast, etc.

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

### 4. Update the configuration above as follows

- Replace `TODOIST_API_KEY` with your Todoist API token.
- Replace the path in the `args` array with the correct path to where you cloned the repository

## Features

A key feature of this project is that tools can be reused, and are not written specifically for use in an MCP server. They can be hooked up as tools to other conversational AI interfaces (e.g. Vercel's AI SDK).

This project is in its early stages. Expect more and/or better tools soon.

Nevertheless, our goal is to provide a small set of tools that enable complete workflows, rather than just atomic actions, striking a balance between flexibility and efficiency for LLMs.

### Available Tools

-   **tasks-by-date-range**: Lists all tasks in a date range.

## Dependencies

-   MCP server using the official [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk?tab=readme-ov-file#installation)
-   Todoist Typescript API client [@doist/todoist-api-typescript](https://github.com/Doist/todoist-api-typescript)

## Development Setup

### 1. Install dependencies and set up environment

```sh
npm run setup
```

### 2. Configure environment variables

Update the `.env` file with your Todoist token:

```env
TODOIST_API_KEY=your-key-goes-here
```

### 3. Run the MCP server with inspector

```sh
npm run dev
```

This command will start a web server running the [MCP inspector](https://modelcontextprotocol.io/docs/tools/inspector), which allows you to try the tools manually, instead of through an AI.
