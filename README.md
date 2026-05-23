# OpsPilot - AI-Assisted B2B Event Operations Platform

OpsPilot is a full-stack B2B SaaS platform for managing online events, audience access policies, content modules, analytics dashboards, operational recommendations and audit logs.

The project is designed as a production-style portfolio project for frontend and full-stack developer roles, with a focus on realistic SaaS workflows rather than simple CRUD screens.

## Project Status

Currently in foundation setup.

Planned MVP:

- Authentication and role-based access control
- Event operations dashboard
- Event CRUD and readiness score
- Audience access policy builder
- Content module management
- Analytics dashboard with seed data
- Rule-based AI-assisted recommendations
- Audit logs

## Tech Stack

### Frontend

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- React Hook Form
- Zod
- Recharts

### Backend

- NestJS
- TypeScript
- PostgreSQL
- Prisma
- JWT authentication
- Passport
- Class-validator
- Jest

## Project Structure

```txt
apps/
  web/   # Next.js frontend
  api/   # NestJS backend

packages/
  shared/ # Shared types/constants, planned

prisma/
  schema.prisma # Planned database schema
  seed.ts       # Planned demo seed data
```

## Local Development

Install dependencies from the repository root:

```bash
npm install
```

Run the frontend:

```bash
npm run dev:web
```

Run the backend:

```bash
npm run dev:api
```

Build the frontend:

```bash
npm run build:web
```

Build the backend:

```bash
npm run build:api
```

Run backend tests:

```bash
npm run test:api
```

## Environment Variables

Copy `.env.example` to `.env` and update values as needed.

```bash
cp .env.example .env
```

Required variables:

```env
DATABASE_URL="postgresql://opspilot:opspilot@localhost:5432/opspilot?schema=public"
PORT=4000
JWT_SECRET="replace-with-a-secure-secret"
JWT_EXPIRES_IN="7d"
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

## Demo Accounts

Demo accounts will be available after the authentication and seed data setup is complete.

Planned accounts:

```txt
Admin:
admin@opspilot.dev / password123

Event Manager:
manager@opspilot.dev / password123

Analyst:
analyst@opspilot.dev / password123

Viewer:
viewer@opspilot.dev / password123
```

## Key documents:

- Master design and roadmap
- GitHub issues breakdown
- Portfolio analysis
- Implementation plan

## License

This project is intended as a portfolio project.
