# Run QROO Workspace MVP (Local)

## Prereqs
- Node.js 20 LTS recommended
- Docker Desktop (for Postgres) or local Postgres

## Start Postgres (Docker)
```bash
docker start qroo-db || docker run --name qroo-db -d -e POSTGRES_DB=qroo -e POSTGRES_USER=qroo -e POSTGRES_PASSWORD=qroo -p 5432:5432 postgres:16
```

## Backend
```bash
cd backend
cp .env.example .env 2>/dev/null || true
# Ensure DATABASE_URL in backend/.env:
# DATABASE_URL="postgresql://qroo:qroo@localhost:5432/qroo?schema=public"

npm install
npx prisma db push --schema prisma/schema.prisma --force-reset
npm run seed
npm run start:dev
```

Backend runs on http://localhost:3001

## Frontend
```bash
cd frontend
cp .env.example .env 2>/dev/null || true
# Ensure NEXT_PUBLIC_API_URL=http://localhost:3001 in frontend/.env

npm install
npm run dev
```

Frontend runs on http://localhost:3000

Default owner login:
- owner@qroo.local
- ChangeMe123!
