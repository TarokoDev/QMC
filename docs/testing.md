# Testing

Unit tests run on **Vitest** in both workspaces. They cover the app's highest-risk logic — the quote money math and the quote save/clone/read pipeline — and run automatically in CI on every push and pull request.

## Running tests

From `frontend/` or `backend/`:

| Command | What it does |
| --- | --- |
| `npm test` | Run the full suite once (what CI runs) |
| `npm run test:watch` | Watch mode — reruns affected tests on save |
| `npx vitest run src/lib/quote-calculations.test.ts` | Run a single file |
| `npx vitest run -t "FOC"` | Run only tests whose name matches |

No environment variables, database, or network access needed — every test is a pure function test.

## What is covered

**Frontend (`frontend/src/lib/*.test.ts`)**

- `quote-calculations.test.ts` — all money math: `itemTotal`, `itemProfitPercent`, `sectionTotals`, `getQuoteSummary`, `formatMoney`. Encodes the three-tier gating rule (section `complete` → area `included` → item `inc`) and the FOC asymmetry (an FOC item contributes cost but not price — it's tracked as a loss).
- `quote-excel-export.test.ts` — the pure worksheet layout (`buildExcelRows`): section/area/item numbering, the literal `FOC` amount cell, Sub Total/GST/Grand Total rows, payment-term splits. The impure `XLSX.writeFile` wrapper is never called in tests.
- `utils.test.ts` — `capitalizeWords`, `cn`.

**Backend (`backend/src/*.test.ts`)**

- `clone-quote.test.ts` — `buildSectionsCreateInput`: position injection from array index, exact field copying, no id leakage.
- `quote-mapper.test.ts` — row→DTO mapping: position-based ordering, Decimal→number coercion, `BLANK_QUOTE` fallback, and the **round-trip invariant** (DTO → create input → simulated rows → DTO is lossless) that guards every clone/autosave path.
- `schemas.test.ts` — zod contract for `PUT .../quote` bodies and client creation. Two tests are labeled `KNOWN GAP` — they pin currently-accepted invalid input (negative/Infinity numbers); if the schema is tightened, flip them deliberately.

## Conventions

- **Colocated files**: `foo.test.ts` sits next to `foo.ts`. Vitest picks up `src/**/*.test.ts`; `tsc` builds exclude them (backend via `tsconfig.json` `exclude`; frontend `noEmit` anyway).
- **Fixture builders**: use `makeItem`/`makeArea`/`makeSection`/`makeQuote` (frontend: `src/test-utils/quote-builders.ts`; backend DTO variants: `makeItemDTO` etc.). Defaults are the happy path — override only the fields the rule under test cares about, so the test body reads as the rule:

  ```ts
  sectionTotals(makeSection({ areas: [makeArea({ items: [makeItem({ foc: true })] })] }))
  ```

- **Name tests after business rules**, not implementations: `it('FOC item counts toward cost but NOT price (tracked as a loss)')`, not `it('returns correct object')`. Cite CLAUDE.md in a comment when a rule is non-obvious.
- **Floating point**: assert money sums with `toBeCloseTo(value, 10)`, never `toBe`, when GST or fractional quantities are involved.

## Automation (regression prevention)

`.github/workflows/test.yml` runs on every **push and pull request** targeting `main`, `testing`, or `prod`:

- **frontend job**: `npm ci` → `oxlint` → `vitest run` → `tsc -b && vite build`
- **backend job**: `npm ci` → `prisma generate` → `vitest run` → `tsc`

Results appear in the repo's **Actions** tab and as checks on each PR/commit. No secrets are configured or needed.

**Recommended (manual, one-time)**: in GitHub → Settings → Branches, add branch protection on `main`/`testing`/`prod` requiring the "Frontend" and "Backend" checks to pass — that makes a red suite actually block merges rather than just flagging them.

## Adding a test

1. Create `whatever.test.ts` next to the module.
2. Import `describe/it/expect` from `vitest` (no globals configured).
3. Build inputs with the fixture builders; add a builder default only if most tests need it.
4. Run `npm run test:watch` while writing; CI enforces the rest.

## Future tiers (not built yet)

- **Route integration tests**: supertest + `vi.mock` of `src/db.js` (Prisma) and `src/require-auth.js`. The only DB is the live shared Supabase project, so real-DB tests are off the table until a disposable Postgres (docker or Supabase branch DB) exists — gate those behind a `TEST_DATABASE_URL` guard if added.
- **Component tests**: `@testing-library/react` + jsdom for `SummaryTab`/`QuotePrintDocument`. Low priority — they are thin views over already-tested functions.
