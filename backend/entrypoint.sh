#!/bin/sh
set -e

echo "Running prisma db push..."
prisma db push --schema prisma/schema.prisma

echo "Starting API..."
exec node /app/dist/main.js
