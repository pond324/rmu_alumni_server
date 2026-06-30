# Use official Bun image
FROM oven/bun:1 AS base
WORKDIR /app

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV TZ=Asia/Bangkok
# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y \
    openssl \
    chromium \
    fonts-noto \
    fonts-noto-cjk \
    fonts-thai-tlwg \
    ca-certificates \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
 && rm -rf /var/lib/apt/lists/*

# Install dependencies
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# Install production dependencies only
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Copy node_modules from temp directory and then copy all source code
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

# Generate Prisma Client for Linux
RUN bunx prisma generate

# Optional: Run tests or build steps here
# ENV NODE_ENV=production
# RUN bun test
# RUN bun run build

# Final production image
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /app .

# Create upload directory with full permissions
RUN mkdir -p /app/public/upload && chmod -R 777 /app/public/upload

# Expose port (adjust if your Elysia app uses a different port)
EXPOSE 8181

# Run the app
ENTRYPOINT [ "bun", "run", "src/index.js" ]