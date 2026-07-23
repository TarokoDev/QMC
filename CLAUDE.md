# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

- `frontend/` — the QMS (Quote Management System) frontend, Vite + React + TS.
- `backend/` — Express + TypeScript + Prisma API, backed by a live Supabase Postgres database (migrated + seeded). See `backend/SUPABASE_SETUP.md` if provisioning a new one.
- `docs/ui-ux/` — numbered wireframes (`1.png`–`7.png`) that define the product flows. When implementing UI, match these against the flow number, not file order — several wireframes represent the same screen in different interaction states rather than separate pages (e.g. flows 4/5/6 are all the "Quotation Items" screen with different accordion/checkbox states).

The frontend's data layer (`src/lib/*-service.ts`) always talks to the backend through async functions, never ad hoc local state — see "Data layer" below. Extend a service + its context when adding new data, don't bypass them.

## Commands

Frontend, run from `frontend/`:
- `npm run dev` — start Vite dev server (needs `VITE_API_URL` — copy `.env.example` to `.env`)
- `npm run build` — type-check (`tsc -b`) then production build (`vite build`); source of truth for "does it compile"
- `npm run lint` — oxlint
- `npm run preview` — preview a production build

Backend, run from `backend/`:
- `npm run dev` — start Express with `tsx watch` (needs `DATABASE_URL`/`DIRECT_URL` — copy `.env.example` to `.env`, see `SUPABASE_SETUP.md`)
- `npm run build` — `tsc` type-check/compile to `dist/`
- `npx prisma migrate dev` — create/update the schema (uses `DIRECT_URL`)
- `npx prisma db seed` — seed folders (HDB/Condo), company settings, quote config, the single mock user. Note: `prisma migrate dev` already runs this automatically after applying a migration — don't also run it manually afterward, folders have no unique constraint on `name` and will duplicate (company/config/user are guarded with a `count === 0` check, folders aren't)
- `npx prisma generate` — regenerate the Prisma client after editing `schema.prisma` (no DB connection needed)

No test runner is configured on either side yet.

## Stack

Frontend:
- Vite + React 19 + TypeScript
- Tailwind CSS v4 (CSS-first config — no `tailwind.config.js`; theme/plugins declared in `src/index.css` via `@import`/`@plugin`/`@theme`)
- DaisyUI (`@plugin "daisyui"` in `src/index.css`)
- shadcn/ui (Radix Nova preset) — components in `src/components/ui/`, added via `npx shadcn@latest add <component>`. `components.json`: `style: radix-nova`, base color `neutral`, alias `@` → `src/`.
- react-router-dom for client-side routing

Backend:
- Express 4 + TypeScript (ESM, `NodeNext` module resolution — relative imports need `.js` extensions even in `.ts` source)
- Prisma ORM against Supabase Postgres (`DATABASE_URL` pooled for the app, `DIRECT_URL` direct for migrations)
- `zod` for request body validation
- No auth in this phase — single hardcoded tenant/user, enforced nowhere; every route is open

## Architecture

### Routing & layout (frontend)

`src/App.tsx` gates all routes behind `SettingsProvider` (`src/lib/settings-context.tsx`) finishing its initial load, wraps them in `CategoryLibraryProvider` (`src/lib/category-library-context.tsx`), then `AppLayout` (`src/components/layout/AppLayout.tsx`), which renders the persistent `AppHeader` ("Kimchinc" wordmark, "Back to Dashboard" link, current-user avatar) around an `<Outlet />`. Routes:

- `/` — `Home`
- `/quotes/new/category` — `Folders` (folder grid)
- `/quotes/new/category/:folderId` — `CategoryList` (categories inside a folder)
- `/quotes/new/category/:folderId/:categoryId` — `ClientList` (clients using a category)
- `/quotes/edit/category/:categoryId` — `CategoryEditor` (edits the category's reusable base content)
- `/quotes/edit/client/:clientId` — `ClientEditor` (edits a client's actual quote, real persisted revisions)
- `/master-template` — `MasterTemplateEditor` (the single org-wide master template, an alternative starting point to a blank quote when creating a client — see below)

### Data layer (frontend)

Every piece of server-owned data goes through the same pattern: a `*-service.ts` (thin async wrapper over `src/lib/api-client.ts`, i.e. `fetch` against `VITE_API_URL`) consumed only via a Context/hook, never imported directly by pages:

- `category-library-service.ts` + `category-library-context.tsx` (`useCategoryLibrary()`) — folders and categories, preloaded globally on app mount (needed for navigation/breadcrumbs everywhere). `Folder { id, name }`, `Category { id, folderId, name, description, quote: Quote }`. A category is purely an organizational grouping of clients (e.g. "HDB 3-room") — its own base `quote` is only used for duplicating one category from another; new clients are seeded from the Master Template or from scratch instead (see below), not from their category's content. Category create/edit (name + optional description) goes through `CategoryFormDialog.tsx` (`src/components/`), not `window.prompt` — reused for both "New Category" and the pencil "Rename" action on `CategoryList.tsx`'s cards, which calls `updateCategory(id, name, description)`.
- `client-service.ts` and `revision-service.ts` — clients and their revisions. Unlike categories, these are **not** preloaded globally and have no Context wrapper; `ClientList.tsx` and `ClientEditor.tsx` fetch them directly with local `useState`/`useEffect`, since they're naturally scoped to "clients of this one category" / "revisions of this one client" rather than needed app-wide.
- `settings-service.ts` + `user-service.ts`, both wrapped by `settings-context.tsx` (`useSettings()`, `useCurrentUser()`) — tenant company info, GST rate, currency, unit options, payment terms schedule, and the current user. These come from single-row tables on the backend (`company_settings`, `quote_config`, `users`) — there's no editing UI for them; they're fixed, seeded values ("hardcoded" from the product's perspective, just served from the DB instead of a frontend constant).
- `master-template-service.ts` — the single org-wide `MasterTemplate` singleton (`GET /api/master-template`, `PUT /api/master-template/quote`). No Context wrapper (only used by `MasterTemplateEditor.tsx`). When creating a client, `ClientFormDialog.tsx`'s source toggle picks whether the new client's `R0` clones the master template's current content or starts blank — see `POST /categories/:categoryId/clients`'s `source: 'master' | 'scratch'` body field.

`api-client.ts`'s `api.get/post/patch/put/delete` throw `ApiError` (with `.status`) on non-2xx responses.

Duplicating a category (via the copy icon on a category card) is the sanctioned way to reuse/amend one without touching the original.

### Quote Editor (`src/pages/QuoteEditor/`)

`QuoteEditorLayout.tsx` is the shared shell (tabs nav, revision chip bar + "+", content panel, `QuotePreview` overlay) — pure/presentational, takes `revisions: RevisionChip[]`, `activeRevisionId`, `onSelectRevision`, `onAddRevision`, `quote`, `onQuoteChange`, `breadcrumbItems`. Two route components feed it, with different revision semantics:

- **`CategoryEditor.tsx`** (`/quotes/edit/category/:categoryId`) — edits a category's reusable base content (used only for category duplication, not client creation — see Data layer above). Resolves the category via `useCategoryLibrary().getCategory()`, then `CategoryEditorInner` (`key={category.id}`) owns a **session-local revision list** (plain `useState`, not persisted — only the active revision's quote round-trips, debounced 500ms, via `updateCategoryQuote`). Revisions here are a drafting convenience before committing content to the category; they reset on reload. This is the original editor behavior, unchanged.
- **`ClientEditor.tsx`** (`/quotes/edit/client/:clientId`) — edits one client's actual quote. Fetches the client + its `RevisionSummary[]` (`revision-service.ts`) on mount, lazily fetches each revision's full `Quote` the first time it's selected (cached in a `Record<revisionId, Quote>` state), and **`+` calls the backend** (`cloneRevision`) to create a real, persisted `Revision` row rather than just cloning in memory. Edits debounce (500ms) into `updateRevisionQuote`. Breadcrumb resolves the category/folder names via the already-loaded `useCategoryLibrary()` (only client/revision data is fetched locally).
- **`MasterTemplateEditor.tsx`** (`/master-template`) — edits the single master template's content, same session-local-revision/debounced-save shape as `CategoryEditor.tsx` but simpler: no folder context, revision chips hidden (`QuoteEditorLayout`'s `hideRevisions`), the "Basic Information" and "Summary" tabs disabled (`disabledTabs`), defaulting to the "Quotation Items" tab (`defaultTab`) — it only exists to maintain the reusable line-item content that clients can be seeded from.
- Three tabs (`basic` / `items` / `summary`), rendered by `QuoteEditorLayout`, are local `useState` there, not routes: `BasicInformationTab.tsx`, `QuotationItemsTab.tsx` (section list + accordion of areas-of-work, each with a `LineItem[]` table), `SummaryTab.tsx` (read-only rollup, also reused inside `QuotePreview.tsx`'s full-screen overlay).

Entry points: `CategoryList.tsx` card click → `ClientList.tsx` (clients under that category); its "Edit Category" (pencil-in-file) icon → `CategoryEditor`. `ClientList.tsx`'s "New Client" opens `ClientFormDialog.tsx`, whose source toggle decides whether creating the client clones the Master Template's current content or starts blank into that client's `R0` server-side.

### Shared domain logic (frontend)

- `src/lib/mock-data.ts` — types only now (`Quote`, `QuoteSection`, `AreaOfWork`, `LineItem`, `CompanyInfo`, `Unit`). No mock data or constants live here anymore — those moved to the backend/services above.
- `src/lib/quote-calculations.ts` — money math (`formatMoney(value, currencySymbol)`, `itemTotal`, `itemProfitPercent`, `sectionTotals`, `getQuoteSummary(quote, gstRate)`). Takes `gstRate`/`currencySymbol` as parameters rather than importing constants — callers pull them from `useSettings()`.

An item's `foc` (free of charge) zeroes its contribution to totals; `inc`/`included` on an *area* controls whether it's counted at all — totals only sum areas where `area.included` is true.

### Backend (`backend/src/`)

- `index.ts` — Express app: CORS, JSON body parsing, mounts routers under `/api`, 404 handler, then a `ZodError`-aware error-handling middleware. Route handlers are wrapped in `asyncHandler` (`async-handler.ts`) since Express 4 doesn't catch async rejections itself.
- `db.ts` — Prisma client singleton.
- `routes/` — one file per resource: `folders.ts`, `categories.ts`, `clients.ts`, `revisions.ts`, `master-template.ts`, `settings.ts`, `me.ts`. Frontend service function names map 1:1 to these routes.
- `quote-mapper.ts` — converts Prisma's nested query results (`Category`/`Revision`/`MasterTemplate` with `quote.sections.areas.items` included, ordered by each row's `position` column) into the same `QuoteDTO` shape the frontend's `Quote` type uses. `clone-quote.ts`'s `buildSectionsCreateInput()` does the reverse — turns a `QuoteSectionDTO[]` into Prisma nested `create` input — shared by category duplication, client creation (from the master template or blank), revision cloning, and master template autosave.
- `PUT /categories/:id/quote`, `PUT /revisions/:id/quote`, and `PUT /master-template/quote` all wholesale-replace sections/areas/items in a transaction (delete then recreate) rather than diffing — correct and simple for a low-frequency autosave.

### Database schema (Prisma, `backend/prisma/schema.prisma`)

```
folders → categories → quote (the category's reusable base content, used only for category duplication)
                     → clients → revisions → quote (a client's actual, editable quote)
master_template → quote (the single org-wide reusable base content clients can be seeded from)
quote → quote_sections → areas_of_work → line_items
company_settings, quote_config, users   (single-row tables, no multi-tenancy)
```

`Quote` is shared structurally between a category's base content, a client's revision, and the master template — it has three nullable, unique FKs (`categoryId`, `revisionId`, `masterTemplateId`); application code ensures exactly one is set per row (not DB-enforced). Every parent→child relation cascades on delete. One category can hold many clients, each with their own independent, persisted revision history (`R0`, `R1`, ...); a new client's `R0` is seeded from the Master Template or from scratch, not from its category.

## Known TODOs

- **PDF export**: shipped via print-styled preview + `window.print()` (option 1 of the two considered — zero deps, crisp text output). `QuotePreview.tsx`'s "Download PDF" button calls `window.print()`; `index.css` has an `@media print` block (`@page { size: A4 }`, `#quote-print-area` visible, everything else hidden via `.print-hidden` / `body * { visibility: hidden }`). The client-rendered `jspdf`+`html2canvas` path remains the fallback if a true one-click download (vs. browser print dialog) is ever needed.
