# Widgets

Widgets are interactive UI components that can be displayed inline within AI chat conversations. They provide rich, visual representations of tool outputs instead of plain text responses.

## Overview

We support both [ChatGPT Apps](https://openai.com/index/introducing-apps-in-chatgpt/) and [MCP Apps](https://blog.modelcontextprotocol.io/posts/2025-11-21-mcp-apps/) with a shared widget bundle and a thin host bridge. Currently, this is used to display a task list widget when users query tasks by date.

### How It Works

1. A tool (e.g. `find-tasks-by-date`) returns structured data
2. The tool metadata includes:
    - `openai/outputTemplate` for ChatGPT Apps
    - `ui.resourceUri` for MCP Apps
3. The MCP server registers the widget HTML as two resources (ChatGPT + MCP MIME types)
4. The AI client fetches the resource and renders it in a sandboxed iframe
5. The widget receives tool output via the host bridge (`window.openai.toolOutput`)
6. The widget can call tools via `window.openai.callTool`

## Architecture

### Build Pipeline

Widgets are built through a custom Vite plugin that produces self-contained HTML files:

```
src/widgets/task-list/widget.tsx
        ↓
[Vite Plugin: inline-widgets-vite-plugin.ts]
        ↓
[esbuild: bundle + minify]
        ↓
[Inject into template.html]
        ↓
dist/dev/task-list-widget.html (preview, dev)
        +
virtual:todoist-ai-widgets (runtime module)
```

### Key Components

#### 1. Vite Plugin (`scripts/inline-widgets-vite-plugin.ts`)

The plugin:

-   Builds widgets during Vite's build process
-   Creates a **virtual module** (`virtual:todoist-ai-widgets`) that exports the compiled widget
-   Watches widget source files in development mode for hot rebuilding
-   Writes preview HTML files to `dist/dev/` for local testing

#### 2. Widget Builder (`scripts/inline-widget-builder.ts`)

Uses esbuild to:

-   Bundle the widget entry file (TSX) with all dependencies
-   Minify the output for production
-   Convert SVG assets to data URLs
-   Inject the bundled JS/CSS into an HTML template

#### 3. Widget Loader (`src/utils/widget-loader.ts`)

Runtime utility that:

-   Imports the widget from the virtual module
-   Provides a fallback if the widget wasn't built
-   Makes the widget content available to the MCP server

#### 4. Resource Registration (`src/mcp-server.ts`)

The MCP server:

-   Loads the widget content at startup
-   Registers it as MCP resources with distinct URIs for ChatGPT and MCP Apps
-   Adds metadata for both hosts (`openai/outputTemplate`, `ui.resourceUri`)

## Local Development

### Development Commands

```bash
# Full development mode (MCP server + widgets rebuild)
npm run dev

# Widget-only development (faster iteration)
npm run dev:widget
```

### Preview Widgets Locally

After building, widgets are output to `dist/dev/`:

```bash
npm run build
open dist/dev/task-list-widget.html
```

The preview HTML renders with placeholder styling. Note that `window.openai` won't be available locally, so the widget will show a loading state. You can hard-code data to test different flows for now.

## Testing in todoist-ai-integrations

> ⚠️ Doist-internal for the hosted MCP Server

1. Build todoist-ai: `npm run build`
2. Make todoist-ai linkable: `npm link`
3. Switch to `todoist-ai-integrations` and link: `npm link @doist/todoist-ai`
4. Run the MCP server as usual `npm run start:dev`

This way you should be able to test your locally running server directly in chatgpt.com.
