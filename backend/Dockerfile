# ================================
# Build stage
# ================================
FROM node:20-bookworm-slim AS build
WORKDIR /app

# OpenSSL helps Prisma on Debian-based images
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy deps + prisma schema BEFORE install (postinstall runs prisma generate)
COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ================================
# Runtime stage
# ================================
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Prevent postinstall from running in runtime stage
ENV npm_config_ignore_scripts=true

# Install prod deps only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Ensure Prisma CLI is available for db push (works even if prisma is devDependency)
RUN npm i -g prisma@5.22.0

# Copy compiled app + prisma artifacts from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy entrypoint last (so edits don't bust npm cache)
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 3000
CMD ["/app/entrypoint.sh"]
