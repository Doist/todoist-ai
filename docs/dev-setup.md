# Development Setup

## 1. Install dependencies and set up environment

```sh
npm run setup
```

## 2. Configure environment variables

Update the `.env` file with your Todoist token:

```env
TODOIST_API_KEY=your-key-goes-here
TODOIST_BASE_URL=https://local.todoist.com/api/v1
```

The `TODOIST_BASE_URL` is optional and defaults to the official Todoist API endpoint. You may need to change this for development or testing purposes.

## 3. Run the MCP server with inspector

### For development (with auto-rebuild):

```sh
npm run dev
```

This command starts the TypeScript compiler in watch mode and automatically restarts the [MCP inspector](https://modelcontextprotocol.io/docs/tools/inspector) whenever you make changes to the source code.

In MCP Inspector, ensure that the Transport type is `STDIO`, the command is `npx` and the arguments `nodemon --quiet --watch dist --ext js --exec node dist/main.js`, this will make sure that the MCP inspector is pointing at your locally running setup.

### For testing the built version:

```sh
npm start
```

This command builds the project and runs the MCP inspector once with the compiled code. Use this to test the final built version without auto-reload functionality.
