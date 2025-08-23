# syntax=docker/dockerfile:1

# Install Bun in a separate stage for better caching
FROM node:22-alpine AS bun-installer
RUN apk add --no-cache curl unzip bash
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# Runtime stage
FROM node:22-alpine

# Copy Bun from installer stage
COPY --from=bun-installer /root/.bun /root/.bun
ENV PATH="/root/.bun/bin:$PATH"

# Set working directory
WORKDIR /app

# Environment variables for better performance
ENV CI=true
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=development

# Copy package files first for better layer caching
COPY package.json bun.lockb* ./

# Install dependencies with Bun (faster than npm)
RUN bun install --frozen-lockfile

# Copy source code after dependencies are installed
COPY . .

# Expose port
EXPOSE 9000

# Health check for development
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:9000 || exit 1

# Use Bun to run the development server (faster startup)
CMD ["bun", "run", "dev", "--hostname", "0.0.0.0", "--port", "9000"]
