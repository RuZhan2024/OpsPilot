# OpsPilot Portfolio Notes

Use this document as source material for GitHub, CV, LinkedIn and interview walkthroughs.

## One-Line Description

OpsPilot is a full-stack B2B SaaS platform for managing online event operations, audience access rules, content modules, livestream setup, replay assets, analytics dashboards and AI-assisted operational recommendations.

## GitHub Short Description

```txt
AI-assisted B2B event operations platform built with Next.js, NestJS, PostgreSQL and Prisma.
```

## GitHub Topics

```txt
nextjs
nestjs
typescript
react
postgresql
prisma
saas
dashboard
full-stack
portfolio-project
```

## CV Project Entry

**OpsPilot - AI-Assisted B2B Event Operations Platform**  
*Next.js, TypeScript, React, NestJS, PostgreSQL, Prisma, JWT, Tailwind CSS, Recharts, Vitest*

- Built a full-stack B2B SaaS platform for managing online event operations, audience access rules, content modules, engagement tools, livestream setup, replay assets and analytics dashboards.
- Implemented JWT authentication and role-based access control for Admin, Event Manager, Analyst and Viewer users across protected frontend routes and NestJS API guards.
- Designed PostgreSQL and Prisma models for workspaces, events, access rules, registrations, invitations, content modules, stream settings, media assets, recommendations and audit logs.
- Developed API-driven dashboard interfaces with reusable React components, validated forms, data tables, loading/error/empty states and Recharts-based analytics views.
- Added a rule-based AI-assisted recommendation engine to identify readiness risks, audience growth issues, content gaps and post-event improvement actions.
- Added focused frontend and backend tests covering auth, RBAC, event forms, dashboard rendering and business-critical service logic.

## LinkedIn Project Description

```txt
OpsPilot is a full-stack B2B SaaS dashboard for managing online event operations, including event setup, audience access rules, content modules, livestream configuration, replay assets, analytics and AI-assisted recommendations.

Built with Next.js, TypeScript, React, NestJS, PostgreSQL, Prisma and Tailwind CSS, the project focuses on production-style SaaS workflows such as JWT authentication, role-based access control, API-driven dashboards, validated forms, operational risk detection, audit logs and targeted frontend/backend testing.
```

## Interview Demo Script

Target length: 8-10 minutes.

1. Start with the product positioning:

   ```txt
   OpsPilot is not an event booking app. It is a B2B SaaS operations console for teams running webinars, product launches, town halls and internal livestreams.
   ```

2. Log in as Admin and show:

   - Dashboard KPIs
   - Event readiness
   - Recent recommendations
   - Role-aware sidebar

3. Open an event detail page and show:

   - Readiness score
   - Setup workflow tabs
   - Audience/content/engagement/analytics/recommendations links

4. Show audience access:

   - Access rule preview
   - Domain restrictions
   - Invitation import
   - Approval queue

5. Show livestream-specific workflows:

   - Stream setup mock
   - Media library
   - Event media/replay workflow

6. Show analytics:

   - Peak viewers
   - Device/source/geography charts
   - Drop-off trend
   - Event-level timeseries

7. Show recommendations and audit logs:

   - Explain rule-based AI-assisted recommendations
   - Explain why no external AI API is required for the public demo
   - Show enterprise audit trail

8. Close with engineering depth:

   - Next.js App Router frontend
   - NestJS modular backend
   - Prisma/PostgreSQL schema
   - JWT/RBAC
   - Tests and deployment plan

## Strong Talking Points

- The project is scoped as a recruiter-friendly production-style demo, not a giant unfinished product.
- The AI-assisted recommendation engine is rule-based for demo stability and designed for future LLM integration.
- Stream setup and media/replay workflows add domain depth without requiring real streaming infrastructure.
- The data model separates audience groups, access rules, invitations and registrations instead of collapsing access control into one string field.
- Frontend tests focus on user-visible behaviour: login validation, role-aware navigation, dashboard rendering and event form validation.
- Backend tests focus on business rules and service behaviour rather than superficial controller snapshots.

## What To Avoid Saying

Avoid:

```txt
This is a clone of a real company product.
```

Use:

```txt
OpsPilot is inspired by common enterprise event operation workflows and built as an original portfolio project.
```

Avoid:

```txt
It uses AI to do everything.
```

Use:

```txt
The public demo uses explainable rule-based recommendations to simulate AI-assisted operational insights. The architecture can be extended with LLM integration later.
```

## Portfolio Case Study Outline

Use this for a personal website project page.

### Problem

Event operations teams need to prepare webinars and livestreams across multiple workflows: audience access, content setup, engagement tools, analytics and post-event replay.

### Solution

OpsPilot provides one SaaS admin console for managing the event lifecycle from setup to post-event analysis, with recommendations that highlight operational risks.

### Technical Approach

- Next.js frontend for dashboard workflows
- NestJS backend for modular REST APIs
- PostgreSQL/Prisma for relational data modelling
- JWT/RBAC for protected role-based workflows
- Recharts for analytics
- Rule-based recommendations for stable AI-assisted demo behaviour

### Result

A full-stack portfolio project that demonstrates senior frontend execution, full-stack integration, data modelling, authentication, authorization, testing and SaaS product thinking.
