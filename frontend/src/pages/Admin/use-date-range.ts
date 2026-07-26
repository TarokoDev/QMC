import { format, subDays } from 'date-fns'
import { useMemo, useState } from 'react'

/**
 * The single date range driving both the metric tiles and the event log, so the
 * two can never disagree about which window they describe.
 *
 * Inputs are `<input type="date">` day strings; `to` is widened to the end of
 * that day before it goes to the API, otherwise picking today would exclude
 * everything that happened today.
 */
export function useDateRange(days = 30) {
  const [from, setFrom] = useState(() => format(subDays(new Date(), days), 'yyyy-MM-dd'))
  const [to, setTo] = useState(() => format(new Date(), 'yyyy-MM-dd'))

  const range = useMemo(
    () => ({
      from: new Date(`${from}T00:00:00`).toISOString(),
      to: new Date(`${to}T23:59:59.999`).toISOString(),
    }),
    [from, to],
  )

  const invalid = from > to

  return { from, to, setFrom, setTo, range, invalid }
}
