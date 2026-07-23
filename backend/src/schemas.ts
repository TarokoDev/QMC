import { z } from 'zod'

export const nameBodySchema = z.object({
  name: z.string().min(1),
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
