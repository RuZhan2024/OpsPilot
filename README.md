# OpsPilot - AI-Assisted B2B Event Operations Platform

OpsPilot is a full-stack B2B SaaS platform for managing online event operations, audience access policies, content modules, engagement tools, analytics dashboards, AI-assisted operational recommendations and audit logs.

The project is built as a production-style portfolio project for frontend and full-stack developer roles. It focuses on realistic SaaS admin workflows rather than a simple event booking or CRUD demo.

## Development Plan

The detailed implementation roadmap lives in [docs/development-plan.md](docs/development-plan.md).

It tracks the current MVP, high-value portfolio enhancements and the recommended order for future development.

## Project Status

MVP development is in progress with the main full-stack product flow implemented locally.

Completed:

- JWT authentication with protected frontend routes and NestJS guards
- Role-based access control for Admin, Event Manager, Analyst and Viewer users
- Event CRUD, status updates, archiving and readiness score
- Audience groups, event access rules and registration data
- Content module builder with preview-oriented event setup
- Engagement tools for polls, Q&A and feedback
- Workspace and event-level analytics dashboards with seed data
- Rule-based AI-assisted recommendation engine
- Audit logs for key operational actions
- Demo seed data for a realistic SaaS workspace
- Stream setup and live control mock for event operations

Still planned before public portfolio release:

- Media library and replay operations
- Audience whitelist import and approval workflow
- Analytics upgrade with livestream-specific metrics
- Final UI polish pass
- Expanded business-focused backend tests
- README screenshots
- Production deployment

## Demo Accounts

After running the seed script, use these accounts:

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

## Tech Stack

Frontend:

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- TanStack Query
- React Hook Form
- Zod
- Recharts
- lucide-react
- Sonner

Backend:

- NestJS
- TypeScript
- PostgreSQL
- Prisma
- JWT authentication
- Passport
- Class-validator
- Jest

Infrastructure:

- npm workspaces monorepo
- Docker Compose for local PostgreSQL
- Prisma migrations and seed data

## Key Features

### Authentication and RBAC

OpsPilot supports protected API routes and protected frontend pages. User permissions are driven by workspace roles:

- Admin: full workspace access, user role management and audit logs
- Event Manager: event operations for assigned events
- Analyst: read-only event and analytics access
- Viewer: limited read-only access

The frontend renders navigation and page actions based on the signed-in user's role, while the backend enforces permissions through guards and service-level ownership checks.

### Event Operations

Users can create, edit, archive and inspect events with operational metadata such as type, status, schedule, owner, registration target and readiness score.

Event detail pages connect the full setup workflow:

- Overview
- Audience
- Content
- Engagement
- Analytics
- Recommendations

### Audience Access Control

Events can be configured with audience access rules such as public, private, invite-only, email domain restricted and manual approval. The data model keeps access rules, audience groups and registrations separate to better reflect real B2B SaaS workflows.

### Content Builder

Event managers can create and manage structured content modules, including agenda items, speakers, resource links, announcements, CTA sections and replay sections.

### Engagement Tools

OpsPilot includes an event engagement workspace for:

- Poll creation and status management
- Poll result summaries
- Q&A review and answer tracking
- Feedback survey review

The MVP uses REST APIs and seed data rather than real-time WebSocket updates.

### Stream Setup and Live Control Mock

Event managers can configure operational stream settings for an event without requiring real livestream infrastructure.

The stream setup workflow includes:

- RTMP ingest server URL
- Stream key management
- Stream status tracking
- Recording and low-latency settings
- Pre-live checklist
- Desktop and mobile viewer URLs
- QR preview mock

This feature is intentionally API-backed but infrastructure-light, so the public demo remains stable while still demonstrating enterprise livestream operations thinking.

### Analytics Dashboards

The dashboard and event analytics pages use API-driven seed data to show operational metrics such as:

- Total events
- Registrations
- Attendees
- Attendance rate
- Average watch time
- Engagement score
- Poll participation rate
- Q&A count
- Feedback score

Charts are rendered with Recharts.

### AI-Assisted Recommendations

The public demo uses a rule-based recommendation engine to simulate AI-assisted operational insights. This keeps the demo stable without requiring external AI API keys.

Example rules:

- No access rule configured creates a readiness risk
- Missing content modules creates a content quality warning
- Low registration progress near event start creates an audience growth warning
- Low engagement after a completed event creates a post-event improvement recommendation
- Missing polls for a scheduled event creates an engagement warning

The architecture is designed so the recommendation engine can later be extended with LLM-based analysis.

### Audit Logs

OpsPilot records important workspace actions such as event creation, event updates, access rule changes, content module changes, poll changes and recommendation resolution. Audit logs are exposed through workspace-level and event-level activity views.

## Architecture

```mermaid
flowchart LR
  Browser["Browser / Recruiter Demo"] --> Web["Next.js Web App"]
  Web --> API["NestJS API"]
  API --> Prisma["Prisma ORM"]
  Prisma --> DB["PostgreSQL"]
  API --> Auth["JWT Auth + RBAC Guards"]
  API --> Rules["Rule-Based Recommendation Engine"]
  API --> Audit["Audit Log Service"]
```

Repository layout:

```txt
opspilot/
  apps/
    web/          # Next.js frontend
    api/          # NestJS backend
  prisma/
    schema.prisma # Database schema
    seed.ts       # Demo workspace seed data
  docs/
    development-plan.md
  docker-compose.yml
  README.md
```

## Database Schema

Core Prisma models:

- User
- Workspace
- WorkspaceMember
- Event
- AudienceGroup
- AccessRule
- Registration
- Invitation
- ContentModule
- Poll
- PollOption
- PollVote
- Question
- Feedback
- AnalyticsSnapshot
- Recommendation
- AuditLog

The schema is designed around a workspace-based B2B SaaS model with role-based membership, event ownership, operational setup data and analytics snapshots.

## API Overview

Authentication:

```txt
POST /auth/register
POST /auth/login
GET  /auth/me
```

Users:

```txt
GET   /users
GET   /users/:id
PATCH /users/:id/role
```

Workspaces:

```txt
GET   /workspaces/current
PATCH /workspaces/current
```

Events:

```txt
GET    /events
POST   /events
GET    /events/:id
PATCH  /events/:id
DELETE /events/:id
PATCH  /events/:id/status
GET    /events/:id/readiness
```

Stream settings:

```txt
GET   /events/:eventId/stream-settings
PATCH /events/:eventId/stream-settings
```

Audience:

```txt
GET    /audience-groups
POST   /audience-groups
GET    /events/:eventId/access-rules
POST   /events/:eventId/access-rules
PATCH  /access-rules/:id
DELETE /access-rules/:id
GET    /events/:eventId/registrations
```

Content modules:

```txt
GET    /events/:eventId/content-modules
POST   /events/:eventId/content-modules
PATCH  /content-modules/:id
DELETE /content-modules/:id
PATCH  /events/:eventId/content-modules/reorder
```

Engagement:

```txt
GET    /events/:eventId/polls
POST   /events/:eventId/polls
PATCH  /polls/:id
DELETE /polls/:id
GET    /polls/:id/results
GET    /events/:eventId/questions
PATCH  /questions/:id/answer
GET    /events/:eventId/feedback
```

Analytics:

```txt
GET /dashboard/summary
GET /events/:eventId/analytics
GET /events/:eventId/analytics/timeseries
```

Recommendations:

```txt
GET   /events/:eventId/recommendations
POST  /events/:eventId/recommendations/generate
PATCH /recommendations/:id/resolve
```

Audit logs:

```txt
GET /audit-logs
GET /events/:eventId/audit-logs
```

## Local Development

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Start PostgreSQL:

```bash
npm run db:up
```

Generate Prisma Client:

```bash
npm run prisma:generate
```

Run migrations:

```bash
npm run prisma:migrate
```

Seed demo data:

```bash
npm run prisma:seed
```

Start the backend:

```bash
npm run dev:api
```

Start the frontend:

```bash
npm run dev:web
```

Open the app:

```txt
http://localhost:3000
```

The API runs on:

```txt
http://localhost:4000
```

## Environment Variables

```env
DATABASE_URL="postgresql://opspilot:opspilot@localhost:5432/opspilot?schema=public"
PORT=4000
JWT_SECRET="replace-with-a-secure-secret"
JWT_EXPIRES_IN="7d"
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

## Quality Checks

Build the backend:

```bash
npm run build:api
```

Build the frontend:

```bash
npm run build:web
```

Lint the backend:

```bash
npm run lint:api
```

Lint the frontend:

```bash
npm run lint:web
```

Run backend tests:

```bash
npm run test:api
```

## Screenshots

Screenshots will be added after the final UI polish and deployment pass.

Capture checklist:

- Login page
- Dashboard overview
- Event list
- Event detail
- Stream setup
- Audience access rules
- Content builder
- Engagement tools
- Analytics dashboard
- Recommendations page
- Audit logs

## Deployment Plan

Recommended deployment setup:

- Frontend: Vercel
- Backend: Render, Railway or Fly.io
- Database: Supabase PostgreSQL, Neon or Railway PostgreSQL

The deployed demo should run with seeded data so reviewers can explore the platform without manual setup.

## Portfolio Positioning

OpsPilot is intended to support a senior frontend or full-stack developer portfolio by demonstrating:

- Complex React and Next.js admin UI development
- API-driven dashboard workflows
- Role-aware frontend rendering
- NestJS modular backend architecture
- PostgreSQL and Prisma data modelling
- Authentication and authorization
- Realistic B2B SaaS product thinking
- Analytics and operational recommendation features

## Roadmap

Recommended portfolio roadmap:

- V1.0: finish core SaaS MVP verification, UI polish, tests, screenshots and deployment
- V1.1: stream setup and live control mock for event operations
- V1.2: add media library and replay asset operations
- V1.3: add audience whitelist import and registration approval workflow
- V1.4: upgrade analytics with device, source, geography, peak viewers and drop-off metrics
- V1.5: package the project for GitHub, CV, LinkedIn and live demo review

Optional V2 improvements:

- Swagger/OpenAPI documentation
- Playwright smoke tests
- Real OpenAI integration for recommendations
- Drag-and-drop content module ordering
- Notification center
- Workspace switcher
- CSV export implementation

## License

This project is intended as a portfolio project.
