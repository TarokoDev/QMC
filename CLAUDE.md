# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

- `README.md` — project overview, setup guide, full API documentation with JSON request/response samples for all 26 endpoints, tech stack, architecture diagram, and data types reference. **Refer to this file for API endpoint details, request/response shapes, and onboarding instructions.**
- `frontend/` — the QMS (Quote Management System) frontend, Vite + React + TS.
- `backend/` — Express + TypeScript + Prisma API, backed by a live Supabase Postgres database (migrated + seeded). See `backend/SUPABASE_SETUP.md` if provisioning a new one.
- `docs/ui-ux/` — numbered wireframes (`1.png`–`7.png`) that define the product flows. When implementing UI, match these against the flow number, not file order — several wireframes represent the same screen in different interaction states rather than separate pages (e.g. flows 4/5/6 are all the "Quotation Items" screen with different accordion/checkbox states).

The frontend's data layer (`src/lib/*-service.ts`) always talks to the backend through async functions, never ad hoc local state — see "Data layer" below. Extend a service + its context when adding new data, don't bypass them.

## Environments

Three branches, three deploy targets:

- `main` — local dev. Talks to the shared Supabase project (same one `testing` uses).
- `testing` — frontend on Netlify, backend on Render. Same Supabase project/DB as `main` (shared data).
- `prod` — frontend on Netlify, backend on Render, same shape as `testing`, but its own **separate, clean-slate Supabase project** — its own DB, its own Auth users, not shared with main/testing.

Auth: each Supabase project has exactly two Supabase Auth users — **kim hoe** (the real user; prod is used mainly by her) and **admin** (a dev sandbox account). Both have identical permissions — there's no role system — isolation between them comes from per-user data ownership (`Folder.ownerId` / `MasterTemplate.ownerId`, see schema below), not authorization tiers. `CompanySettings`/`QuoteConfig` stay global/shared singletons since they're tenant-wide config, not per-user data.

**Demo playground account**: a third Supabase Auth user in the shared main/testing project, manually created via the dashboard (not scripted — no service-role key exists in this codebase), for demoing the app (e.g. interviews) without touching kim hoe's real data. Login.tsx's "Use Demo Account" button signs in with fixed `VITE_DEMO_EMAIL`/`VITE_DEMO_PASSWORD` credentials, then calls `POST /api/demo/reset` (`backend/src/routes/demo.ts`) to wipe and reseed its `Folder`/`MasterTemplate` data (scoped to `ownerId === DEMO_USER_ID`, guarded so the route 403s for anyone else) back to a fixed dataset (`backend/src/demo-seed-data.ts`: HDB 4-Room/5-Room categories, one client each, 2 revisions of realistic line items). The same reset also fires on explicit logout and via a "Reset Playground" menu item (`AppHeader.tsx`, shown only to the demo user), so the playground self-heals regardless of how the previous session ended — there's no reliable tab-close hook, so login-time reset is the actual correctness guarantee. `ProfileSettings.tsx` is read-only for this account (`useIsDemoUser()` in `auth-context.tsx`, matched by email). **Known limitation**: single shared account/`ownerId`, no per-session isolation — concurrent demo sessions would collide/reset each other; acceptable since it's a single-viewer interview demo, not a public sandbox. The reset route inserts level-by-level with `createMany` (ids generated up front via `flattenQuoteSections()`) rather than Prisma's nested `create` — the seeded tree is ~500 rows, and nested `create` issues one round trip per row, which blew past Prisma's interactive-transaction timeout over the pooled Supabase connection (52s vs ~7s batched). One-time setup script `backend/scripts/set-demo-display-name.ts` sets the demo account's display name via its own JWT (self-service `PUT /auth/v1/user`, no service-role key) — rerun it if the demo Supabase Auth user is ever recreated.

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
- `@supabase/supabase-js` — Auth only (login/logout/change-password), not used as a DB client from the frontend
- `xlsx` — Excel export of a quote (`quote-excel-export.ts`)

Backend:
- Express 4 + TypeScript (ESM, `NodeNext` module resolution — relative imports need `.js` extensions even in `.ts` source)
- Prisma ORM against Supabase Postgres (`DATABASE_URL` pooled for the app, `DIRECT_URL` direct for migrations)
- `zod` for request body validation
- Auth: Supabase Auth. Frontend (`@supabase/supabase-js`) drives login/logout/change-password directly against Supabase; backend verifies the resulting JWT (`jose`, ES256, against Supabase's JWKS — `SUPABASE_URL`, cached in memory after first fetch, not re-fetched per request) via `require-auth.ts` middleware on every `/api/*` route, attaching `req.authUserId` (the Supabase auth UID). This project's on Supabase's newer asymmetric signing-keys setup, not the legacy shared HS256 secret. Only two users ever exist per Supabase project — see "Environments" above. There's no backend user-profile table — display name/email come straight from the Supabase session (`useCurrentUser()` in `auth-context.tsx`), and `Folder`/`MasterTemplate` ownership is keyed directly off the auth UID, so nothing needs a DB-side link to "the user".

## Architecture

### Routing & layout (frontend)

`src/App.tsx` wraps everything in `AuthProvider` (`src/lib/auth-context.tsx`, Supabase Auth session) first — no session renders only `/login` (`src/pages/Login.tsx`); a session gates the rest behind `SettingsProvider` (`src/lib/settings-context.tsx`) finishing its initial load, wraps them in `CategoryLibraryProvider` (`src/lib/category-library-context.tsx`), then `AppLayout` (`src/components/layout/AppLayout.tsx`), which renders the persistent `AppHeader` ("Kimchinc" wordmark, "Back to Dashboard" link, current-user avatar with a Profile Settings / Logout menu) around an `<Outlet />`. Routes:

- `/` — `Home`
- `/quotes/new/category` — `Folders` (folder grid)
- `/quotes/new/category/:folderId` — `CategoryList` (categories inside a folder)
- `/quotes/new/category/:folderId/:categoryId` — `ClientList` (clients using a category)
- `/quotes/edit/category/:categoryId` — `CategoryEditor` (edits the category's reusable base content)
- `/quotes/edit/client/:clientId` — `ClientEditor` (edits a client's actual quote, real persisted revisions)
- `/master-template` — `MasterTemplateEditor` (the single org-wide master template, an alternative starting point to a blank quote when creating a client — see below)
- `/profile` — `ProfileSettings` (display name, phone number, change password — all via `useAuth()`/`supabase.auth.updateUser`, no backend involved), reached from `AppHeader`'s avatar menu

### Data layer (frontend)

Every piece of server-owned data goes through the same pattern: a `*-service.ts` (thin async wrapper over `src/lib/api-client.ts`, i.e. `fetch` against `VITE_API_URL`) consumed only via a Context/hook, never imported directly by pages:

- `category-library-service.ts` + `category-library-context.tsx` (`useCategoryLibrary()`) — folders and categories, preloaded globally on app mount (needed for navigation/breadcrumbs everywhere). `Folder { id, name }`, `Category { id, folderId, name, description, quote: Quote }`. A category is purely an organizational grouping of clients (e.g. "HDB 3-room") — its own base `quote` is only used for duplicating one category from another; new clients are seeded from the Master Template or from scratch instead (see below), not from their category's content. Category create/edit (name + optional description) goes through `CategoryFormDialog.tsx` (`src/components/`), not `window.prompt` — reused for both "New Category" and the pencil "Rename" action on `CategoryList.tsx`'s cards, which calls `updateCategory(id, name, description)`.
- `client-service.ts` and `revision-service.ts` — clients and their revisions. Unlike categories, these are **not** preloaded globally and have no Context wrapper; `ClientList.tsx` and `ClientEditor.tsx` fetch them directly with local `useState`/`useEffect`, since they're naturally scoped to "clients of this one category" / "revisions of this one client" rather than needed app-wide. `Client { id, categoryId, name, email, contactNumber }` — `email`/`contactNumber` default to `""` server-side (not nullable); `ClientList.tsx`'s cards only render the number/email lines when non-empty, and title-case the name via `capitalizeWords()` (see below).
- `settings-service.ts`, wrapped by `settings-context.tsx` (`useSettings()`) — tenant company info, GST rate, currency, unit options, payment terms schedule. Comes from single-row tables on the backend (`company_settings`, `quote_config`) — there's no editing UI for them; they're fixed, seeded values ("hardcoded" from the product's perspective, just served from the DB instead of a frontend constant). `useCurrentUser()` (name/initials/email for display) lives in `auth-context.tsx` instead, derived from the Supabase session — no backend call.
- `master-template-service.ts` — the single org-wide `MasterTemplate` singleton (`GET /api/master-template`, `PUT /api/master-template/quote`). No Context wrapper (only used by `MasterTemplateEditor.tsx`). When creating a client, `ClientFormDialog.tsx`'s source toggle picks whether the new client's `R0` clones the master template's current content or starts blank — see `POST /categories/:categoryId/clients`'s `source: 'master' | 'scratch'` body field.

`api-client.ts`'s `api.get/post/patch/put/delete` throw `ApiError` (with `.status`) on non-2xx responses.

Duplicating a category (via the copy icon on a category card) is the sanctioned way to reuse/amend one without touching the original.

### Quote Editor (`src/pages/QuoteEditor/`)

`QuoteEditorLayout.tsx` is the shared shell (tabs nav, revision chip bar + "+", toolbar with "Reset Template"/"Use Master Template"/"Preview Quote", content panel, `QuotePreview` overlay) — pure/presentational, takes `revisions: RevisionChip[]`, `activeRevisionId`, `onSelectRevision`, `onAddRevision`, `quote`, `onQuoteChange`, `breadcrumbItems`, plus optional `onClientFieldChange`/`onResetTemplate`/`onUseMasterTemplate` (only wired by `ClientEditor.tsx` — see below). Two route components feed it, with different revision semantics:

- **`CategoryEditor.tsx`** (`/quotes/edit/category/:categoryId`) — edits a category's reusable base content (used only for category duplication, not client creation — see Data layer above). Resolves the category via `useCategoryLibrary().getCategory()`, then `CategoryEditorInner` (`key={category.id}`) owns a **session-local revision list** (plain `useState`, not persisted — only the active revision's quote round-trips, debounced 500ms, via `updateCategoryQuote`). Revisions here are a drafting convenience before committing content to the category; they reset on reload. This is the original editor behavior, unchanged.
- **`ClientEditor.tsx`** (`/quotes/edit/client/:clientId`) — edits one client's actual quote. Fetches the client + its `RevisionSummary[]` (`revision-service.ts`) on mount, lazily fetches each revision's full `Quote` the first time it's selected (cached in a `Record<revisionId, Quote>` state), and **`+` calls the backend** (`cloneRevision`) to create a real, persisted `Revision` row rather than just cloning in memory. Edits debounce (500ms) into `updateRevisionQuote`. Breadcrumb resolves the category/folder names via the already-loaded `useCategoryLibrary()` (only client/revision data is fetched locally).
  - **Client info stays live, not snapshotted**: `Basic Information`'s Name/Email/Contact fields are stored per-revision on `quote.info.clientName/email/contact`, but `withLiveClientInfo()` overwrites them from the current `Client` record every time a revision's quote is loaded into state (initial load, revision switch, clone) — so old revisions never show stale client info. On the **latest revision only**, those three fields are editable again (`onClientFieldChange`); edits update both the quote's `info` (autosaves as usual) and the `Client` record itself (separate debounced save, `clientSaveRef`), keeping `ClientList.tsx`'s edit dialog and the quote in sync both directions.
  - **"Reset Template" / "Use Master Template"** buttons (toolbar, latest revision only) are a safety net for mistakes: each opens a destructive `ConfirmDialog`, then either clears `quote.sections` to `[]` or replaces them with the current Master Template's sections (via `master-template-service.getMasterTemplate()`) — `quote.info` (client details, project site, etc.) is untouched either way.
- **`MasterTemplateEditor.tsx`** (`/master-template`) — edits the single master template's content, same session-local-revision/debounced-save shape as `CategoryEditor.tsx` but simpler: no folder context, revision chips hidden (`QuoteEditorLayout`'s `hideRevisions`), the "Basic Information" and "Summary" tabs disabled (`disabledTabs`), defaulting to the "Quotation Items" tab (`defaultTab`) — it only exists to maintain the reusable line-item content that clients can be seeded from. No client-field sync or Reset/Use Master Template buttons here (no `Client` entity, and prefilling itself from itself makes no sense).
- Three tabs (`basic` / `items` / `summary`), rendered by `QuoteEditorLayout`, are local `useState` there, not routes: `BasicInformationTab.tsx`, `QuotationItemsTab.tsx` (section list + accordion of areas-of-work, each with a `LineItem[]` table), `SummaryTab.tsx` (read-only rollup, also reused inside `QuotePreview.tsx`'s full-screen overlay).
  - **Section/area numbering is derived live from array position, never stored** — `QuotationItemsTab.tsx`'s `sectionLabel(index)` computes "Section A/B/C..." from a section's current index in `quote.sections` (mirrored by the same `toLetter(index)` pattern in `SummaryTab.tsx`, `quote-excel-export.ts`, `QuotePrintDocument.tsx`), and area rows are numbered `{sectionLetter}.{areaIndex + 1}`. Deleting a section/area reflows the remaining ones down immediately instead of leaving permanent letter gaps; `QuoteSection.name` itself is just a non-displayed placeholder string set at creation (never user-editable). Each section (in the sidebar tab list) and each area-of-work row has its own delete icon, gated behind a `ConfirmDialog`.

Entry points: `CategoryList.tsx` card click → `ClientList.tsx` (clients under that category); its "Edit Category" (pencil-in-file) icon → `CategoryEditor`. `ClientList.tsx`'s "New Client" opens `ClientFormDialog.tsx`, whose source toggle decides whether creating the client clones the Master Template's current content or starts blank into that client's `R0` server-side.

### Shared domain logic (frontend)

- `src/lib/mock-data.ts` — types only now (`Quote`, `QuoteSection`, `AreaOfWork`, `LineItem`, `CompanyInfo`, `Unit`). No mock data or constants live here anymore — those moved to the backend/services above.
- `src/lib/utils.ts` — `cn()` (clsx + tailwind-merge, used everywhere for conditional classNames) and `capitalizeWords(value)` (title-cases each word; reusable helper, currently used on `ClientList.tsx`'s client-name cards).
- `src/lib/quote-calculations.ts` — money math (`formatMoney(value, currencySymbol)`, `itemTotal`, `itemProfitPercent`, `includedAreas`, `sectionTotals`, `getQuoteSummary(quote, gstRate)`). Takes `gstRate`/`currencySymbol` as parameters rather than importing constants — callers pull them from `useSettings()`.
- `src/lib/quote-excel-export.ts` — `exportQuoteToExcel()` (via `xlsx`), mirrors `QuotePrintDocument.tsx`'s layout as a flat `.xlsx` sheet. Wired to `QuotePreview.tsx`'s "Download Excel" button, next to "Download PDF" (`window.print()`).

Three-tier gating on totals, checked outermost-in — **all three** must hold for a line item to count toward a section's cards (`sectionTotals`) or the quote-wide Summary/Preview/PDF/Excel (`getQuoteSummary`): the section's `complete` checkbox (sidebar, unlabeled) → the area's `included` checkbox (accordion header, the "sub-category") → the item's own `inc` checkbox (per-row). Additionally, `item.foc` (free of charge) zeroes that item's own contribution regardless of `inc` — `itemTotal()` returns `0` when `foc || !inc`, cost sums separately zero when `!inc` (but *not* when `foc`, since a FOC item still has a real cost to the business — that's the point of tracking it as a loss). Rendered amount cells show the literal text `FOC` instead of `S$0.00` for FOC items (`SummaryTab.tsx`, `QuotePrintDocument.tsx`, `quote-excel-export.ts`) — the "Total" column keeps showing `S$0.00` only in the editable `QuotationItemsTab.tsx` table, not in read-only output.

### Backend (`backend/src/`)

- `index.ts` — Express app: CORS, JSON body parsing, mounts routers under `/api`, 404 handler, then a `ZodError`-aware error-handling middleware. Route handlers are wrapped in `asyncHandler` (`async-handler.ts`) since Express 4 doesn't catch async rejections itself.
- `db.ts` — Prisma client singleton.
- `routes/` — one file per resource: `folders.ts`, `categories.ts`, `clients.ts`, `revisions.ts`, `master-template.ts`, `settings.ts`. Frontend service function names map 1:1 to these routes.
- `quote-mapper.ts` — converts Prisma's nested query results (`Category`/`Revision`/`MasterTemplate` with `quote.sections.areas.items` included, ordered by each row's `position` column) into the same `QuoteDTO` shape the frontend's `Quote` type uses. `clone-quote.ts`'s `buildSectionsCreateInput()` does the reverse — turns a `QuoteSectionDTO[]` into Prisma nested `create` input — shared by category duplication, client creation (from the master template or blank), revision cloning, and master template autosave.
- `PUT /categories/:id/quote`, `PUT /revisions/:id/quote`, and `PUT /master-template/quote` all wholesale-replace sections/areas/items in a transaction (delete then recreate) rather than diffing — correct and simple for a low-frequency autosave.

### Database schema (Prisma, `backend/prisma/schema.prisma`)

```
folders → categories → quote (the category's reusable base content, used only for category duplication)
                     → clients → revisions → quote (a client's actual, editable quote)
master_template → quote (one row per owner — a reusable base content clients can be seeded from)
quote → quote_sections → areas_of_work → line_items
company_settings, quote_config           (single-row, global/shared tenant config)
```

`Quote` is shared structurally between a category's base content, a client's revision, and the master template — it has three nullable, unique FKs (`categoryId`, `revisionId`, `masterTemplateId`); application code ensures exactly one is set per row (not DB-enforced). Every parent→child relation cascades on delete. One category can hold many clients, each with their own independent, persisted revision history (`R0`, `R1`, ...); a new client's `R0` is seeded from the Master Template or from scratch, not from its category.

**Per-user data scoping**: `Folder.ownerId` and `MasterTemplate.ownerId` hold the Supabase auth UID (`req.authUserId`, set by `require-auth.ts`) that owns them — plain strings, no FK relation, no local `users` table at all (Supabase's `auth.users` is the only user table). Everything nested under a folder (categories → clients → revisions → quote) has no `ownerId` column of its own; ownership is enforced per-request via Prisma relation filters (e.g. `where: { folder: { ownerId: req.authUserId } }`) rather than denormalized columns.

## Known TODOs

- **Auth rollout, in progress**: migration `20260724020000_add_auth_owner_columns` added `authUserId`/`ownerId` as **nullable** (already applied to the shared main/testing DB); a later migration (`20260724030000_drop_users_table`) dropped the local `users` table entirely once display data moved to the Supabase session. Once kim hoe's Supabase Auth user is created and `npx prisma db seed` has backfilled ownership of pre-auth dev data (`KIM_HOE_AUTH_USER_ID` env var, see `backend/.env.example`), a follow-up migration must flip `Folder.ownerId`/`MasterTemplate.ownerId` to `NOT NULL`.
- **Role/permissions, not yet built**: both Supabase Auth users currently have identical permissions. If role-based authorization is ever needed, prefer Supabase's `app_metadata` (server-settable only, via the Admin API — unlike `user_metadata`, which the user can edit themselves) for a `role` claim readable straight off the verified JWT in `require-auth.ts`, over adding a local `profiles`/`users` table back. "Linked folders/quotes" already falls out of `ownerId` scoping and needs no extra table.
- **PDF export**: shipped via print-styled preview + `window.print()` (option 1 of the two considered — zero deps, crisp text output). `QuotePreview.tsx`'s "Download PDF" button calls `window.print()`; `index.css` has an `@media print` block (`@page { size: A4 }`, `#quote-print-area` visible, everything else hidden via `.print-hidden` / `body * { visibility: hidden }`). Page breaks are kept from landing mid-section/mid-table: `#quote-print-area`'s print rules add `break-inside: avoid` on every `&lt;tr&gt;` and on `tbody.print-avoid-break`/`.print-avoid-break` (applied per-section `&lt;tbody&gt;` and to the Payment Terms/Terms & Conditions/signature tables in `QuotePrintDocument.tsx`), plus `thead { display: table-header-group }` so the item-table header repeats across pages. The client-rendered `jspdf`+`html2canvas` path remains the fallback if a true one-click download (vs. browser print dialog) is ever needed.
- **Excel export**: `quote-excel-export.ts` flattens the quote to one worksheet (client-side, no backend involvement) — good enough for now; no multi-sheet or styling parity with the PDF attempted yet.
