# ---- build stage ----
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Install deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ---- runtime stage ----
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Only what we need to run
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

# If you use Prisma at runtime and need generated client:
# (Usually it's generated during npm ci via postinstall, so this may be redundant)
# RUN npx prisma generate --schema prisma/schema.prisma

EXPOSE 3000
CMD ["node", "dist/main.js"]
