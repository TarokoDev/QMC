/**
 * Sits in normal flow as the last row of a full-height column, so it never
 * overlaps the scrollable content above it — the pages that scroll (quote
 * editor, folder grids) would otherwise render underneath a fixed footer.
 */
export function AppFooter() {
  return (
    <p className="shrink-0 py-2 text-center text-xs text-muted-foreground">
      Created by Austin Nathaniel Soriano Miranda — 2026 — v{__APP_VERSION__}
    </p>
  )
}
