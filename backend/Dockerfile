FROM node:20-bookworm-slim

WORKDIR /app

# Copy only what is needed for install + prisma generate first
COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci

# Now copy the rest
COPY . .

RUN npm run build

EXPOSE 3001
CMD ["npm", "run", "start:prod"]

