# OpsPilot API Overview

The OpsPilot backend exposes a REST API built with NestJS, Prisma and PostgreSQL.

All authenticated routes require a JWT bearer token:

```txt
Authorization: Bearer <token>
```

Most routes are workspace-scoped through the authenticated user's `workspaceId`. Role checks are enforced with NestJS guards and service-level ownership checks.

## Demo Accounts

```txt
admin@opspilot.dev   / password123
manager@opspilot.dev / password123
analyst@opspilot.dev / password123
viewer@opspilot.dev  / password123
```

## Authentication

```txt
POST /auth/register
POST /auth/login
GET  /auth/me
```

Portfolio value:

- JWT authentication
- Password hashing
- Protected frontend and backend routes
- Demo-friendly account setup

## Users And Workspace

```txt
GET   /users
GET   /users/:id
PATCH /users/:id/role

GET   /workspaces/current
PATCH /workspaces/current
```

Portfolio value:

- Workspace membership model
- Admin-only role management
- Role-aware frontend rendering

## Events

```txt
GET    /events
POST   /events
GET    /events/:id
PATCH  /events/:id
DELETE /events/:id
PATCH  /events/:id/status
GET    /events/:id/readiness
GET    /events/:id/audit-logs
```

Portfolio value:

- Real CRUD workflow
- Filtering and ownership rules
- Readiness score calculation
- Audit log integration

## Audience Access

```txt
GET    /audience-groups
POST   /audience-groups

GET    /events/:eventId/access-rules
POST   /events/:eventId/access-rules
PATCH  /access-rules/:id
DELETE /access-rules/:id

GET    /events/:eventId/registrations
PATCH  /registrations/:id/approve
PATCH  /registrations/:id/reject

GET    /events/:eventId/invitations
POST   /events/:eventId/invitations/bulk
```

Portfolio value:

- Enterprise-style access control
- Manual approval workflow
- Whitelist import and validation
- Natural-language access rule preview

## Content Modules

```txt
GET    /events/:eventId/content-modules
POST   /events/:eventId/content-modules
PATCH  /content-modules/:id
DELETE /content-modules/:id
PATCH  /events/:eventId/content-modules/reorder
```

Portfolio value:

- Dynamic module forms
- Structured metadata
- Event page setup workflow

## Engagement

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

Portfolio value:

- Poll result aggregation
- Q&A moderation workflow
- Feedback review

## Stream Setup

```txt
GET   /events/:eventId/stream-settings
PATCH /events/:eventId/stream-settings
```

Portfolio value:

- Domain-specific livestream operations workflow
- Pre-live checklist
- Role-aware edit/read-only states
- Stable mock infrastructure instead of real streaming

## Media Library

```txt
GET   /media-assets
POST  /media-assets
GET   /media-assets/:id
PATCH /media-assets/:id
PATCH /media-assets/:id/archive

GET   /events/:eventId/media-assets
POST  /events/:eventId/media-assets/:assetId/attach
```

Portfolio value:

- Search, filtering and pagination
- Replay and recording asset management
- Post-event operations workflow

## Analytics

```txt
GET /dashboard/summary
GET /events/:eventId/analytics
GET /events/:eventId/analytics/timeseries
```

Analytics responses include:

- Registrations
- Attendees
- Attendance rate
- Average watch time
- Engagement score
- Poll participation
- Q&A count
- Feedback score
- Peak concurrent viewers
- Device breakdown
- Watch source breakdown
- Audience geography
- Drop-off trend

Portfolio value:

- API-driven dashboards
- Recharts visualisation
- Livestream-specific metrics

## Recommendations

```txt
GET   /events/:eventId/recommendations
POST  /events/:eventId/recommendations/generate
PATCH /recommendations/:id/resolve
```

Portfolio value:

- Rule-based AI-assisted operational recommendations
- Explainable risk detection
- Resolution workflow

## Audit Logs

```txt
GET /audit-logs
GET /events/:eventId/audit-logs
```

Portfolio value:

- Enterprise SaaS operational traceability
- Timeline/table presentation
- Logs generated from meaningful actions

## Error And Validation Strategy

The API uses DTO validation and structured exceptions to keep frontend integration predictable.

Typical status codes:

```txt
200 OK
201 Created
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
```

The frontend handles loading, error and empty states for API-driven pages.
