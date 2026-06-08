# OpsPilot Architecture

OpsPilot is a full-stack TypeScript monorepo designed as a production-style B2B SaaS admin console for online event operations.

The architecture keeps the frontend, backend and database responsibilities separate while sharing one local development workflow.

## System Overview

```mermaid
flowchart LR
  User["Recruiter / Demo User"] --> Web["Next.js App Router"]
  Web --> Client["Typed API Client"]
  Client --> API["NestJS REST API"]
  API --> Guards["JWT Auth + RBAC Guards"]
  API --> Services["Domain Services"]
  Services --> Prisma["Prisma ORM"]
  Prisma --> DB["PostgreSQL"]
  Services --> Rules["Recommendation Rules"]
  Services --> Audit["Audit Log Writer"]
```

## Monorepo Layout

```txt
opspilot/
  apps/
    web/          # Next.js frontend
    api/          # NestJS backend
  prisma/
    schema.prisma # Database schema and relations
    seed.ts       # Demo workspace seed data
  docs/
    architecture.md
    api.md
    portfolio.md
    release-checklist.md
  docker-compose.yml
  package.json
```

## Frontend Architecture

The frontend uses Next.js App Router with client-side authenticated app routes.

Core frontend responsibilities:

- Protected layouts and redirect logic
- Role-aware navigation and page actions
- API-driven tables, forms and charts
- Loading, error and empty states
- Form validation with React Hook Form and Zod
- Data fetching and cache invalidation with TanStack Query
- Charting with Recharts

Key frontend areas:

```txt
apps/web/src/app/(auth)      # login and register pages
apps/web/src/app/(app)       # authenticated SaaS console routes
apps/web/src/components      # shared app shell, auth provider and UI workflows
apps/web/src/lib             # API client and auth types
apps/web/src/test            # frontend test helpers
```

## Backend Architecture

The backend uses NestJS modules to keep each product area isolated.

Core backend responsibilities:

- Authentication and JWT issuing
- Role-based route protection
- Workspace-aware data access
- Service-level ownership checks
- DTO validation
- Prisma data access
- Audit logging for important operations
- Rule-based operational recommendations

Main modules:

```txt
AuthModule
UsersModule
WorkspacesModule
EventsModule
AudienceModule
ContentModulesModule
EngagementModule
AnalyticsModule
RecommendationsModule
AuditLogsModule
StreamSettingsModule
MediaAssetsModule
```

## Auth And RBAC Flow

```mermaid
sequenceDiagram
  participant User
  participant Web as Next.js Web
  participant API as NestJS API
  participant DB as PostgreSQL

  User->>Web: Submit login form
  Web->>API: POST /auth/login
  API->>DB: Find user and workspace role
  API-->>Web: JWT + current user
  Web->>Web: Store token and render role-aware navigation
  Web->>API: Request protected data with Authorization header
  API->>API: JwtAuthGuard + RolesGuard
  API->>DB: Query workspace-scoped data
  API-->>Web: Authorized response
```

Roles:

- `ADMIN`: full workspace access
- `EVENT_MANAGER`: manage assigned event operations
- `ANALYST`: read analytics and event data
- `VIEWER`: limited read-only access

## Data Model Shape

```mermaid
erDiagram
  Workspace ||--o{ WorkspaceMember : has
  User ||--o{ WorkspaceMember : joins
  Workspace ||--o{ Event : owns
  User ||--o{ Event : creates
  Event ||--o{ AccessRule : configures
  Event ||--o{ Registration : receives
  Event ||--o{ Invitation : invites
  Event ||--o{ ContentModule : contains
  Event ||--o{ Poll : runs
  Event ||--o{ Question : receives
  Event ||--o{ Feedback : collects
  Event ||--o{ AnalyticsSnapshot : measures
  Event ||--o{ Recommendation : generates
  Event ||--o{ StreamSetting : configures
  Event ||--o{ MediaAsset : links
  Workspace ||--o{ AuditLog : records
```

## Recommendation Engine

The public demo uses a rule-based recommendation engine rather than an external LLM.

This is intentional:

- The demo is stable without API keys.
- Recommendations are explainable and easy to test.
- The architecture can later support LLM-generated recommendations.

Example rules:

- No access rule configured creates a readiness risk.
- Missing content modules creates a content quality warning.
- Low registration progress near event start creates an audience growth warning.
- Low engagement after a completed event creates a post-event improvement recommendation.

## Testing Strategy

Backend tests focus on business rules and API service behaviour:

- Auth
- RBAC
- Event operations
- Audience workflows
- Recommendations
- Media and stream operations

Frontend tests focus on user-visible behaviour:

- Login validation
- Role-aware navigation
- Dashboard API rendering
- Event form validation

The goal is targeted confidence over high but low-value coverage.
