# QROO Workspace MVP (Desk QR Check‑In)

A lightweight MVP for **QROO Workspace** where each desk has a QR code. Scanning the QR code opens a guest page to:

- check in to a desk (start now)
- book a future time slot (start later)
- add hours (100 EGP/hr)
- add cafe items (coffee/tea/pastry)
- apply the rule: **1 free coffee per paid hour**

> Implementation note: the database model is still named `Table` / `Order` from the original template, but the UI and API expose them as **Desks** and **Sessions**.

---

## Pricing

- Workspace time: **100 EGP / hour** (Menu item: **Extra hour**)
- Coffee: **20 EGP** (first **N** coffees are free where **N = Extra hour qty**)
- Tea: **20 EGP**
- Pastry: **65 EGP**

### SKUs (used for the free-coffee rule)
- Extra hour: **001**
- Coffee: **002**
- Tea: **003**
- Pastry: **004**

---

## Quick start (local, recommended)

### 1) Backend
```bash
 # IMPORTANT: run from repo root, then cd into ./backend
cd backend
cp .env.example .env   # or create .env (see below)
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run start:dev
```

Backend runs on `http://localhost:3001`

### 2) Frontend
```bash
	cd ../frontend
	cp .env.example .env.local
npm install
	npm run dev -- -p 3002
```

Frontend runs on `http://localhost:3002`

---

## Environment

### Backend (`backend/.env`)
```env
DATABASE_URL="postgresql://qroo:qroo@localhost:5432/qroo?schema=public"
JWT_SECRET="changeme"
	FRONTEND_BASE_URL="http://localhost:3002"
	CORS_ORIGIN="http://localhost:3002"

# Optional seed defaults
SEED_TENANT_NAME="QROO Workspace"
SEED_OWNER_EMAIL="owner@qroo.local"
SEED_OWNER_PASSWORD="ChangeMe123!"
	SEED_FRONTEND_BASE_URL="http://localhost:3002"
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
JWT_SECRET=changeme
```

---

## Seeded data

Running `npm run seed` (backend) will create:

- Tenant: **QROO Workspace**
- Owner login: **owner@qroo.local / ChangeMe123!**
- 10 desks (Desk 1..Desk 10) with QR links `http://localhost:3000/d/<deskId>`
  - Each desk also gets a placeholder laptop serial: `QROO-LAP-001` .. `QROO-LAP-010`
- Category: Cafe & Time
- Menu items: Coffee, Tea, Pastry, Extra hour

---

## Where to use it

- Guest / customer: scan a desk QR → open `/d/<deskId>` → set hours + add-ons → **Check in**
- After ordering/booking, the app routes to `/checkout?orderId=...`
- Owner/staff: `/login` → `/owner/*` dashboard
- bookings: `/owner/bookings` (owner creates and manages future desk slots)

Admin tools:
- Live requests: `/owner/requests`
- Daily revenue analytics: `/owner/analytics`
- Staff permissions (Owner only): `/owner/users`


---

## Docker (optional)

`infra/docker-compose.yml` is included as a starting point, but for the MVP the local run above is simplest.

