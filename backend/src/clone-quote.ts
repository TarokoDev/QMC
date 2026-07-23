import type { QuoteSectionDTO } from './types.js'

/** Builds the nested Prisma `create` input for a quote's sections/areas/items from a QuoteDTO shape. */
export function buildSectionsCreateInput(sections: QuoteSectionDTO[]) {
  return sections.map((section, sectionIndex) => ({
    name: section.name,
    description: section.description,
    complete: section.complete,
    position: sectionIndex,
    areas: {
      create: section.areas.map((area, areaIndex) => ({
        name: area.name,
        included: area.included,
        position: areaIndex,
        items: {
          create: area.items.map((item, itemIndex) => ({
            description: item.description,
            qty: item.qty,
            unit: item.unit,
            cost: item.cost,
            selling: item.selling,
            foc: item.foc,
            inc: item.inc,
            position: itemIndex,
          })),
        },
      })),
    },
  }))
}
