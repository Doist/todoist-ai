# MCP Server Setup

This document outlines the steps necessary to run this MCP server and connect to an MCP host application, such as Claude Desktop or Cursor.

## Quick Setup

The easiest way to use this MCP server is with npx:

```bash
npx @doist/todoist-ai
```

You'll need to set your Todoist API key as an environment variable `TODOIST_API_KEY`.

## Local Development Setup

Start by cloning this repository and setting it up locally, if you haven't done so yet.

```sh
git clone https://github.com/Doist/todoist-ai
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

### Using local installation

Add this `todoist-ai-tools` section to your `mcp.json` config in Cursor, Claude, Raycast, etc.

```json
{
  "mcpServers": {
    "todoist-ai-tools": {
      "type": "stdio",
      "command": "node",
      "args": ["/Users/<your_user_name>/code/todoist-ai-tools/dist/main.js"],
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

## Using SSE Transport with Per-User Authentication

The SSE (Server-Sent Events) transport enables per-user authentication, making it ideal for multi-user environments like LibreChat where each user needs their own Todoist API credentials.

### Running the SSE Server

Start the SSE server locally:

```sh
npm run start:sse
```

Or for development with auto-reload:

```sh
npm run dev:sse
```

The server will start on port 3000 by default. You can customize the port using the `PORT` environment variable:

```sh
PORT=8080 npm run start:sse
```

### LibreChat Configuration

To use the Todoist MCP server with LibreChat's per-user authentication, add the following to your LibreChat configuration:

```yaml
mcpServers:
  todoist:
    url: "http://localhost:3000/sse"
    transport: "sse"
    headers:
      X-Todoist-Token: "{{TODOIST_API_TOKEN}}"
    customUserVars:
      - name: "TODOIST_API_TOKEN"
        label: "Todoist API Token"
        type: "string"
        required: true
        description: "Your personal Todoist API token from https://todoist.com/prefs/integrations"
```

When users connect to LibreChat, they'll be prompted to enter their personal Todoist API token, which will be securely passed to the MCP server via the `X-Todoist-Token` header.

### Authentication Headers

The SSE server supports two header formats for authentication:

1. **Custom header** (recommended for LibreChat):
   ```
   X-Todoist-Token: your-todoist-api-token
   ```

2. **Authorization header** (standard OAuth format):
   ```
   Authorization: Bearer your-todoist-api-token
   ```

### Testing the SSE Server

You can test the server health endpoint:

```sh
curl http://localhost:3000/
```

Expected response:
```json
{
  "name": "Todoist MCP SSE Server",
  "version": "4.14.0",
  "status": "running",
  "endpoints": {
    "sse": "/sse",
    "message": "/message"
  },
  "activeSessions": 0
}
```

### HTTPS Support

The SSE server supports both HTTP and HTTPS modes.

#### Option 1: Direct HTTPS (Development)

For local development with self-signed certificates:

1. **Generate self-signed certificate:**

```sh
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

2. **Start server with HTTPS:**

```sh
USE_HTTPS=true \
HTTPS_KEY_PATH=./key.pem \
HTTPS_CERT_PATH=./cert.pem \
PORT=3000 \
npm run start:sse
```

3. **Update LibreChat config:**

```yaml
todoist:
  url: "https://localhost:3000/sse"
  transport: "sse"
  # ... rest of config
```

#### Option 2: Reverse Proxy (Recommended for Production)

For production, use a reverse proxy like nginx or Caddy:

**nginx example:**

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /todoist/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Pass through authentication headers
        proxy_set_header X-Todoist-Token $http_x_todoist_token;
        proxy_set_header Authorization $http_authorization;
    }
}
```

**Caddy example (automatic HTTPS):**

```
your-domain.com {
    reverse_proxy /todoist/* localhost:3000
}
```

Then start the SSE server normally (HTTP mode):

```sh
PORT=3000 npm run start:sse
```

### Deploying for Production

When deploying the SSE server for production use:

1. **Use a reverse proxy** (nginx, Caddy, etc.) with HTTPS (recommended)
2. **Configure CORS** if accessing from a different domain
3. **Set environment variables**:
   - `PORT` - Server port (default: 3000)
   - `TODOIST_BASE_URL` - Optional custom Todoist API base URL
   - `USE_HTTPS` - Enable direct HTTPS mode (true/false)
   - `HTTPS_KEY_PATH` - Path to SSL private key (if USE_HTTPS=true)
   - `HTTPS_CERT_PATH` - Path to SSL certificate (if USE_HTTPS=true)

Example deployment command:

```sh
PORT=8080 node dist/sse-server.js
```

Or using npx from the published package:

```sh
PORT=8080 npx @doist/todoist-ai-sse
```

> [!NOTE]
> The SSE server maintains separate MCP server instances for each user connection, ensuring complete isolation between users' Todoist data.

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
