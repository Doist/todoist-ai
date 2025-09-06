# Todoist AI SDK

Library for connecting AI agents to Todoist. Includes tools that can be integrated into LLMs,
enabling them to access and modify a Todoist account on the user's behalf.

These tools can be used both through an MCP server, or imported directly in other projects to
integrate them to your own AI conversational interfaces.

## Using tools

### 1. Add this repository as a dependency

```sh
npm install @doist/todoist-ai
```

### 2. Import the tools and plug them to an AI

Here's an example using [Vercel's AI SDK](https://ai-sdk.dev/docs/ai-sdk-core/generating-text#streamtext).

```js
import { findTasksByDate, addTasks } from "@doist/todoist-ai";
import { streamText } from "ai";

const result = streamText({
    model: yourModel,
    system: "You are a helpful Todoist assistant",
    tools: {
        findTasksByDate,
        addTasks,
    },
});
```

## Using as an MCP server

You can run the MCP server directly with npx:

```bash
npx @doist/todoist-ai
```

### Secure Credential Storage

For enhanced security, you can store your Todoist API key in your system's keychain instead of using environment variables:

```bash
# Store API key securely in keychain (prompts for hidden input)
npx todoist-ai-setup-keychain

# Run - automatically uses keychain when no TODOIST_API_KEY env var is set
npx @doist/todoist-ai
```

This stores your API key securely in:
- **macOS**: Keychain Access
- **Windows**: Windows Credential Manager  
- **Linux**: Secret Service (GNOME Keyring, KWallet, etc.)

The base URL can still be configured via `TODOIST_BASE_URL` environment variable if needed.

For more details on setting up and using the MCP server, including creating custom servers, see [docs/mcp-server.md](docs/mcp-server.md).

## Features

A key feature of this project is that tools can be reused, and are not written specifically for use in an MCP server. They can be hooked up as tools to other conversational AI interfaces (e.g. Vercel's AI SDK).

This project is in its early stages. Expect more and/or better tools soon.

Nevertheless, our goal is to provide a small set of tools that enable complete workflows, rather than just atomic actions, striking a balance between flexibility and efficiency for LLMs.

For our design philosophy, guidelines, and development patterns, see [docs/tool-design.md](docs/tool-design.md).

### Available Tools

For a complete list of available tools, see the [src/tools](src/tools) directory.

## Dependencies

-   MCP server using the official [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk?tab=readme-ov-file#installation)
-   Todoist Typescript API client [@doist/todoist-api-typescript](https://github.com/Doist/todoist-api-typescript)

## MCP Server Setup

See [docs/mcp-server.md](docs/mcp-server.md) for full instructions on setting up the MCP server.

## Local Development Setup

See [docs/dev-setup.md](docs/dev-setup.md) for full instructions on setting up this repository locally for development and contributing.

### Quick Start

After cloning and setting up the repository:

- `npm start` - Build and run the MCP inspector for testing
- `npm run dev` - Development mode with auto-rebuild and restart

## Releasing

This project uses [release-please](https://github.com/googleapis/release-please) to automate version management and package publishing.

### How it works

1. Make your changes using [Conventional Commits](https://www.conventionalcommits.org/):

    - `feat:` for new features (minor version bump)
    - `fix:` for bug fixes (patch version bump)
    - `feat!:` or `fix!:` for breaking changes (major version bump)
    - `docs:` for documentation changes
    - `chore:` for maintenance tasks
    - `ci:` for CI changes

2. When commits are pushed to `main`:

    - Release-please automatically creates/updates a release PR
    - The PR includes version bump and changelog updates
    - Review the PR and merge when ready

3. After merging the release PR:
    - A new GitHub release is automatically created
    - A new tag is created
    - The `publish` workflow is triggered
    - The package is published to npm
