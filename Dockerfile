# Multi-stage build for optimized production image
FROM node:18-alpine AS builder

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite \
    sqlite-dev

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Set environment to production to skip dev scripts
# ENV NODE_ENV=production
ENV CI=true

# Install dependencies and rebuild native modules
# Copy source code
COPY . .

# Install dependencies (including dev for build)
RUN npm ci && \
    npm run web:build && \
    npm prune --production && \
    npm cache clean --force

# Create non-root user
RUN addgroup -g 1001 -S botbot && \
    adduser -S botbot -u 1001

# Production stage
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    sqlite

ENV NODE_ENV=production

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Copy user from builder
COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /etc/group /etc/group

# Create necessary directories
RUN mkdir -p /app/data /app/logs /app/backups && \
    chown -R botbot:botbot /app

# Switch to non-root user
USER botbot

# Expose port (if needed for health checks or webhooks)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node scripts/healthcheck.js

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
# Start the application (Both Web and Bot)
CMD ["node", "scripts/start.js"]