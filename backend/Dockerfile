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
# (we already generated prisma client in build)
ENV npm_config_ignore_scripts=true

# Install prod deps only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy compiled app + prisma artifacts from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Your app must listen on process.env.PORT inside main.ts
EXPOSE 3000

# ✅ This is the missing piece
CMD ["sh", "-c", "npx prisma db push --schema prisma/schema.prisma && node /app/dist/main.js"]
