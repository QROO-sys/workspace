#!/bin/sh
set -e

echo "Running prisma db push..."
npx prisma db push --schema prisma/schema.prisma

echo "Starting API..."
exec node /app/dist/main.js
