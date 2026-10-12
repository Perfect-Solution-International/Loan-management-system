# PSI One Loan Management System

Structure-only scaffold using the existing Next.js App Router, TypeScript, Tailwind CSS, and ESLint setup. The existing workspace directory `loan-management` is the project root corresponding to `psi-one` in the requested architecture.

Existing configuration, the starter homepage, root layout, styles, and public assets are preserved. Added route pages render nothing; the dashboard layout only passes through its children. Empty directories contain `.gitkeep`. No application features, authentication, API handlers, database connections, or business logic are implemented. No additional dependencies were installed. `.env.example` is a template with no required variables.

## Commands

- `npm run dev`: start the development server.
- `npm run build`: compile the production application.
- `npm run lint`: run ESLint.
- `npm run typecheck`: generate Next.js route types and run TypeScript checks.

On Windows PowerShell, use `npm.cmd` if execution policy prevents running `npm`. The existing root layout uses Google fonts through `next/font`, so a fresh production build needs access to Google Fonts.

## Project structure

Generated dependency, build, and Git directories are omitted. Existing Next.js setup files and starter assets are included.

```text
loan-management/
├── public/
│   ├── icons/
│   │   └── .gitkeep
│   ├── images/
│   │   └── .gitkeep
│   ├── logos/
│   │   └── .gitkeep
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── audit-logs/
│   │   │   │   └── page.tsx
│   │   │   ├── collections/
│   │   │   │   └── page.tsx
│   │   │   ├── customers/
│   │   │   │   ├── [customerId]/
│   │   │   │   │   ├── edit/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── loans/
│   │   │   │   ├── [loanId]/
│   │   │   │   │   ├── schedule/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── overdue/
│   │   │   │   └── page.tsx
│   │   │   ├── repayments/
│   │   │   │   └── page.tsx
│   │   │   ├── reports/
│   │   │   │   └── page.tsx
│   │   │   ├── settings/
│   │   │   │   └── page.tsx
│   │   │   ├── staff/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   └── .gitkeep
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── forms/
│   │   │   └── .gitkeep
│   │   ├── layout/
│   │   │   └── .gitkeep
│   │   ├── modals/
│   │   │   └── .gitkeep
│   │   ├── shared/
│   │   │   └── .gitkeep
│   │   ├── tables/
│   │   │   └── .gitkeep
│   │   └── ui/
│   │       └── .gitkeep
│   ├── config/
│   │   └── .gitkeep
│   ├── constants/
│   │   └── .gitkeep
│   ├── hooks/
│   │   └── .gitkeep
│   ├── lib/
│   │   ├── auth/
│   │   │   └── .gitkeep
│   │   ├── db/
│   │   │   └── .gitkeep
│   │   ├── permissions/
│   │   │   └── .gitkeep
│   │   ├── storage/
│   │   │   └── .gitkeep
│   │   └── utils/
│   │       └── .gitkeep
│   ├── modules/
│   │   ├── audit-logs/
│   │   │   └── .gitkeep
│   │   ├── auth/
│   │   │   └── .gitkeep
│   │   ├── collections/
│   │   │   └── .gitkeep
│   │   ├── customers/
│   │   │   └── .gitkeep
│   │   ├── dashboard/
│   │   │   └── .gitkeep
│   │   ├── documents/
│   │   │   └── .gitkeep
│   │   ├── loan-calculations/
│   │   │   └── .gitkeep
│   │   ├── loans/
│   │   │   └── .gitkeep
│   │   ├── repayments/
│   │   │   └── .gitkeep
│   │   ├── reports/
│   │   │   └── .gitkeep
│   │   ├── settings/
│   │   │   └── .gitkeep
│   │   └── staff/
│   │       └── .gitkeep
│   ├── providers/
│   │   └── .gitkeep
│   └── types/
│       └── .gitkeep
├── .env.example
├── .gitignore
├── AGENTS.md
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package-lock.json
├── package.json
├── README.md
└── tsconfig.json
```
