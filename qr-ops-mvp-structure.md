qr-ops-mvp/
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
│   │   ├── prisma.service.ts
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── auth.service.spec.ts
│   │   ├── menu-category/
│   │   │   ├── menu-category.module.ts
│   │   │   ├── menu-category.service.ts
│   │   │   ├── menu-category.controller.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-menu-category.dto.ts
│   │   │   │   └── update-menu-category.dto.ts
│   │   │   └── menu-category.service.spec.ts
│   │   ├── services/
│   │   │   └── MessageIntelligenceService.ts
│   │   └── entities/
│   │       ├── tenant.entity.ts
│   │       ├── user.entity.ts
│   │       ├── table.entity.ts
│   │       ├── menu-category.entity.ts
│   │       ├── menu-item.entity.ts
│   │       ├── order.entity.ts
│   │       ├── order-item.entity.ts
│   │       └── table-request.entity.ts
│   └── README.md
├── frontend/
│   ├── Dockerfile
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── package.json
│   ├── .env.example
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   ├── owner/
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── menu/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── tables/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── menu-categories/
│   │   │   │   │   └── page.tsx
│   │   │   ├── t/
│   │   │   │   ├── [tableId]/
│   │   │   │   │   └── page.tsx
│   │   │   ├── api/
│   │   │   │   └── auth/
│   │   │   │       └── me/route.ts
│   │   │   ├── middleware.ts
│   │   │   ├── globals.css
│   │   ├── components/
│   │   │   ├── StatsCards.tsx
│   │   │   ├── OwnerMenuForm.tsx
│   │   │   ├── MenuList.tsx
│   │   │   ├── OwnerTableForm.tsx
│   │   │   ├── TableRequests.tsx
│   │   │   ├── MenuCategoryForm.tsx
│   │   │   └── withAuth.tsx
│   │   └── lib/
│   │       └── api.ts
│   ├── public/
│   │   └── ... assets ...
│   └── __tests__/
│       ├── MenuCategoryForm.test.tsx
│       └── ... other tests ...
├── infra/
│   ├── docker-compose.yml
│   ├── database/
│   │   └── init.sql
├── README.md