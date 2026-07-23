# Supabase setup

This backend uses Supabase only as a hosted Postgres database — no Supabase Auth, Storage, or Edge Functions. Prisma talks to it directly over a Postgres connection string.

## 1. Create a project

1. Go to https://supabase.com and sign in (or create an account).
2. Click **New Project**.
3. Pick an organization, give the project a name (e.g. `qmc`), and set a **database password** — save it somewhere, you'll need it below. It's easiest to let Supabase generate a strong one and copy it immediately.
4. Pick a region close to you and click **Create new project**. It takes a minute or two to provision.

## 2. Get your connection strings

Once the project is up: **Project Settings → Database → Connection string**.

Supabase gives you two connection strings you need — this backend uses both:

- **Connection pooling (Transaction mode, port 6543)** — for the running app (`DATABASE_URL`). Goes through PgBouncer, safe for many short-lived connections (what a normal Express request does).
- **Direct connection (port 5432)** — for Prisma migrations (`DIRECT_URL`). Migrations need a direct connection because PgBouncer's transaction mode doesn't support the session-level features `prisma migrate` uses.

Both strings look like:
```
postgresql://postgres.<project-ref>:<password>@<host>:<port>/postgres
```
Replace `<password>` with the database password from step 1 (URL-encode any special characters in it, e.g. `@` → `%40`).

## 3. Configure the backend

Copy `backend/.env.example` to `backend/.env` and fill in:

```
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@<pooler-host>:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<project-ref>:<password>@<direct-host>:5432/postgres"
PORT=4000
```

`?pgbouncer=true` on `DATABASE_URL` tells Prisma to disable prepared statements, which PgBouncer's transaction pooling mode doesn't support.

## 4. Create the schema and seed data

From `backend/`:

```
npm install
npx prisma migrate dev --name init
npx prisma db seed
```

`prisma migrate dev` creates the tables (using `DIRECT_URL`) and generates the Prisma client. `prisma db seed` inserts the starter data (HDB/Condo folders, the company/GST/payment-terms settings, the single mock user) — see `prisma/seed.ts`.

You can verify it worked in the Supabase dashboard under **Table Editor** — you should see `folders`, `templates`, `quotes`, `quote_sections`, `areas_of_work`, `line_items`, `company_settings`, `quote_config`, and `users`.

## 5. Run the backend

```
npm run dev
```

Starts Express on `PORT` (default `4000`). Point the frontend's `VITE_API_URL` at this address (see `frontend/.env.example`).

## Notes / gotchas

- If you ever reset the database password in Supabase, update both `DATABASE_URL` and `DIRECT_URL` in `.env` — they both embed it.
- Free-tier Supabase projects pause after a period of inactivity; the first request after a pause is slow while it wakes up.
- Never commit `backend/.env` — it holds your database password. Only `.env.example` (with placeholders) is checked in.
