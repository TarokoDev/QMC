# QMC — Quote Management System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20Postgres-3FCF8E?logo=supabase)](https://supabase.com/)

A full-stack quotation management system for interior design / renovation businesses. Create folders, organize categories of work, manage clients, build detailed line-item quotes with revision history, and export to PDF or Excel.

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
│   └── ui-ux/          # Wireframes (1.png – 7.png)
└── CLAUDE.md           # Detailed project documentation for AI assistants
```

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
- A **Supabase** project (see [`backend/SUPABASE_SETUP.md`](backend/SUPABASE_SETUP.md))

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

### 3. Frontend setup

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
- 📄 **PDF export** — print-styled preview with `window.print()`, A4 page breaks, repeating headers
- 📑 **Excel export** — client-side `.xlsx` generation via `xlsx` library
- 🔐 **Supabase Auth** — asymmetric JWT (ES256), per-user data scoping via `ownerId`
- 👥 **Multi-user support** — folder/template ownership scoped by Supabase Auth UID
- 🎮 **Demo playground account** — "Use Demo Account" on the login page seeds realistic sample data and self-resets on login/logout, for demoing without touching real data (see API docs below)

---

## API Documentation

**Base URL:** `http://localhost:4000`

### Authentication

All `/api/*` routes require a valid Supabase JWT in the `Authorization` header:

```
Authorization: Bearer <supabase-access-token>
```

The backend verifies the token using Supabase's JWKS (ES256 asymmetric keys). On success, `req.authUserId` is set to the Supabase auth UID for per-user data scoping.

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

Called by the frontend's "Use Demo Account" login button, on demo-user logout, and via the "Reset Playground" menu item — see `CLAUDE.md` "Environments" for the full flow.

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

---

## Contributing

1. Create a feature branch from `main`
2. Make changes
3. Run `npm run build` in both `frontend/` and `backend/` to verify compilation
4. Bump `frontend/package.json`'s `version` for user-facing changes — it's the only source for the footer's version number (see `CLAUDE.md` "Stack")
5. Push and open a PR targeting `testing` branch

---

## License

Private — all rights reserved.
