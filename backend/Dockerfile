# =========================================================
# QROO Workspace Backend (NestJS + Prisma) - Render Docker
# - Builds TypeScript into /app/dist
# - Generates Prisma client during build stage
# - Prevents Prisma postinstall from running in runtime stage
#   (avoids "schema.prisma not found" during prod-only install)
# =========================================================

# ------------------------
# 1) Build stage
# ------------------------
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Prisma sometimes needs OpenSSL libs available in containers
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install deps (including dev deps for build)
COPY package.json package-lock.json ./
# Copy Prisma schema BEFORE install because postinstall runs prisma generate
COPY prisma ./prisma
RUN npm ci

# Copy the rest of the source and build
COPY . .
RUN npm run build

# ------------------------
# 2) Runtime stage
# ------------------------
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Prisma runtime may also require OpenSSL
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# IMPORTANT:
# Disable npm lifecycle scripts so postinstall DOES NOT run here.
# (We already generated Prisma client in the build stage.)
ENV npm_config_ignore_scripts=true

# Install prod deps only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Bring in compiled app + prisma artifacts from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

# Bring in Prisma engines/client artifacts generated in build stage
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client

# If you serve local uploads in production (you do: /uploads static),
# make sure the folder exists (Render disk is ephemeral unless you mount a disk)
RUN mkdir -p /app/uploads

# Render will route to whatever PORT it sets; your app MUST listen on process.env.PORT
EXPOSE 3000

CMD ["node", "dist/main.js"]

