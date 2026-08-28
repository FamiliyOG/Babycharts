# ─────────────────────────────────────────────────────────────────────────────
# BabyCharts Dockerfile
# Base: node:22-slim + Chromium (for Puppeteer server-side PDF generation)
# Compatible with Unraid, Docker Desktop, and standard Linux hosts.
# ─────────────────────────────────────────────────────────────────────────────

# Pin base image by immutable multi-arch digest (node:22-slim)
FROM node@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5 AS base

# Install Chromium and runtime dependencies, plus python3 and build-essential for better-sqlite3 compilation
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libx11-6 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    python3 \
    make \
    g++ \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to skip downloading its own Chromium (we installed the system one)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# ─── Install dependencies ────────────────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
RUN npm ci --ignore-scripts && npm rebuild better-sqlite3

# ─── Build frontend ──────────────────────────────────────────────────────────
FROM deps AS builder
COPY . .
RUN npm run build

# ─── Production image ────────────────────────────────────────────────────────
FROM base AS production

WORKDIR /app

# Copy dependencies and compiled native binaries from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy server source
COPY server ./server

# Create default data directory and ensure non-root node user owns /app
RUN mkdir -p ./server/data && chown -R node:node /app

# Run as non-root node user for container security
USER node

# Default environment
ENV PORT=3001
ENV APP_URL=http://localhost:3001
ENV NODE_ENV=production

EXPOSE 3001

# Healthcheck: verify the server responds
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://localhost:3001/api/settings').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]
