# OpsPilot Release Checklist

Use this checklist before sharing the GitHub repo, live demo, CV entry or LinkedIn project.

## Local Verification

Run these commands from the repository root:

```bash
npm install
npm run db:up
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run verify
```

## Demo Account Verification

Confirm each account can log in:

- `admin@opspilot.dev / password123`
- `manager@opspilot.dev / password123`
- `analyst@opspilot.dev / password123`
- `viewer@opspilot.dev / password123`

Role checks:

- Admin can see Users and Audit Logs.
- Event Manager can create and manage events but cannot manage users.
- Analyst can view analytics and read-only event data.
- Viewer has limited read-only access.

## Screenshot Checklist

Recommended viewport:

```txt
1440 x 1000
```

Recommended account:

```txt
admin@opspilot.dev / password123
```

Save screenshots under:

```txt
docs/screenshots/
```

Suggested filenames:

```txt
01-login.png
02-dashboard.png
03-events.png
04-event-detail.png
05-audience-access.png
06-content-builder.png
07-stream-setup.png
08-media-library.png
09-analytics.png
10-recommendations.png
11-audit-logs.png
```

README screenshot priority:

1. Dashboard
2. Event detail
3. Audience access
4. Stream setup
5. Media library
6. Analytics
7. Recommendations

## Recruiter Demo Flow

The project should be understandable within 10 minutes:

1. Log in as Admin.
2. Show dashboard KPIs and recent recommendations.
3. Open an event detail page.
4. Show audience access and approval workflow.
5. Show content modules.
6. Show stream setup.
7. Show media library or event media.
8. Show analytics charts.
9. Show recommendations and audit logs.

## README Requirements

Before public release, README should include:

- Project overview
- Live demo link
- Demo accounts
- Tech stack
- Key features
- Screenshots
- Architecture summary
- Database schema summary
- API overview
- Recommendation engine explanation
- Local setup
- Environment variables
- Quality checks
- Deployment notes
- Future improvements

## Deployment Checklist

Frontend:

- Deploy `apps/web` to Vercel.
- Set `NEXT_PUBLIC_API_URL` to the production API URL.

Backend:

- Deploy `apps/api` to Render, Railway or Fly.io.
- Set `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN` and `PORT`.
- Run Prisma migrations against the production database.
- Run seed data for demo accounts.

Database:

- Use Supabase PostgreSQL, Neon or Railway PostgreSQL.
- Confirm SSL requirements for the deployed provider.
- Confirm demo data exists after seed.

Post-deployment smoke checks:

- Login works.
- Dashboard loads.
- Event detail loads.
- Audience page loads.
- Analytics page loads.
- Recommendations can be generated.
- Audit logs load.

## Known Scope Boundaries

Do not present these as missing features:

- Real livestreaming infrastructure
- Real file upload/video processing
- Real email sending
- Payment or billing
- WebSocket live chat
- Real AI API calls

Use this wording:

```txt
These areas are intentionally mocked or deferred so the public demo remains stable and focused on product engineering workflows.
```
