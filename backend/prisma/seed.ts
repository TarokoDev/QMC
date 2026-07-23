import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.folder.createMany({
    data: [{ name: 'HDB' }, { name: 'Condo' }],
    skipDuplicates: true,
  })

  const companyCount = await prisma.companySettings.count()
  if (companyCount === 0) {
    await prisma.companySettings.create({
      data: {
        name: 'Elysian Design Studio One Pte Ltd',
        address: '592A Balestier Road, Singapore 329902',
        tel: '8780 3229',
        uen: '202451797D',
        gst: '20245179D',
        website: 'www.elysiandesign.com.sg',
      },
    })
  }

  const configCount = await prisma.quoteConfig.count()
  if (configCount === 0) {
    await prisma.quoteConfig.create({
      data: {
        gstRate: 0.09,
        currency: 'SGD',
        currencySymbol: 'S$',
        unitOptions: [
          { value: 'Ft', label: 'Ft (per Feet)' },
          { value: 'Lot', label: 'Lot (per Lot/Unit)' },
          { value: 'SqFt', label: 'SqFt (Square Feet)' },
        ],
        paymentTermsSchedule: [
          { label: '5% shall be received as deposit upon confirmation of the renovation', percent: 0.05 },
          {
            label:
              '2nd Payment of 45% of the total amount of the Quotation Sum and remainder of Deposit shall be payable by the Owner to the Contractor, upon the commencement of work',
            percent: 0.45,
          },
          {
            label:
              '3rd payment of 30% of the total amount of the Quotation Sum shall by payable upon completion of wet works, along with confirmation of carpentry measurement on drawing to proceed with fabrication (incl. full payment of Variation Order, if any)',
            percent: 0.3,
          },
          {
            label:
              '4th payment of 15% of the total amount of the Quotation Sum is payable for other fixture 3 days before installation of carpentry/woodwork and kitchen cabinet (incl. full payment of Variation Order, if any)',
            percent: 0.15,
          },
          {
            label:
              'Final payment of 5% of the total amount of the Quotation Sum is payable upon completion of the renovation work. The owner shall provide 30 days for rectifying work (if any). The recectify list shall be listed and pass to the Contractor to carry out the work. Upon completion of the rectifacation work, the owner shall provide the payment of 5% to the Contractor.',
            percent: 0.05,
          },
        ],
      },
    })
  }

  const userCount = await prisma.user.count()
  if (userCount === 0) {
    await prisma.user.create({ data: { name: 'Kim Hoe', initials: 'KH' } })
  }

  const masterTemplateCount = await prisma.masterTemplate.count()
  if (masterTemplateCount === 0) {
    await prisma.masterTemplate.create({ data: { quote: { create: {} } } })
  }

  console.log('Seed complete.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
