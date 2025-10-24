# Railway Deployment Guide

This guide explains how to deploy the Todoist MCP SSE Server to [Railway](https://railway.com?referralCode=TgIpfn).

## Prerequisites

- Create Railway account: https://railway.com?referralCode=TgIpfn
- This repository pushed to GitHub

## Quick Deploy

### Option 1: Deploy from GitHub (Recommended)

1. **Connect Repository to Railway:**
   - Go to https://railway.app/new
   - Click "Deploy from GitHub repo"
   - Select your repository
   - Railway will auto-detect the Dockerfile

2. **Configure Environment Variables:**
   
   In Railway project settings, add:
   - No environment variables required! Railway automatically sets `PORT`
   - Optional: `TODOIST_BASE_URL` if using a custom Todoist API endpoint

3. **Deploy:**
   - Railway automatically builds and deploys
   - You'll get a URL like `https://your-service.up.railway.app`

4. **Update LibreChat Configuration:**

```yaml
mcpServers:
  todoist:
    type: sse
    url: "https://your-service.up.railway.app/sse"
    transport: "sse"
    headers:
      X-Todoist-Token: "{{TODOIST_API_TOKEN}}"
    customUserVars:
      TODOIST_API_TOKEN:
        title: "Todoist API Token"
        description: "Enter your Todoist API key"
```

### Option 2: Deploy with Railway CLI

1. **Install Railway CLI:**

```bash
npm i -g @railway/cli
```

2. **Login:**

```bash
railway login
```

3. **Initialize Project:**

```bash
railway init
```

4. **Deploy:**

```bash
railway up
```

5. **Get URL:**

```bash
railway domain
```

## Railway Features Used

✅ **Automatic HTTPS** - Railway provides SSL/TLS termination
✅ **Auto-scaling** - Handles traffic spikes automatically  
✅ **Health Checks** - Built into Dockerfile
✅ **Environment Variables** - Easy configuration via UI
✅ **Logs** - Real-time logging in Railway dashboard
✅ **Automatic Deploys** - Push to GitHub triggers deploy

## Monitoring

View logs in Railway dashboard:
- Click your service
- Go to "Deployments" tab
- Click "View Logs"

Health check endpoint: `https://your-service.up.railway.app/`

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

## Cost Estimation

Railway pricing:
- **Hobby Plan**: $5/month + usage
- **Pro Plan**: $20/month + usage
- Usage billed per GB-hour of RAM and vCPU usage

This service is lightweight and should cost very little on top of the base plan.

## Troubleshooting

### Deployment Fails

Check Railway logs for errors:
```bash
railway logs
```

### Connection Issues

1. Verify the Railway URL is correct
2. Check that LibreChat can reach the URL
3. Ensure `X-Todoist-Token` header is being sent

### Health Check Failures

Railway will automatically restart if health checks fail 3 times. Check logs to diagnose.

## Advanced Configuration

### Custom Domain

1. Go to Railway project settings
2. Click "Domains"
3. Add your custom domain
4. Configure DNS as instructed
5. Railway automatically provisions SSL certificate

### Scaling

Railway automatically scales based on traffic. No configuration needed.

### Environment-Specific Variables

Add these in Railway settings if needed:
- `TODOIST_BASE_URL` - Custom Todoist API endpoint
- `PORT` - Already set by Railway (don't override)

## Security Notes

- ✅ Runs as non-root user (nodejs)
- ✅ HTTPS automatically enabled by Railway
- ✅ No credentials stored in environment (per-user authentication)
- ✅ Isolated MCP server instances per user
- ✅ Health checks ensure availability

## Support

For Railway-specific issues, see: https://docs.railway.app
For MCP server issues, see: [docs/mcp-server.md](docs/mcp-server.md)

