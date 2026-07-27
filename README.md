# QMC — Quote Management System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20Postgres-3FCF8E?logo=supabase)](https://supabase.com/)

A full-stack quotation management system for interior design / renovation businesses. Create folders, organize categories of work, manage clients, build detailed line-item quotes with revision history, and export to PDF or Excel.

## About this project

I built this for a friend who works as an interior designer, to help him streamline his workflow and generate quotes much faster. Putting a quote together used to mean rebuilding the same line items by hand for every client — this turns that into picking a template, adjusting the numbers, and exporting a finished PDF or spreadsheet.

### 🔗 Try it out

**[kimchinc-qms-test.netlify.app](https://kimchinc-qms-test.netlify.app)**

Click **"Use Demo Account"** on the login page — it loads a self-resetting playground with realistic sample data, so you can explore freely without affecting anything real.

> **Note:** the live demo runs the `testing` branch and is currently undergoing **UAT (User Acceptance Testing)**. Features are still being reviewed and refined based on feedback, so expect some rough edges.
>
> The backend is hosted on a free tier that sleeps after inactivity — **the first request may take up to a minute** while the server wakes up. It's not broken, just slow to start.

---

## Screenshots

> Screenshots go here. Replace the placeholders below with actual app screenshots.

| Dashboard | Quote Editor | PDF Preview |
|:---------:|:------------:|:-----------:|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Quote Editor](docs/screenshots/quote-editor.png) | ![PDF Preview](docs/screenshots/pdf-preview.png) |

### Wireframes

Design wireframes are available in [`docs/ui-ux/`](docs/ui-ux/) (flows 1–7).

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│         Vite + React 19 + TypeScript             │
│     Tailwind CSS v4 · DaisyUI · shadcn/ui        │
│         Supabase JS (Auth only)                  │
└──────────────────┬──────────────────────────────┘
                   │ REST API (fetch)
┌──────────────────▼──────────────────────────────┐
│                   Backend                        │
│          Express 4 + TypeScript (ESM)            │
│     Prisma ORM · Zod validation · JWT auth       │
└──────────────────┬──────────────────────────────┘
                   │ Prisma Client
┌──────────────────▼──────────────────────────────┐
│              Supabase Postgres                   │
│   Auth (JWT, asymmetric ES256 signing keys)      │
│   Database (pooled + direct connections)         │
└─────────────────────────────────────────────────┘
```

### Database Schema

```
folders → categories → quote (category base content, used for duplication)
                    → clients → revisions → quote (client's actual quote)
master_template → quote (reusable seed content for new clients)
quote → quote_sections → areas_of_work → line_items
company_settings, quote_config (global singletons)
```

---

## Project Structure

```
QMC/
├── frontend/           # Vite + React 19 + TypeScript
│   ├── src/
│   │   ├── components/ # UI components (layout, ui/, shared)
│   │   ├── pages/      # Route pages (Home, Login, QuoteEditor/, etc.)
│   │   ├── lib/        # Services, contexts, utilities, types
│   │   └── index.css   # Tailwind v4 config (@plugin daisyui, @theme)
│   └── package.json
├── backend/            # Express 4 + TypeScript (ESM)
│   ├── src/
│   │   ├── routes/     # REST endpoints (folders, categories, clients, etc.)
│   │   ├── index.ts    # App entry, CORS, routing, error handling
│   │   ├── db.ts       # Prisma client singleton
│   │   └── *.ts        # Auth middleware, mappers, helpers
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── package.json
├── docs/
│   ├── architecture.md # How frontend + backend fit together (diagrams)
│   ├── testing.md      # Every test, what it protects, criticality ratings
│   └── ui-ux/          # Wireframes (1.png – 7.png)
└── README.md           # You are here
```

---

## Documentation

| Document | What's in it |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | The domain model, request lifecycle, data layer pattern, and the two rules (derived numbering, three-tier gating) that explain most of the code. Start here if you're new. |
| [`docs/testing.md`](docs/testing.md) | All 66 tests catalogued with examples, pass/fail output, and a High/Medium/Low criticality rating each. |
| API reference | [Below](#api-documentation) — all endpoints with JSON samples. |

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 19 | UI framework |
| Vite 8 | Build tool & dev server |
| TypeScript | Type safety |
| Tailwind CSS v4 | Utility-first styling (CSS-first config) |
| DaisyUI | Component library (Tailwind plugin) |
| shadcn/ui (Radix Nova) | Accessible UI primitives |
| react-router-dom | Client-side routing |
| Supabase JS | Auth only (login/logout/change-password) |
| xlsx | Excel export |
| Lucide React | Icons |

### Backend
| Technology | Purpose |
|---|---|
| Express 4 | HTTP framework |
| TypeScript (ESM) | Type safety, `NodeNext` module resolution |
| Prisma 6 | ORM + migrations |
| Zod | Request body validation |
| jose | JWT verification (ES256, Supabase JWKS) |
| Supabase Postgres | Database (pooled + direct connections) |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm**
- A **Supabase** project — for Postgres + Auth (connection strings go in `backend/.env`, see `backend/.env.example`)

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/QMC.git
cd QMC
```

### 2. Backend setup

```bash
cd backend
cp .env.example .env
# Fill in DATABASE_URL, DIRECT_URL, SUPABASE_URL, SUPABASE_JWT_SECRET
npm install
npx prisma generate
npx prisma migrate dev    # applies migrations + runs seed automatically
npm run dev                # starts Express on http://localhost:4000
```

### 3. Revision documents (Supabase Storage)

The Documents tab attaches files to a revision — the signed quote PDF, SketchUp files, photos. It needs one private bucket and two policies. Run this once in the Supabase SQL editor:

```sql
-- Private bucket for per-revision attachments. 50 MB matches Supabase's default
-- per-file limit and the checks in the API and the browser.
insert into storage.buckets (id, name, public, file_size_limit)
values ('quote-documents', 'quote-documents', false, 52428800)
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit;

-- Keys are `{ownerId}/{revisionId}/{documentId}.{ext}`; the first segment is the
-- uploader's auth UID, which is what lets a storage policy scope by owner
-- without joining the application tables.
create policy "quote_documents_read_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'quote-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "quote_documents_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'quote-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- No UPDATE policy: keys are single-use uuids, so an overwrite is always a bug.
-- No DELETE policy: deletes go through the API, so the row and the object die
-- together instead of one outliving the other.
```

Then make sure `SUPABASE_SERVICE_ROLE_KEY` is set in **every** backend environment. Downloads, deletes and upload confirmation all sign or call Storage with it; without it the Documents tab answers 503.

### 4. Frontend setup

```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL=http://localhost:4000
npm install
npm run dev                # starts Vite on http://localhost:5173
```

---

## Available Commands

### Frontend (`frontend/`)

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run lint` | Run oxlint |
| `npm run preview` | Preview production build |

### Backend (`backend/`)

| Command | Description |
|---|---|
| `npm run dev` | Start Express with `tsx watch` |
| `npm run build` | TypeScript compile to `dist/` |
| `npm start` | Run compiled build |
| `npx prisma migrate dev` | Create/apply migrations (auto-seeds) |
| `npx prisma db seed` | Seed database manually |
| `npx prisma generate` | Regenerate Prisma client |
| `npm run storage:gc` | List document objects in Storage with no database row (add `-- --delete` to remove them) |

---

## Environments

| Branch | Frontend | Backend | Database |
|---|---|---|---|
| `main` | Local dev | Local dev | Shared Supabase (same as testing) |
| `testing` | Netlify | Render | Shared Supabase |
| `prod` | Netlify | Render | Separate Supabase project |

---

## Key Features

- 📁 **Folder-based organization** — group categories of work (e.g. HDB, Condo)
- 📝 **Detailed quote editor** — sections → areas of work → line items with quantity, unit pricing, profit margins
- 🔄 **Revision history** — each client has independent, persisted revisions (R0, R1, ...)
- 📋 **Master Template** — org-wide reusable content to seed new client quotes, with a one-click "Use Master Template" / "Reset Template" safety net on a client's latest revision if edits go wrong
- 📊 **Three-tier inclusion** — section ✓ → area ✓ → item ✓ controls what counts toward totals
- 🔢 **Live section/area numbering** — "Section A/B/C", "A.1", "A.2" etc. are computed from position, so deleting one reflows the rest instead of leaving gaps
- 🎁 **FOC items** — mark items as free-of-charge (shows "FOC" label, cost still tracked)
- 🧾 **Consistent output columns** — Summary, Preview/Print, and Excel all use `No. · Description · Qty · Unit · Unit Price · Amount`; currency lives in the header (`Amount (S$)`) and cells are plain numbers
- 💰 **Summary cost/profit visibility** — the Summary tab (internal-only) swaps Unit Price for `Cost Price · Seller Price · Amount · Profit/Loss (%)` and shows Total Cost / Total Price / Profit-Loss metric boxes
- 📄 **PDF export** — print-styled preview with `window.print()`, A4 page breaks, repeating headers
- 📑 **Excel export** — client-side `.xlsx` generation via `xlsx` library
- 🔐 **Supabase Auth** — asymmetric JWT (ES256), per-user data scoping via `ownerId`
- 👥 **Multi-user support** — folder/template ownership scoped by Supabase Auth UID
- 🛡️ **Roles & admin dashboard** — `admin` / `designer` / `demo` roles from the Supabase `app_metadata.role` claim; admins get `/admin` with a user directory, per-user metrics (sign-ins, portfolio, output, quoted value), a sign-in activity log, and a read-only drill-down into any user's quotes
- 🎮 **Demo playground account** — "Use Demo Account" on the login page seeds realistic sample data and self-resets on login/logout, for demoing without touching real data (see API docs below)

---

## API Documentation

**Base URL:** `http://localhost:4000`

### Authentication

All `/api/*` routes require a valid Supabase JWT in the `Authorization` header:

```
Authorization: Bearer <supabase-access-token>
```

The backend verifies the token using Supabase's JWKS (ES256 asymmetric keys). On success, `req.authUserId` is set to the Supabase auth UID for per-user data scoping, along with `req.authEmail` and `req.authRole`.

### Roles

`req.authRole` comes from the token's `app_metadata.role` claim — one of `admin`, `designer`, `demo`, defaulting to `designer` when the claim is absent.

Assign roles with the script in `backend/` (needs `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env`):

```bash
npm run roles                                # list every user and their current role
npm run roles -- austin@example.com admin
npm run roles -- kim@example.com designer
npm run roles -- demo@example.com demo
```

The user must **sign out and back in** for a new role to reach their token. The same edit can be made by hand in the Supabase dashboard (Auth → user → App Metadata).

`/api/admin/*` requires `admin` and returns `403 { "error": "Forbidden" }` otherwise. No other route is role-gated.

| Method | Endpoint | Role | Description |
| ------ | -------- | ---- | ----------- |
| POST | `/api/auth-events` | any | Records the caller's own `login`/`logout`. The actor is taken from the JWT, never the body. |
| GET | `/api/admin/users` | admin | Every Supabase account with its role, last seen, and login/logout counts. `?refresh=1` bypasses the 60s cache. |
| GET | `/api/admin/auth-events` | admin | Paged sign-in log (`limit`, `cursor`, `authUserId`, `event`, `from`, `to`), newest first. |
| GET | `/api/admin/metrics` | admin | Project-wide metrics, or one user's with `?authUserId=`. Accepts `from`/`to` (default: last 30 days). |
| GET | `/api/admin/users/:userId/folders` | admin | Read-only drill-down into another user's tree. |
| GET | `/api/admin/users/:userId/folders/:folderId/categories` | admin | ” |
| GET | `/api/admin/users/:userId/categories/:categoryId/clients` | admin | ” |
| GET | `/api/admin/users/:userId/clients/:clientId/revisions` | admin | ” |
| GET | `/api/admin/users/:userId/revisions/:id` | admin | ” — the full quote. |

The drill-down is **GET-only**. No write route anywhere accepts another user's id, so an admin can read a designer's work but cannot alter it. Every handler filters on `:userId`, so pairing one user's id with another's row id returns 404 rather than data.

`GET /api/admin/users` needs `SUPABASE_SERVICE_ROLE_KEY` in the server environment (see below); without it that one endpoint answers 503 and the rest of the dashboard still works.

**Unauthenticated requests** receive:

```json
{ "error": "Missing or invalid authorization header" }
```

### Error Responses

All errors follow this shape:

```json
{ "error": "Human-readable error message" }
```

**Validation errors** (Zod) return:

```json
{
  "error": "Invalid request body",
  "issues": [
    {
      "code": "too_small",
      "minimum": 1,
      "type": "string",
      "inclusive": true,
      "exact": false,
      "message": "String must contain at least 1 character(s)",
      "path": ["name"]
    }
  ]
}
```

| Status | Meaning |
|--------|---------|
| 400 | Validation error or business rule violation |
| 404 | Resource not found (or not owned by current user) |
| 500 | Internal server error |

---

### Health Check

#### `GET /health`

No auth required.

**Response `200`:**

```json
{ "ok": true }
```

---

### Folders

#### `GET /api/folders`

List all folders owned by the current user.

**Response `200`:**

```json
[
  { "id": "clx1abc...", "name": "HDB" },
  { "id": "clx2def...", "name": "Condo" }
]
```

---

#### `POST /api/folders`

Create a new folder.

**Request body:**

```json
{
  "name": "Landed"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | ✅ | min 1 char |

**Response `201`:**

```json
{
  "id": "clx3ghi...",
  "name": "Landed"
}
```

---

#### `PATCH /api/folders/:id`

Rename a folder.

**Request body:**

```json
{
  "name": "Landed Properties"
}
```

**Response `200`:**

```json
{
  "id": "clx3ghi...",
  "name": "Landed Properties"
}
```

**Response `404`:**

```json
{ "error": "Folder not found" }
```

---

#### `DELETE /api/folders/:id`

Delete a folder and all its nested categories, clients, revisions, and quotes (cascade).

**Response `204`:** No content.

**Response `404`:**

```json
{ "error": "Folder not found" }
```

---

### Categories

#### `GET /api/folders/:folderId/categories`

List all categories in a folder.

**Response `200`:**

```json
[
  {
    "id": "clx4jkl...",
    "folderId": "clx1abc...",
    "name": "3-Room",
    "description": "Standard 3-room HDB layout",
    "quote": {
      "info": {
        "clientName": "",
        "projectSite": "",
        "email": "",
        "contact": "",
        "quotationRef": "R0",
        "refNumber": "",
        "date": "",
        "designer": ""
      },
      "sections": []
    }
  }
]
```

---

#### `POST /api/folders/:folderId/categories`

Create a new category in a folder.

**Request body:**

```json
{
  "name": "4-Room",
  "description": "Standard 4-room HDB layout"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | ✅ | min 1 char |
| `description` | string | ❌ | defaults to `""` |

**Response `201`:**

```json
{
  "id": "clx5mno...",
  "folderId": "clx1abc...",
  "name": "4-Room",
  "description": "Standard 4-room HDB layout",
  "quote": {
    "info": {
      "clientName": "",
      "projectSite": "",
      "email": "",
      "contact": "",
      "quotationRef": "R0",
      "refNumber": "",
      "date": "",
      "designer": ""
    },
    "sections": []
  }
}
```

**Response `404`:**

```json
{ "error": "Folder not found" }
```

---

#### `GET /api/categories/:id`

Get a single category with its full quote.

**Response `200`:**

```json
{
  "id": "clx4jkl...",
  "folderId": "clx1abc...",
  "name": "3-Room",
  "description": "Standard 3-room HDB layout",
  "quote": {
    "info": {
      "clientName": "John Doe",
      "projectSite": "Blk 123 Ang Mo Kio Ave 3",
      "email": "john@example.com",
      "contact": "+6591234567",
      "quotationRef": "R0",
      "refNumber": "KHC-2025-001",
      "date": "2025-07-24",
      "designer": "Kim Lim"
    },
    "sections": [
      {
        "id": "sec1...",
        "name": "Living Room",
        "description": "",
        "complete": true,
        "areas": [
          {
            "id": "area1...",
            "name": "Carpentry Works",
            "included": true,
            "items": [
              {
                "id": "item1...",
                "description": "TV Console with back panel",
                "qty": 1,
                "unit": "Lot",
                "cost": 800,
                "selling": 1200,
                "foc": false,
                "inc": true
              },
              {
                "id": "item2...",
                "description": "Feature wall laminate cladding",
                "qty": 45,
                "unit": "SqFt",
                "cost": 8,
                "selling": 15,
                "foc": false,
                "inc": true
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**Response `404`:**

```json
{ "error": "Category not found" }
```

---

#### `PATCH /api/categories/:id`

Update a category's name and/or description.

**Request body:**

```json
{
  "name": "3-Room Deluxe",
  "description": "Updated layout with balcony"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | ✅ | min 1 char |
| `description` | string | ❌ | only updated if provided |

**Response `200`:** Full category object (same shape as `GET /api/categories/:id`).

**Response `404`:**

```json
{ "error": "Category not found" }
```

---

#### `DELETE /api/categories/:id`

Delete a category and all its clients, revisions, and quotes (cascade).

**Response `204`:** No content.

**Response `404`:**

```json
{ "error": "Category not found" }
```

---

#### `POST /api/categories/:id/duplicate`

Duplicate a category (with all its quote content) into the same folder.

**Request body:**

```json
{
  "name": "3-Room (Copy)",
  "description": "Duplicated from 3-Room"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | ✅ | min 1 char |
| `description` | string | ❌ | defaults to source's description |

**Response `201`:** Full category object (same shape as `GET /api/categories/:id`), with cloned quote content and a new ID.

**Response `404`:**

```json
{ "error": "Category not found" }
```

---

#### `PUT /api/categories/:id/quote`

Wholesale replace a category's quote content (autosave endpoint). Deletes all existing sections/areas/items and recreates them in a transaction.

**Request body:**

```json
{
  "quote": {
    "info": {
      "clientName": "Template Client",
      "projectSite": "Blk 456 Tampines St 21",
      "email": "template@example.com",
      "contact": "+6598765432",
      "quotationRef": "R0",
      "refNumber": "KHC-2025-002",
      "date": "2025-07-24",
      "designer": "Kim Lim"
    },
    "sections": [
      {
        "id": "sec-temp-1",
        "name": "Kitchen",
        "description": "Wet & dry kitchen",
        "complete": false,
        "areas": [
          {
            "id": "area-temp-1",
            "name": "Plumbing Works",
            "included": true,
            "items": [
              {
                "id": "item-temp-1",
                "description": "Kitchen sink installation",
                "qty": 1,
                "unit": "Lot",
                "cost": 350,
                "selling": 550,
                "foc": false,
                "inc": true
              }
            ]
          }
        ]
      }
    ]
  }
}
```

> **Note:** The `id` fields in sections/areas/items are from the frontend's local state. The backend ignores them and generates new IDs on recreation.

**Response `200`:** Full category object with the updated quote.

**Response `404`:**

```json
{ "error": "Category or quote not found" }
```

---

### Clients

#### `GET /api/categories/:categoryId/clients`

List all clients in a category.

**Response `200`:**

```json
[
  {
    "id": "clx6pqr...",
    "categoryId": "clx4jkl...",
    "name": "John Doe",
    "email": "john@example.com",
    "contactNumber": "+6591234567"
  },
  {
    "id": "clx7stu...",
    "categoryId": "clx4jkl...",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "contactNumber": "+6598765432"
  }
]
```

---

#### `POST /api/categories/:categoryId/clients`

Create a new client with an initial revision (R0). The R0 quote is seeded from either the master template or a blank quote.

**Request body:**

```json
{
  "name": "Alice Tan",
  "email": "alice@example.com",
  "contactNumber": "+6590001111",
  "source": "master"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | ✅ | min 1 char |
| `email` | string | ❌ | defaults to `""` |
| `contactNumber` | string | ❌ | defaults to `""` |
| `source` | `"master"` \| `"scratch"` | ❌ | defaults to `"scratch"` |

- `"master"` — clones the current master template's quote content into R0
- `"scratch"` — creates R0 with an empty quote (blank sections)

**Response `201`:**

```json
{
  "id": "clx8vwx...",
  "categoryId": "clx4jkl...",
  "name": "Alice Tan",
  "email": "alice@example.com",
  "contactNumber": "+6590001111"
}
```

**Response `404`:**

```json
{ "error": "Category not found" }
```

---

#### `GET /api/clients/:id`

Get a single client.

**Response `200`:**

```json
{
  "id": "clx6pqr...",
  "categoryId": "clx4jkl...",
  "name": "John Doe",
  "email": "john@example.com",
  "contactNumber": "+6591234567"
}
```

**Response `404`:**

```json
{ "error": "Client not found" }
```

---

#### `PATCH /api/clients/:id`

Update a client's details.

**Request body:**

```json
{
  "name": "John Doe Jr.",
  "email": "johnjr@example.com",
  "contactNumber": "+6591234568"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | ✅ | min 1 char |
| `email` | string | ❌ | |
| `contactNumber` | string | ❌ | |

**Response `200`:**

```json
{
  "id": "clx6pqr...",
  "categoryId": "clx4jkl...",
  "name": "John Doe Jr.",
  "email": "johnjr@example.com",
  "contactNumber": "+6591234568"
}
```

**Response `404`:**

```json
{ "error": "Client not found" }
```

---

#### `DELETE /api/clients/:id`

Delete a client and all its revisions and quotes (cascade).

**Response `204`:** No content.

**Response `404`:**

```json
{ "error": "Client not found" }
```

---

#### `GET /api/clients/:id/revisions`

List all revisions for a client (summary only, no quote content).

**Response `200`:**

```json
[
  {
    "id": "clx9yza...",
    "clientId": "clx6pqr...",
    "label": "R0",
    "position": 0
  },
  {
    "id": "clx10bc...",
    "clientId": "clx6pqr...",
    "label": "R1",
    "position": 1
  }
]
```

---

### Revisions

#### `POST /api/clients/:clientId/revisions`

Clone a revision to create a new one. Clones the specified revision (or the latest if not specified).

**Request body (optional):**

```json
{
  "cloneFromRevisionId": "clx9yza..."
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `cloneFromRevisionId` | string | ❌ | If omitted, clones the latest revision |

**Response `201`:**

```json
{
  "id": "clx11de...",
  "clientId": "clx6pqr...",
  "label": "R2",
  "position": 2,
  "quote": {
    "info": {
      "clientName": "John Doe",
      "projectSite": "Blk 123 Ang Mo Kio Ave 3",
      "email": "john@example.com",
      "contact": "+6591234567",
      "quotationRef": "R2",
      "refNumber": "KHC-2025-001",
      "date": "2025-07-24",
      "designer": "Kim Lim"
    },
    "sections": [
      {
        "id": "sec-new...",
        "name": "Living Room",
        "description": "",
        "complete": true,
        "areas": [
          {
            "id": "area-new...",
            "name": "Carpentry Works",
            "included": true,
            "items": [
              {
                "id": "item-new...",
                "description": "TV Console with back panel",
                "qty": 1,
                "unit": "Lot",
                "cost": 800,
                "selling": 1200,
                "foc": false,
                "inc": true
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**Response `404`:**

```json
{ "error": "No revision to clone from" }
```

---

#### `GET /api/revisions/:id`

Get a single revision with its full quote content.

**Response `200`:**

```json
{
  "id": "clx9yza...",
  "clientId": "clx6pqr...",
  "label": "R0",
  "position": 0,
  "quote": {
    "info": {
      "clientName": "John Doe",
      "projectSite": "Blk 123 Ang Mo Kio Ave 3",
      "email": "john@example.com",
      "contact": "+6591234567",
      "quotationRef": "R0",
      "refNumber": "KHC-2025-001",
      "date": "2025-07-24",
      "designer": "Kim Lim"
    },
    "sections": []
  }
}
```

**Response `404`:**

```json
{ "error": "Revision not found" }
```

---

#### `DELETE /api/revisions/:id`

Delete a revision. Only the latest revision can be deleted, and R0 (position 0) can never be deleted.

**Response `204`:** No content.

**Response `400`:**

```json
{ "error": "Cannot delete R0" }
```

```json
{ "error": "Only the latest revision can be deleted" }
```

**Response `404`:**

```json
{ "error": "Revision not found" }
```

---

#### `PUT /api/revisions/:id/quote`

Wholesale replace a revision's quote content (autosave endpoint).

**Request body:** Same shape as `PUT /api/categories/:id/quote` — see above.

```json
{
  "quote": {
    "info": {
      "clientName": "John Doe",
      "projectSite": "Blk 123 Ang Mo Kio Ave 3",
      "email": "john@example.com",
      "contact": "+6591234567",
      "quotationRef": "R0",
      "refNumber": "KHC-2025-001",
      "date": "2025-07-24",
      "designer": "Kim Lim"
    },
    "sections": [
      {
        "id": "sec1",
        "name": "Bedroom",
        "description": "Master bedroom",
        "complete": true,
        "areas": [
          {
            "id": "area1",
            "name": "Electrical Works",
            "included": true,
            "items": [
              {
                "id": "item1",
                "description": "Installation of power points",
                "qty": 6,
                "unit": "Lot",
                "cost": 25,
                "selling": 45,
                "foc": false,
                "inc": true
              },
              {
                "id": "item2",
                "description": "Complimentary LED downlight",
                "qty": 4,
                "unit": "Lot",
                "cost": 30,
                "selling": 50,
                "foc": true,
                "inc": true
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**Response `200`:** Full revision object with updated quote (same shape as `GET /api/revisions/:id`).

**Response `404`:**

```json
{ "error": "Revision or quote not found" }
```

---

### Documents

Files attached to a revision — the signed quote PDF, SketchUp files, site photos. The bytes go straight from the browser to a private Supabase Storage bucket; these routes hand out the key and verify the result. See [architecture.md](docs/architecture.md#revision-documents) for why the handshake is shaped this way.

#### `GET /api/revisions/:id/documents`

**Response `200`:**

```json
[
  {
    "id": "doc-1...",
    "revisionId": "clx11de...",
    "fileName": "Signed Quote R1.pdf",
    "contentType": "application/pdf",
    "sizeBytes": 284913,
    "createdAt": "2026-07-27T09:14:22.000Z"
  }
]
```

#### `POST /api/revisions/:id/documents`

Step 1 of an upload: reserves a row and returns the storage key to PUT the bytes to. Only the latest revision accepts new documents.

**Request body:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `fileName` | string | ✅ | 1–255 chars; sanitised for display, never used as the key |
| `contentType` | string | ❌ | Defaults to `application/octet-stream` |
| `sizeBytes` | number | ✅ | Positive integer, max `52428800` (50 MB) |

**Response `201`:**

```json
{
  "document": { "id": "doc-1...", "revisionId": "clx11de...", "fileName": "plans.skp", "contentType": "application/octet-stream", "sizeBytes": 18234112, "createdAt": "2026-07-27T09:20:00.000Z" },
  "bucket": "quote-documents",
  "storagePath": "e1b2.../clx11de.../doc-1....skp"
}
```

**Response `403`:** `{ "error": "Only the latest revision accepts new documents" }`

#### `POST /api/documents/:id/confirm`

Step 3: checks the object exists and reads its real size and type, then marks the document ready. Returns the document. `409` if the upload never landed (the reserved row is deleted), `413` if the real file exceeds 50 MB.

#### `POST /api/documents/:id/download`

**Response `200`:**

```json
{ "url": "https://<project>.supabase.co/storage/v1/object/sign/quote-documents/...&download=Signed%20Quote%20R1.pdf", "expiresIn": 60 }
```

POST rather than GET because it mints a short-lived credential rather than returning a resource. `503` when `SUPABASE_SERVICE_ROLE_KEY` is missing.

#### `DELETE /api/documents/:id`

Removes the storage object and then the row. `204` on success, `403` on an earlier revision.

---

### Master Template

#### `GET /api/master-template`

Get the current user's master template. Auto-creates one with a blank quote if none exists.

**Response `200`:**

```json
{
  "id": "clx12fg...",
  "updatedAt": "2025-07-24T08:30:00.000Z",
  "quote": {
    "info": {
      "clientName": "",
      "projectSite": "",
      "email": "",
      "contact": "",
      "quotationRef": "R0",
      "refNumber": "",
      "date": "",
      "designer": ""
    },
    "sections": [
      {
        "id": "sec-mt1...",
        "name": "Living Room",
        "description": "",
        "complete": false,
        "areas": [
          {
            "id": "area-mt1...",
            "name": "Carpentry Works",
            "included": true,
            "items": [
              {
                "id": "item-mt1...",
                "description": "TV Console",
                "qty": 1,
                "unit": "Lot",
                "cost": 800,
                "selling": 1200,
                "foc": false,
                "inc": true
              }
            ]
          }
        ]
      }
    ]
  }
}
```

---

#### `PUT /api/master-template/quote`

Wholesale replace the master template's quote content (autosave endpoint).

**Request body:** Same shape as `PUT /api/categories/:id/quote` and `PUT /api/revisions/:id/quote`.

```json
{
  "quote": {
    "info": {
      "clientName": "",
      "projectSite": "",
      "email": "",
      "contact": "",
      "quotationRef": "R0",
      "refNumber": "",
      "date": "",
      "designer": ""
    },
    "sections": [
      {
        "id": "sec-mt-new",
        "name": "Kitchen",
        "description": "Wet kitchen",
        "complete": false,
        "areas": [
          {
            "id": "area-mt-new",
            "name": "Plumbing",
            "included": true,
            "items": [
              {
                "id": "item-mt-new",
                "description": "Sink installation",
                "qty": 1,
                "unit": "Lot",
                "cost": 300,
                "selling": 500,
                "foc": false,
                "inc": true
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**Response `200`:** Full master template object (same shape as `GET /api/master-template`).

---

### Settings

#### `GET /api/settings`

Get tenant-wide company settings and quote configuration. These are seeded, read-only values — no create/update endpoints.

**Response `200`:**

```json
{
  "company": {
    "name": "Kimchinc Pte Ltd",
    "address": "123 Orchard Road, #04-56, Singapore 238858",
    "tel": "+65 6789 0123",
    "uen": "202312345A",
    "gst": "M2-0012345-6",
    "website": "www.kimchinc.com"
  },
  "currency": "SGD",
  "currencySymbol": "S$",
  "gstRate": 9,
  "unitOptions": ["Ft", "Lot", "SqFt"],
  "paymentTermsSchedule": [
    { "milestone": "Upon Confirmation", "percentage": 10 },
    { "milestone": "Upon Commencement of Carpentry Work", "percentage": 30 },
    { "milestone": "Upon Completion of Carpentry Work", "percentage": 30 },
    { "milestone": "Upon Handover", "percentage": 25 },
    { "milestone": "Upon Completion of Defects (30 days)", "percentage": 5 }
  ]
}
```

**Response `500`:**

```json
{ "error": "Settings not seeded — run `npx prisma db seed`" }
```

---

### Demo

#### `POST /api/demo/reset`

Wipes and reseeds the demo playground account's data (a `Folder` with HDB "4-Room"/"5-Room" categories, one client each with 2 revisions of realistic line items, plus a matching Master Template) back to a fixed starting dataset. Guarded so it only ever runs against the demo account — every other user gets `403`.

Called by the frontend's "Use Demo Account" login button, on demo-user logout, and via the "Reset Playground" menu item.

**Response `204`:** No content.

**Response `403`:**

```json
{ "error": "Not the demo account" }
```

---

### API Routes Summary

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/health` | Health check (no auth) |
| GET | `/api/folders` | List folders |
| POST | `/api/folders` | Create folder |
| PATCH | `/api/folders/:id` | Rename folder |
| DELETE | `/api/folders/:id` | Delete folder (cascade) |
| GET | `/api/folders/:folderId/categories` | List categories in folder |
| POST | `/api/folders/:folderId/categories` | Create category |
| GET | `/api/categories/:id` | Get category with quote |
| PATCH | `/api/categories/:id` | Update category name/description |
| DELETE | `/api/categories/:id` | Delete category (cascade) |
| POST | `/api/categories/:id/duplicate` | Duplicate category |
| PUT | `/api/categories/:id/quote` | Replace category quote (autosave) |
| GET | `/api/categories/:categoryId/clients` | List clients in category |
| POST | `/api/categories/:categoryId/clients` | Create client (source: master/scratch) |
| GET | `/api/clients/:id` | Get client |
| PATCH | `/api/clients/:id` | Update client |
| DELETE | `/api/clients/:id` | Delete client (cascade) |
| GET | `/api/clients/:id/revisions` | List revisions (summary) |
| POST | `/api/clients/:clientId/revisions` | Clone revision |
| GET | `/api/revisions/:id` | Get revision with quote |
| DELETE | `/api/revisions/:id` | Delete revision (latest only, not R0) |
| PUT | `/api/revisions/:id/quote` | Replace revision quote (autosave) |
| GET | `/api/revisions/:id/documents` | List documents attached to a revision |
| POST | `/api/revisions/:id/documents` | Reserve an upload (latest revision only) |
| POST | `/api/documents/:id/confirm` | Confirm the uploaded object landed |
| POST | `/api/documents/:id/download` | Mint a 60-second signed download URL |
| DELETE | `/api/documents/:id` | Delete a document (latest revision only) |
| GET | `/api/master-template` | Get master template (auto-creates) |
| PUT | `/api/master-template/quote` | Replace master template quote (autosave) |
| GET | `/api/settings` | Get company settings + quote config |
| POST | `/api/demo/reset` | Wipe and reseed the demo playground account's data |

---

### Data Types Reference

#### Quote

The `Quote` object is shared across categories, revisions, and the master template:

```typescript
interface Quote {
  info: {
    clientName: string
    projectSite: string
    email: string
    contact: string
    quotationRef: string   // e.g. "R0", "R1"
    refNumber: string      // e.g. "KHC-2025-001"
    date: string           // e.g. "2025-07-24"
    designer: string
  }
  sections: QuoteSection[]
}

interface QuoteSection {
  id: string
  name: string             // e.g. "Living Room", "Kitchen"
  description: string
  complete: boolean        // sidebar checkbox — gates totals
  areas: AreaOfWork[]
}

interface AreaOfWork {
  id: string
  name: string             // e.g. "Carpentry Works", "Plumbing"
  included: boolean        // accordion header checkbox — gates totals
  items: LineItem[]
}

interface LineItem {
  id: string
  description: string
  qty: number
  unit: "Ft" | "Lot" | "SqFt"
  cost: number             // cost price to business
  selling: number          // selling price to client
  foc: boolean             // free of charge — zeroes selling total, cost still tracked
  inc: boolean             // included — per-row checkbox, gates totals
}
```

#### Three-tier total gating

For a line item to count toward totals: **section.complete** ✓ → **area.included** ✓ → **item.inc** ✓ (all three must be true). Additionally, `item.foc = true` zeroes that item's selling total regardless of `inc`.

#### Output columns

Read-only output (Summary tab, Preview/Print, Excel) shares one column contract: `No. · Description · Qty · Unit · Unit Price · Amount`, where Unit Price is `item.selling` and Amount is `itemTotal(item)` (literal `FOC` when `item.foc`). Currency is carried in the header text (`Unit Price (S$)`, `Amount (S$)`) and cells hold bare numbers, so Excel amounts stay numeric rather than currency-prefixed strings. The Summary tab additionally exposes internal figures the client-facing output never shows — `Cost Price · Seller Price · Amount · Profit/Loss (%)` per row, plus Total Cost / Total Price / Profit-Loss (amount and margin over total cost) metric boxes above Payment Terms. The editable Quotation Items table keeps its own column set and is intentionally excluded from this contract.

---

## Contributing

1. Create a feature branch from `main`
2. Make changes
3. Run `npm run build` in both `frontend/` and `backend/` to verify compilation
4. Bump `frontend/package.json`'s `version` for user-facing changes — it's the only source for the footer's version number
5. Push and open a PR targeting `testing` branch

---

## License

Private — all rights reserved.
