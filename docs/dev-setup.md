# Development Setup

## 1. Install dependencies and set up environment

```sh
npm run setup
```

## 2. Configure credentials

You have two options for configuring your Todoist credentials:

### Option A: Using Keychain (Recommended)

Store your API key securely in the user keychain:

```sh
npm run setup-keychain
```

This will securely prompt you for your API key (hidden input with asterisks) and store it in your user's keychain (Keychain on macOS, Credential Manager on Windows, Secret Service on Linux).

The server will automatically use the keychain API key when no `TODOIST_API_KEY` environment variable is set. You can still set the base URL if needed:

```env
# Optional: Set custom base URL
TODOIST_BASE_URL=https://local.todoist.com/rest/v2
```

### Option B: Using Environment Variables

Update the `.env` file with your Todoist token:

```env
TODOIST_API_KEY=your-key-goes-here
TODOIST_BASE_URL=https://local.todoist.com/rest/v2
```

The `TODOIST_BASE_URL` is optional and defaults to the official Todoist API endpoint. You may need to change this for development or testing purposes.

## 3. Run the MCP server with inspector

### For development (with auto-rebuild):

```sh
npm run dev
```

This command starts the TypeScript compiler in watch mode and automatically restarts the [MCP inspector](https://modelcontextprotocol.io/docs/tools/inspector) whenever you make changes to the source code.

### For testing the built version:

```sh
npm start
```

This command builds the project and runs the MCP inspector once with the compiled code. Use this to test the final built version without auto-reload functionality.
