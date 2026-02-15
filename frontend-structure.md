frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  // App-level layout, AuthProvider, Tailwind import
│   │   ├── page.tsx                    // Home page ("/")
│   │   ├── login/
│   │   │   └── page.tsx                // "/login"
│   │   ├── register/
│   │   │   └── page.tsx                // "/register"
│   │   ├── owner/
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx            // "/owner/dashboard"
│   │   │   ├── menu/
│   │   │   │   └── page.tsx            // "/owner/menu"
│   │   │   ├── tables/
│   │   │   │   └── page.tsx            // "/owner/tables"
│   │   ├── t/
│   │   │   ├── [tableId]/
│   │   │   │   └── page.tsx            // "/t/[tableId]"
│   │   └── globals.css                 // Tailwind base styles
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── OwnerMenuForm.tsx
│   │   ├── OwnerTableForm.tsx
│   │   ├── MenuList.tsx
│   │   ├── TableRequests.tsx
│   │   └── StatsCards.tsx
│   └── lib/
│       └── api.ts                      // API fetchers (fetch/axios wrapper)
├── public/
│   └── ... assets ...
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── package.json
├── .env.example