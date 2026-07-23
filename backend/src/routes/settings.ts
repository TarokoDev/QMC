import { Router } from 'express'
import { asyncHandler } from '../async-handler.js'
import { prisma } from '../db.js'

export const settingsRouter = Router()

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
      company: {
        name: company.name,
        address: company.address,
        tel: company.tel,
        uen: company.uen,
        gst: company.gst,
        website: company.website,
      },
      currency: config.currency,
      currencySymbol: config.currencySymbol,
      gstRate: Number(config.gstRate),
      unitOptions: config.unitOptions,
      paymentTermsSchedule: config.paymentTermsSchedule,
    })
  }),
)
