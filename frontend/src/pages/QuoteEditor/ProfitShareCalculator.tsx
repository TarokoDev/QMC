import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { formatMoney } from '@/lib/quote-calculations'

interface Share {
  id: string
  name: string
  percent: number
}

interface Props {
  /** Total profit the shares are taken from. */
  profit: number
  currencySymbol: string
  /** Used to keep shares separate per quote in localStorage. */
  storageKey: string
}

const DEFAULT_SHARES: Share[] = [{ id: 'client', name: 'Client', percent: 50 }]

function newId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function loadShares(storageKey: string): Share[] {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return DEFAULT_SHARES
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return DEFAULT_SHARES
    const shares = parsed
      .filter((share): share is Share => typeof share === 'object' && share !== null)
      .map((share) => ({
        id: typeof share.id === 'string' ? share.id : newId(),
        name: typeof share.name === 'string' ? share.name : '',
        percent: Number.isFinite(share.percent) ? share.percent : 0,
      }))
    return shares.length === 0 ? DEFAULT_SHARES : shares
  } catch {
    return DEFAULT_SHARES
  }
}

/**
 * Front-end only profit split: nothing here is saved to the quote, it is a
 * scratchpad for seeing who takes what out of the profit.
 */
export function ProfitShareCalculator({ profit, currencySymbol, storageKey }: Props) {
  const key = `profit-shares:${storageKey}`
  const [shares, setShares] = useState<Share[]>(() => loadShares(key))

  useEffect(() => {
    setShares(loadShares(key))
  }, [key])

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(shares))
    } catch {
      // storage full or blocked - the split just will not be remembered
    }
  }, [key, shares])

  const allocated = shares.reduce((sum, share) => sum + share.percent, 0)
  const takeHome = 100 - allocated
  const money = (value: number) => formatMoney(value, currencySymbol)
  const share = (percent: number) => (profit * percent) / 100

  return (
    <div className="rounded-lg border px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium">Profit Share</p>
        <button
          type="button"
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
          onClick={() => setShares((current) => [...current, { id: newId(), name: '', percent: 0 }])}
        >
          <Plus className="size-3.5" />
          Add company
        </button>
      </div>

      <table className="w-full text-sm">
        <tbody>
          {shares.map((item) => (
            <tr key={item.id}>
              <td className="py-1 pr-2">
                <Input
                  value={item.name}
                  placeholder="Company"
                  onChange={(e) =>
                    setShares((current) =>
                      current.map((s) => (s.id === item.id ? { ...s, name: e.target.value } : s)),
                    )
                  }
                />
              </td>
              <td className="w-24 py-1 pr-2">
                <Input
                  type="number"
                  value={item.percent}
                  onChange={(e) =>
                    setShares((current) =>
                      current.map((s) =>
                        s.id === item.id ? { ...s, percent: Number(e.target.value) } : s,
                      ),
                    )
                  }
                />
              </td>
              <td className="w-0 py-1 pr-2 text-right font-medium tabular-nums whitespace-nowrap">
                {money(share(item.percent))}
              </td>
              <td className="w-0 py-1">
                <button
                  type="button"
                  aria-label={`Remove ${item.name || 'share'}`}
                  disabled={shares.length === 1}
                  title={shares.length === 1 ? 'Keep at least one row' : undefined}
                  className="rounded p-1 text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                  onClick={() =>
                    setShares((current) =>
                      current.length === 1 ? current : current.filter((s) => s.id !== item.id),
                    )
                  }
                >
                  <Trash2 className="size-4" />
                </button>
              </td>
            </tr>
          ))}
          <tr className="border-t">
            <td className="py-1.5 font-medium">Take home</td>
            <td className="py-1.5 pr-2 text-right tabular-nums">{takeHome.toFixed(2)}%</td>
            <td className="py-1.5 pr-2 text-right font-semibold tabular-nums whitespace-nowrap">
              {money(share(takeHome))}
            </td>
            <td />
          </tr>
        </tbody>
      </table>

      {allocated > 100 ? (
        <p className="mt-2 text-xs text-destructive">
          Shares add up to {allocated.toFixed(2)}% - more than the profit available.
        </p>
      ) : null}
    </div>
  )
}
