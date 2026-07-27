import { z } from 'zod'
import { parseLogoDataUrl } from './company-logo.js'
import { MAX_DOCUMENT_BYTES } from './document-path.js'

export const nameBodySchema = z.object({
  name: z.string().min(1),
})

/// Only the event kind comes from the client — who it happened to is taken from
/// the verified JWT, never from the body.
export const authEventBodySchema = z.object({
  event: z.enum(['login', 'logout']),
})

const DEFAULT_RANGE_DAYS = 30

/// Shared by the metrics tiles and the event log so one date control drives
/// both. `to` defaults to now, `from` to 30 days back.
const dateRangeShape = {
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
}

/// An inverted range would silently return nothing, which reads as "this user
/// did nothing" rather than "you typed the dates backwards".
function withRangeDefaults<T extends { from?: Date; to?: Date }>(value: T, ctx: z.RefinementCtx) {
  const to = value.to ?? new Date()
  const from = value.from ?? new Date(to.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000)

  if (from > to) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: '`from` must not be after `to`' })
    return z.NEVER
  }
  return { ...value, from, to }
}

export const authEventQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    /// Id of the last row of the previous page (see admin.ts — `createdAt` alone
    /// is not unique, so paging on it can drop rows sharing a timestamp).
    cursor: z.string().optional(),
    authUserId: z.string().optional(),
    event: z.enum(['login', 'logout']).optional(),
    ...dateRangeShape,
  })
  .transform(withRangeDefaults)

export const adminMetricsQuerySchema = z
  .object({
    /// Absent → project-wide metrics; present → that one user's.
    authUserId: z.string().optional(),
    ...dateRangeShape,
  })
  .transform(withRangeDefaults)

export const refreshQuerySchema = z.object({
  /// The dashboard's Refresh button, bypassing the cached Supabase user list.
  refresh: z
    .enum(['1', 'true'])
    .optional()
    .transform((value) => value !== undefined),
})

export const categoryBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
})

export const clientBodySchema = z.object({
  name: z.string().min(1),
  email: z.string().optional(),
  contactNumber: z.string().optional(),
  source: z.enum(['master', 'scratch']).default('scratch'),
})

const lineItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  qty: z.number(),
  unit: z.enum(['Ft', 'Lot', 'SqFt']),
  cost: z.number(),
  selling: z.number(),
  foc: z.boolean(),
  inc: z.boolean(),
})

const areaOfWorkSchema = z.object({
  id: z.string(),
  name: z.string(),
  included: z.boolean(),
  items: z.array(lineItemSchema),
})

const quoteSectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  complete: z.boolean(),
  areas: z.array(areaOfWorkSchema),
})

export const quoteSchema = z.object({
  info: z.object({
    clientName: z.string(),
    projectSite: z.string(),
    email: z.string(),
    contact: z.string(),
    quotationRef: z.string(),
    refNumber: z.string(),
    date: z.string(),
    designer: z.string(),
  }),
  sections: z.array(quoteSectionSchema),
})

export const putQuoteBodySchema = z.object({
  quote: quoteSchema,
})

/// Describes a file the browser is about to upload. `sizeBytes` is what the
/// client claims; the confirm route checks the real object afterwards, so this
/// bound only exists to fail fast and cheaply.
export const createDocumentBodySchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().max(255).default('application/octet-stream'),
  sizeBytes: z.number().int().positive().max(MAX_DOCUMENT_BYTES),
})

/// The browser downscales and re-encodes before sending, so this is the real
/// bound on what lands in the database, not just a fail-fast.
export const companyLogoBodySchema = z.object({
  dataUrl: z.string().refine((value) => parseLogoDataUrl(value) !== null, {
    message: 'Expected a PNG, JPEG or WebP data URI within the size limit',
  }),
})
