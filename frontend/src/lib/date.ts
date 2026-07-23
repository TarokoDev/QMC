const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Formats a Date as "Fri Jul 24 2026". */
export function formatDateDisplay(date: Date): string {
  return `${WEEKDAYS[date.getDay()]} ${MONTHS[date.getMonth()]} ${date.getDate()} ${date.getFullYear()}`
}

/** Today's date in Singapore local time, formatted like "Fri Jul 24 2026". */
export function todaySGDateString(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date())
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return formatDateDisplay(new Date(get('year'), get('month') - 1, get('day')))
}

/** Formats an ISO timestamp in Singapore local time, e.g. "Fri Jul 24 1:25AM". */
export function formatSGDateTime(isoDate: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Singapore',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(new Date(isoDate))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('weekday')} ${get('month')} ${get('day')} ${get('hour')}:${get('minute')}${get('dayPeriod').toUpperCase()}`
}
