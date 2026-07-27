import { Router } from 'express'
import type { Request, Response } from 'express'
import { asyncHandler } from '../async-handler.js'
import { prisma } from '../db.js'
import { companyLogoBodySchema } from '../schemas.js'

export const settingsRouter = Router()

interface CompanyRow {
  name: string
  address: string
  tel: string
  uen: string
  gst: string
  website: string
  logoDataUrl: string | null
}

function toCompanyDTO(company: CompanyRow) {
  return {
    name: company.name,
    address: company.address,
    tel: company.tel,
    uen: company.uen,
    gst: company.gst,
    website: company.website,
    logoDataUrl: company.logoDataUrl,
  }
}

/**
 * The logo is a single global setting, unlike everything else in the app, which
 * is scoped by `owner_id`. The demo account's data is sandboxed and reset on
 * every login, but a global row is not — a demo upload would change the logo on
 * every real user's quotes.
 */
function blockDemo(req: Request, res: Response): boolean {
  if (req.authRole !== 'demo') return false
  res.status(403).json({ error: 'The demo account cannot change the company logo' })
  return true
}

async function writeLogo(res: Response, logoDataUrl: string | null) {
  const company = await prisma.companySettings.findFirst()
  if (!company) {
    return res.status(500).json({ error: 'Settings not seeded — run `npx prisma db seed`' })
  }

  const updated = await prisma.companySettings.update({
    where: { id: company.id },
    data: { logoDataUrl },
  })

  res.json({ company: toCompanyDTO(updated) })
}

settingsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [company, config] = await Promise.all([
      prisma.companySettings.findFirst(),
      prisma.quoteConfig.findFirst(),
    ])

    if (!company || !config) {
      return res.status(500).json({ error: 'Settings not seeded — run `npx prisma db seed`' })
    }

    res.json({
      company: toCompanyDTO(company),
      currency: config.currency,
      currencySymbol: config.currencySymbol,
      gstRate: Number(config.gstRate),
      unitOptions: config.unitOptions,
      paymentTermsSchedule: config.paymentTermsSchedule,
    })
  }),
)

settingsRouter.put(
  '/company-logo',
  asyncHandler(async (req, res) => {
    if (blockDemo(req, res)) return
    const body = companyLogoBodySchema.parse(req.body)
    await writeLogo(res, body.dataUrl)
  }),
)

settingsRouter.delete(
  '/company-logo',
  asyncHandler(async (req, res) => {
    if (blockDemo(req, res)) return
    await writeLogo(res, null)
  }),
)
