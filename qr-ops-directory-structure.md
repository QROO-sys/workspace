qr-ops/
├── backend/
│   ├── Dockerfile
│   ├── nest-cli.json
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── main.ts
│   │   ├── auth/
│   │   ├── restaurants/
│   │   ├── tables/
│   │   ├── menu-categories/
│   │   ├── menu-items/
│   │   ├── orders/
│   │   └── users/
│   │
│   └── README.md
├── frontend/
│   ├── Dockerfile
│   ├── next.config.js
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── pages/
│       │   ├── index.tsx
│       │   ├── tables/
│       │   │   └── [tableId].tsx
│       │   ├── dashboard/
│       │   ├── login.tsx
│       ├── components/
│       └── lib/
│
├── infra/
│   ├── docker-compose.yml
│   └── database/
│       ├── init.sql
│
└── README.md