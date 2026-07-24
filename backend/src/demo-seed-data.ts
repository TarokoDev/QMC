import { randomUUID } from 'node:crypto'
import type { QuoteSectionDTO } from './types.js'

// Fixed, realistic-looking demo dataset — reset back to this whenever the
// demo account logs in, logs out, or clicks "Reset Playground".

function item(
  description: string,
  qty: number,
  unit: 'Ft' | 'Lot' | 'SqFt',
  cost: number,
  selling: number,
  opts: { foc?: boolean; inc?: boolean } = {},
) {
  return {
    id: randomUUID(),
    description,
    qty,
    unit,
    cost,
    selling,
    foc: opts.foc ?? false,
    inc: opts.inc ?? true,
  }
}

function area(name: string, included: boolean, items: ReturnType<typeof item>[]) {
  return { id: randomUUID(), name, included, items }
}

function section(
  name: string,
  description: string,
  complete: boolean,
  areas: ReturnType<typeof area>[],
): QuoteSectionDTO {
  return { id: randomUUID(), name, description, complete, areas }
}

function hackingAndMasonrySection() {
  return section('Hacking & Masonry Works', 'Demolition and structural changes to prepare the unit for renovation.', true, [
    area('General Hacking', true, [
      item('Hack existing wall tiles (kitchen + bathrooms)', 180, 'SqFt', 3.5, 5.5),
      item('Hack existing floor tiles (common areas)', 320, 'SqFt', 3, 4.8),
      item('Cart away debris', 1, 'Lot', 350, 480),
    ]),
    area('Wall & Partition', true, [
      item('Build new bedroom partition wall (brickwork)', 90, 'SqFt', 22, 32),
      item('Plaster & skim coat new wall', 90, 'SqFt', 8, 13),
    ]),
  ])
}

function electricalSection() {
  return section('Electrical Works', 'Rewiring, additional power/lighting points, and aircon wiring.', true, [
    area('Rewiring & Points', true, [
      item('Rewire main DB box + upgrade to 18-way', 1, 'Lot', 480, 680),
      item('Additional 13A power point', 14, 'Lot', 35, 55),
      item('Additional lighting point (with switch)', 10, 'Lot', 40, 60),
      item('Data/TV point relocation', 3, 'Lot', 60, 90),
    ]),
    area('Aircon Wiring', true, [
      item('Isolator + wiring for aircon condenser (per system)', 3, 'Lot', 90, 130),
    ]),
  ])
}

function plumbingSection() {
  return section('Plumbing Works', 'Water point relocation and sanitary ware installation for kitchen and bathrooms.', true, [
    area('Kitchen & Bathroom Plumbing', true, [
      item('Reroute kitchen sink plumbing', 1, 'Lot', 280, 400),
      item('Bathroom water point relocation', 2, 'Lot', 220, 320),
      item('Install new sanitary wares (WC, basin, shower set)', 2, 'Lot', 650, 900),
    ]),
  ])
}

function flooringSection() {
  return section('Flooring & Tiling', 'Supply and installation of flooring across living, bedroom, and wet areas.', true, [
    area('Living & Common Areas', true, [
      item('Supply & lay 600x600 porcelain tiles', 320, 'SqFt', 6.5, 9.8),
      item('Skirting', 140, 'Ft', 3, 5),
    ]),
    area('Bedrooms', true, [item('Supply & lay laminate flooring (8mm)', 260, 'SqFt', 5.5, 8.5)]),
    area('Wet Areas', true, [item('Supply & lay non-slip tiles (kitchen + bathrooms)', 180, 'SqFt', 7, 10.5)]),
  ])
}

function falseCeilingSection() {
  return section('False Ceiling & Cornice', 'False ceiling and cove lighting for living and bedroom areas.', true, [
    area('Living Room', true, [
      item('L-box false ceiling with cove light', 45, 'Ft', 18, 28),
      item('Full false ceiling above dining', 60, 'SqFt', 9, 14),
    ]),
    area('Bedrooms', false, [item('L-box false ceiling', 30, 'Ft', 18, 28, { inc: false })]),
  ])
}

function carpentrySection() {
  return section('Carpentry', 'Custom-built kitchen cabinets, wardrobes, and TV feature wall.', true, [
    area('Kitchen Cabinets', true, [
      item('Base kitchen cabinet (laminate finish)', 10, 'Ft', 320, 460),
      item('Wall-hung kitchen cabinet', 8, 'Ft', 260, 380),
      item('Quartz countertop', 10, 'Ft', 90, 140),
    ]),
    area('Wardrobes', true, [
      item('Master bedroom wardrobe (floor to ceiling)', 8, 'Ft', 340, 490),
      item('Common bedroom wardrobe', 6, 'Ft', 320, 460),
    ]),
    area('TV Feature Wall', true, [item('TV console + feature wall panelling', 12, 'Ft', 250, 380)]),
  ])
}

function paintingSection() {
  return section('Painting', 'Wall skim coat and repainting for the whole unit.', true, [
    area('Whole Unit', true, [
      item('Wall skim coat + repaint (2 coats, ceiling + walls)', 1, 'Lot', 1200, 1800),
    ]),
  ])
}

export function buildDemoQuoteSections(): QuoteSectionDTO[] {
  return [
    hackingAndMasonrySection(),
    electricalSection(),
    plumbingSection(),
    flooringSection(),
    falseCeilingSection(),
    carpentrySection(),
    paintingSection(),
  ]
}

export interface DemoClientSeed {
  categoryName: string
  clientName: string
  email: string
  contactNumber: string
  revisions: { label: string; refNumber: string; date: string }[]
}

export const DEMO_CLIENTS: DemoClientSeed[] = [
  {
    categoryName: '4-Room',
    clientName: 'Wei Ling Tan',
    email: 'weiling.tan@example.com',
    contactNumber: '9123 4567',
    revisions: [
      { label: 'R0', refNumber: 'QT-2026-0114', date: '2026-06-02' },
      { label: 'R1', refNumber: 'QT-2026-0114-R1', date: '2026-06-18' },
    ],
  },
  {
    categoryName: '5-Room',
    clientName: 'Muhammad Hafiz Rahman',
    email: 'hafiz.rahman@example.com',
    contactNumber: '8876 2210',
    revisions: [
      { label: 'R0', refNumber: 'QT-2026-0129', date: '2026-06-10' },
      { label: 'R1', refNumber: 'QT-2026-0129-R1', date: '2026-06-25' },
    ],
  },
]

/**
 * Flattens a QuoteSectionDTO tree into per-table row arrays (with explicit
 * ids and the given quoteId as the foreign key) so the caller can insert
 * each level with a single `createMany` instead of one round trip per row —
 * the pooled Supabase connection makes hundreds of individual nested-create
 * round trips far too slow for a login-time reset.
 */
export function flattenQuoteSections(quoteId: string, sections: QuoteSectionDTO[]) {
  const sectionRows: {
    id: string
    quoteId: string
    name: string
    description: string
    complete: boolean
    position: number
  }[] = []
  const areaRows: { id: string; sectionId: string; name: string; included: boolean; position: number }[] = []
  const itemRows: {
    id: string
    areaId: string
    description: string
    qty: number
    unit: string
    cost: number
    selling: number
    foc: boolean
    inc: boolean
    position: number
  }[] = []

  sections.forEach((sectionDto, sectionIndex) => {
    const sectionId = randomUUID()
    sectionRows.push({
      id: sectionId,
      quoteId,
      name: sectionDto.name,
      description: sectionDto.description,
      complete: sectionDto.complete,
      position: sectionIndex,
    })

    sectionDto.areas.forEach((areaDto, areaIndex) => {
      const areaId = randomUUID()
      areaRows.push({
        id: areaId,
        sectionId,
        name: areaDto.name,
        included: areaDto.included,
        position: areaIndex,
      })

      areaDto.items.forEach((itemDto, itemIndex) => {
        itemRows.push({
          id: randomUUID(),
          areaId,
          description: itemDto.description,
          qty: itemDto.qty,
          unit: itemDto.unit,
          cost: itemDto.cost,
          selling: itemDto.selling,
          foc: itemDto.foc,
          inc: itemDto.inc,
          position: itemIndex,
        })
      })
    })
  })

  return { sectionRows, areaRows, itemRows }
}
