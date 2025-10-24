# Railway-optimized Dockerfile for Todoist MCP SSE Server
# Railway handles HTTPS termination, so we run HTTP only

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (skip prepare script which runs husky)
RUN npm ci --prefer-offline --no-audit --ignore-scripts

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only (skip prepare script which runs husky)
RUN npm ci --only=production --prefer-offline --no-audit --ignore-scripts

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Railway will set PORT environment variable
# Default to 3000 if not set
ENV PORT=3000

# Expose port (Railway auto-detects this)
EXPOSE 3000

# Health check for Railway monitoring
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the SSE server
CMD ["node", "dist/sse-server.js"]

