# OpsPilot Development Plan

This document turns the OpsPilot product design into an implementation roadmap for a senior frontend / full-stack portfolio project.

The goal is not to build every possible event-management feature. The goal is to build a focused, production-style B2B SaaS admin console that demonstrates realistic product thinking, strong frontend execution, API integration, data modelling, authentication, authorization, analytics and operational workflows.

## Portfolio Positioning

OpsPilot should be presented as:

> A production-style full-stack B2B SaaS platform for online event operations, inspired by common enterprise livestreaming and event management workflows.

It should not be presented as:

- A clone of a specific commercial product
- A university coursework project
- A generic event booking app
- A static dashboard template

The best hiring narrative is:

> 8 years of commercial frontend experience + enterprise SaaS admin console experience + modern React/Next.js frontend capability + NestJS/PostgreSQL full-stack delivery.

## Product Boundaries

Build:

- Admin dashboard workflows
- Event operations
- Role-based access control
- Audience access rules
- Content setup
- Engagement tools
- Analytics dashboards
- AI-assisted operational recommendations
- Audit logs
- Enterprise livestream operations mock workflows
- Media/replay operations mock workflows

Do not build for the portfolio MVP:

- Real livestreaming infrastructure
- WebSocket chat
- Payment or billing
- Real email sending
- Real file upload storage
- Complex drag-and-drop
- Real AI API integration
- Multi-tenant billing

These exclusions should be treated as deliberate product scoping, not missing work.

## Current Baseline

The current local project already covers the core SaaS MVP flow:

- Next.js frontend
- NestJS backend
- PostgreSQL and Prisma
- JWT authentication
- Role-based access control
- Event CRUD
- Audience groups and access rules
- Content modules
- Engagement tools
- Analytics dashboards
- Rule-based recommendations
- Audit logs
- Workspace settings
- Seed data
- Stream setup and live control mock

The next work should focus on adding portfolio-specific differentiation rather than repeating generic CRUD.

## Version Roadmap

### V1.0 - Core SaaS MVP

Purpose:

Create a complete full-stack B2B SaaS admin platform that proves the core architecture and product flow.

Status:

Mostly implemented locally.

Core scope:

- Authentication and registration
- JWT protected API routes
- Protected frontend app layout
- Role-aware sidebar and actions
- Event CRUD
- Event readiness score
- Audience access rules
- Audience groups
- Registration data
- Content modules
- Polls, Q&A and feedback
- Dashboard analytics
- Event analytics
- Rule-based recommendation engine
- Audit logs
- Workspace settings
- Seed data
- README

Remaining V1.0 tasks:

- Final UI consistency pass
- Backend test expansion where business logic is most important
- Frontend test foundation and critical UI workflow coverage
- Screenshot capture
- Deployment
- Portfolio/CV text finalization

Acceptance criteria:

- A reviewer can log in with demo accounts
- The app has realistic data immediately after seeding
- Admin, Event Manager, Analyst and Viewer users see different capabilities
- Event setup has audience, content, engagement, analytics and recommendations
- Dashboard and event pages look like a real B2B SaaS admin console
- README explains the architecture, features, setup and demo accounts

### V1.1 - Stream Setup and Live Control Mock

Purpose:

Add the strongest enterprise-livestreaming signal without building real streaming infrastructure.

Why this matters for hiring:

This feature makes OpsPilot feel less like a generic event CRUD project and more like an operations console for online events, webinars, town halls and product launches. It demonstrates domain depth, workflow design and senior frontend product judgment.

Routes:

- `/events/[id]/stream`

Status:

Implemented locally.

Backend scope:

- Add stream settings data model or API-backed mock model
- Add stream status values:
  - `NOT_CONFIGURED`
  - `READY`
  - `RECEIVING_SIGNAL`
  - `OFFLINE`
- Add stream settings endpoint:
  - `GET /events/:eventId/stream-settings`
  - `PATCH /events/:eventId/stream-settings`
- Store or generate:
  - ingest server URL
  - stream key
  - desktop viewer URL
  - mobile viewer URL
  - stream status
  - recording enabled
  - low latency mode
  - speaker test completed
  - network check completed
  - backup stream enabled
- Add audit log entry:
  - `STREAM_SETTINGS_UPDATED`

Frontend scope:

- Event stream setup page
- Stream status card
- RTMP ingest URL display
- Stream key display with copy action
- Viewer URL display with copy action
- QR-code placeholder block
- Pre-live checklist
- Recording and latency controls
- Status selector for Admin/Event Manager
- Read-only state for Analyst/Viewer
- Link from event detail page to stream setup

Acceptance criteria:

- Admin/Event Manager can update stream settings
- Analyst/Viewer can view stream settings but cannot edit
- Copy buttons work for ingest URL, stream key and viewer URLs
- Checklist state updates through API
- Audit log records stream setting changes
- The page clearly communicates that this is a mock operational setup, not real streaming infrastructure

Suggested GitHub issues:

- `feat(api): add event stream settings model and endpoints`
- `feat(web): add event stream setup page`
- `feat(web): add stream setup link to event detail workflow`
- `test(api): cover stream settings permissions and updates`
- `docs: document stream setup as a portfolio feature`

### V1.2 - Media Library and Replay Operations

Purpose:

Add an enterprise media/replay workflow that connects event operations with post-event content management.

Why this matters for hiring:

Media library and replay workflows are common in real enterprise livestream platforms. They show that OpsPilot understands the full event lifecycle: preparation, live operation, post-event replay and content reuse.

Routes:

- `/media-library`
- `/events/[id]/media`

Status:

Implemented locally.

Backend scope:

- Add media asset model:
  - title
  - asset type
  - source
  - status
  - duration
  - size
  - thumbnail URL
  - playback URL
  - linked event
  - created by
  - created at
- Media asset types:
  - `VIDEO`
  - `REPLAY`
  - `SLIDES`
  - `IMAGE`
  - `RESOURCE`
- Media asset sources:
  - `UPLOADED`
  - `LIVE_RECORDING`
  - `REPLAY_EXPORT`
  - `EXTERNAL_LINK`
- Media asset statuses:
  - `PROCESSING`
  - `READY`
  - `FAILED`
  - `ARCHIVED`
- Add endpoints:
  - `GET /media-assets`
  - `GET /media-assets/:id`
  - `POST /media-assets`
  - `PATCH /media-assets/:id`
  - `PATCH /media-assets/:id/archive`
  - `GET /events/:eventId/media-assets`
  - `POST /events/:eventId/media-assets/:assetId/attach`
- Add optional marker model:
  - timestamp
  - label
  - note
- Add audit log entries:
  - `MEDIA_ASSET_CREATED`
  - `MEDIA_ASSET_ATTACHED`
  - `MEDIA_ASSET_ARCHIVED`

Frontend scope:

- Media library page
- Media assets table
- Search and filters
- Status badges
- Asset detail drawer or page
- Event media page
- Attach replay/media asset to event
- Marker list UI
- Clip request modal mock
- Empty/loading/error states

Acceptance criteria:

- Media library looks like a real admin data table, not a static gallery
- Assets can be filtered by type, source and status
- Assets can be linked to events
- Event pages can show replay/media setup
- The feature uses seed data so screenshots look realistic

Suggested GitHub issues:

- `feat(api): add media asset data model and endpoints`
- `feat(web): add media library table and filters`
- `feat(web): add event media and replay workflow`
- `feat(seed): add realistic media asset demo data`
- `docs: add media library to portfolio roadmap`

### V1.3 - Audience Whitelist Import and Approval Workflow

Purpose:

Upgrade audience access from simple rules to a more realistic enterprise permission workflow.

Why this matters for hiring:

This feature demonstrates complex form handling, validation, data table UX, access-control thinking and operational workflow design.

Routes:

- `/events/[id]/audience`
- `/audience-groups`

Status:

Implemented locally.

Backend scope:

- Extend invitation or registration workflow with whitelist entries
- Add duplicate email validation
- Add bulk-create endpoint:
  - `POST /events/:eventId/invitations/bulk`
- Add approval endpoint:
  - `PATCH /registrations/:id/approve`
  - `PATCH /registrations/:id/reject`
- Add audit log entries:
  - `INVITATIONS_IMPORTED`
  - `REGISTRATION_APPROVED`
  - `REGISTRATION_REJECTED`

Frontend scope:

- CSV paste/import modal
- Manual invite list
- Duplicate email warning
- Import preview table
- Approval queue
- Registration status filters
- Access rule natural-language preview

Acceptance criteria:

- Event Manager can paste a list of emails and preview the import
- Duplicate emails are detected before submit
- The UI explains access rules in human language
- Admin/Event Manager can approve/reject registrations
- Analyst/Viewer remain read-only

Suggested GitHub issues:

- `feat(api): add bulk invitation import and validation`
- `feat(api): add registration approval actions`
- `feat(web): add audience import modal`
- `feat(web): add registration approval queue`
- `test(api): cover audience import validation`

### V1.4 - Analytics Upgrade

Status: Implemented.

Purpose:

Make the analytics experience visually stronger and more specific to online event operations.

Why this matters for hiring:

Analytics screenshots are one of the fastest ways for recruiters and hiring managers to understand the project quality. The goal is to show clear, useful dashboards rather than decorative charts.

Routes:

- `/analytics`
- `/events/[id]/analytics`

Backend scope:

- Extend analytics summary with:
  - peak concurrent viewers
  - device breakdown
  - audience domain breakdown
  - traffic/source breakdown
  - geography breakdown
  - drop-off trend
- Add export mock endpoint if useful:
  - `GET /events/:eventId/analytics/export`

Frontend scope:

- Device breakdown chart
- Geography or top-location chart
- Watch source chart
- Drop-off trend chart
- Peak concurrent viewers KPI
- Export CSV mock button
- Better empty/loading/error states

Acceptance criteria:

- Dashboard includes at least three KPI cards and two charts
- Event analytics includes at least four event-specific charts/KPIs
- Charts use API data, not hardcoded frontend-only data
- The page remains readable and professional on desktop and mobile

Suggested GitHub issues:

- `feat(api): extend analytics summary with livestream metrics`
- `feat(seed): add device source geography and drop-off analytics`
- `feat(web): upgrade dashboard analytics charts`
- `feat(web): upgrade event analytics page`
- `docs: update screenshots checklist for analytics`

### V1.5 - Release Polish and Portfolio Packaging

Status: In progress.

Purpose:

Prepare OpsPilot for GitHub, live demo, CV and LinkedIn.

Scope:

- Frontend testing setup and critical workflow tests
- Architecture documentation
- API overview documentation
- Portfolio/CV/LinkedIn copy
- Release checklist
- Screenshot capture
- README screenshot section
- Architecture diagram polish
- API overview polish
- Deployment
- Demo data verification
- CV bullets
- LinkedIn project description
- Optional short portfolio case study

Acceptance criteria:

- Live demo works with seeded data
- README has screenshots
- Demo accounts work
- `npm run test:web` exists and covers critical user-visible frontend behaviour
- `npm run verify` runs API and frontend quality checks
- Core workflows can be tested by a recruiter in under 10 minutes
- CV description is concise and impact-focused
- GitHub repo looks intentional and production-style

Implemented packaging foundation:

- `docs/architecture.md`
- `docs/api.md`
- `docs/portfolio.md`
- `docs/release-checklist.md`
- README documentation links
- Root verification scripts

Suggested GitHub issues:

- `test(web): set up React Testing Library`
- `test(web): cover auth forms and role-aware navigation`
- `test(web): cover event form validation`
- `test(web): cover stream setup edit and read-only states`
- `docs: add final README screenshots`
- `docs: polish architecture and API overview`
- `chore: verify seed data for public demo`
- `chore: deploy web api and database`
- `docs: add CV and LinkedIn project copy`

## Frontend Testing Plan

Status: Foundation implemented.

Frontend tests should focus on user-visible behaviour rather than implementation details. The goal is to show testing judgment for a frontend-focused full-stack role, not to chase high coverage numbers.

Recommended stack:

- Jest or Vitest
- React Testing Library
- `@testing-library/user-event`
- `@testing-library/jest-dom`
- jsdom test environment

Minimum release coverage:

- Login form validation and failed login error state
- Register form validation
- Role-aware navigation rendering for Admin, Event Manager, Analyst and Viewer
- Event form validation for required fields and date fields
- Stream setup page edit state for Admin/Event Manager
- Stream setup page read-only state for Analyst/Viewer
- Empty/loading/error state for one API-driven list page

Implemented foundation:

- Vitest test runner with jsdom
- React Testing Library and user-event setup
- jest-dom matchers
- QueryClient test render helper
- Login form validation and demo account tests
- Role-aware AppShell navigation tests
- Dashboard API render test
- Event form date validation and submit test

Good follow-up coverage:

- Audience access rule preview text
- Content module form validation
- Recommendation resolve action
- Analytics empty state
- Media Library filters and pagination after V1.2 is built

Acceptance criteria:

- Frontend tests can be run with `npm run test:web`
- Tests mock API calls at the network/client boundary
- Tests assert what the user sees or can do
- Tests avoid checking component internals, CSS class names or implementation-only state
- README includes frontend test command once the setup exists

Suggested GitHub issues:

- `test(web): configure frontend test runner`
- `test(web): add auth form tests`
- `test(web): add role-aware navigation tests`
- `test(web): add event form validation tests`
- `test(web): add stream setup permission tests`

## V2 Optional Enhancements

These are useful only after the public portfolio version is strong.

- Swagger/OpenAPI documentation
- Playwright smoke tests
- Real OpenAI integration for recommendations
- Drag-and-drop content module ordering
- Notification center
- Workspace switcher
- Dark mode
- CSV export implementation
- Stream health simulation timeline
- Upload integration with object storage

## Recommended Development Order

Use this sequence after the current MVP:

1. Finish V1.0 verification and UI consistency pass
2. Build V1.1 Stream Setup and Live Control Mock
3. Build V1.2 Media Library and Replay Operations
4. Build V1.3 Audience Whitelist Import and Approval Workflow
5. V1.4 Analytics Upgrade completed
6. Frontend test foundation and critical workflow tests completed
7. Build V1.5 Release Polish and Portfolio Packaging

Do not start real AI, real livestreaming or complex storage before V1.5.

## Immediate Next Step

The next best feature to build is:

> V1.5 Release Polish and Portfolio Packaging

Reason:

Stream Setup, Media Library, Audience Whitelist, Analytics Upgrade and the frontend test foundation are now in place. V1.5 should package the project for recruiters with screenshots, README polish, architecture/API notes and deployment readiness.

## Definition of Done for Each Feature

Every new feature should include:

- Backend API
- Frontend page or component
- Role-aware permissions
- Loading state
- Empty state
- Error state
- Form validation where relevant
- Seed or mock data
- Audit log entry for important operations
- README or roadmap update if it affects portfolio positioning
- At least one focused backend test if business rules are involved
- At least one focused frontend test when the feature adds meaningful user interaction

## Commit Strategy

Use small commits grouped by feature:

- Schema/API commit
- Frontend UI commit
- Tests/docs commit

Example:

```txt
feat(api): add stream settings workflow
feat(web): add event stream setup page
docs: update OpsPilot development roadmap
```
