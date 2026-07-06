import type { CyAllocationBreakdownRow } from '../services/api'
import { formatContainerSizeLabel } from './containerSize'

/** Match backend TeuCalculator.NormalizeLabel */
export function normalizeSizeKey(size: string): string {
  return size.trim().replace(/['ftFT]+$/u, '')
}

/** Count split shown on CY capacity panels (pre-forecasted = ECMS; booking = LOGICTECK). */
export function formatCyCountSplit(preAdvisedCount: number, bookingCount: number): string {
  return `${preAdvisedCount} pre-forecasted · ${bookingCount} booking`
}

/** TEU split for CY capacity panels. */
export function formatCyTeuSplit(preAdvisedTeu: number, bookingTeu: number): string {
  return `${Math.round(preAdvisedTeu)} TEU pre-forecasted · ${Math.round(bookingTeu)} TEU booking`
}

type BreakdownTeuRow = Pick<CyAllocationBreakdownRow, 'preAdvisedCount' | 'contractCount' | 'bookingCount' | 'availableCount' | 'teuPerContainer'>

export function breakdownUsedTeu(row: BreakdownTeuRow | null | undefined): number {
  if (!row) return 0
  return Math.round(row.preAdvisedCount * row.teuPerContainer)
}

export function breakdownContractTeu(row: BreakdownTeuRow | null | undefined): number {
  if (!row) return 0
  return Math.round(row.contractCount * row.teuPerContainer)
}

export function breakdownBookingTeu(row: BreakdownTeuRow | null | undefined): number {
  if (!row) return 0
  return Math.round(row.bookingCount * row.teuPerContainer)
}

export function breakdownAvailableTeu(row: BreakdownTeuRow | null | undefined): number {
  if (!row) return 0
  return Math.round(row.availableCount * row.teuPerContainer)
}

/** Utilization percentage (0–100+); may exceed 100 when over contract limit. */
export function cyUtilizationPctUncapped(used: number, limit: number): number {
  if (limit <= 0) return used > 0 ? 100 : 0
  return Math.round((used / limit) * 1000) / 10
}

/** Utilization percentage capped at 100 for display (1–100% scale). */
export function cyUtilizationPctCapped(used: number, limit: number): number {
  return Math.min(100, cyUtilizationPctUncapped(used, limit))
}

export function formatUtilizationPctLabel(used: number, limit: number): string {
  const capped = cyUtilizationPctCapped(used, limit)
  const display = Number.isInteger(capped) ? `${capped}` : capped.toFixed(1)
  if (limit > 0 && used > limit) return `${display}% · over limit`
  return `${display}%`
}

/** Same format as Admin → Master Data CY contract chips. */
export function formatMasterDataContractLine(
  groupKey: '20' | '40',
  row: CyAllocationBreakdownRow | undefined,
): string | null {
  if (!row || row.contractCount <= 0) return null
  const sizeLabel = groupKey === '20' ? '20ft' : '40ft'
  return `${sizeLabel}: ${row.contractCount} slots · ${breakdownContractTeu(row)} TEU`
}

export function getGroupBreakdownRow(
  allocation: { breakdown: CyAllocationBreakdownRow[] },
  groupKey: '20' | '40',
): CyAllocationBreakdownRow | undefined {
  return allocation.breakdown.find((r) => getCapacityGroupKey(r.sizeLabel) === groupKey)
}

export function aggregatePreAdvisedBySize(items: { breakdown: CyAllocationBreakdownRow[] }[]): {
  total: number
  size20: number
  size40: number
} {
  let size20 = 0
  let size40 = 0
  for (const item of items) {
    size20 += getGroupBreakdownRow(item, '20')?.preAdvisedCount ?? 0
    size40 += getGroupBreakdownRow(item, '40')?.preAdvisedCount ?? 0
  }
  return { total: size20 + size40, size20, size40 }
}

/** Pre-advised TEU totals by size group across yards. */
export function aggregatePreAdvisedTeuBySize(items: { breakdown: CyAllocationBreakdownRow[] }[]): {
  total: number
  teu20: number
  teu40: number
} {
  let teu20 = 0
  let teu40 = 0
  for (const item of items) {
    teu20 += breakdownUsedTeu(getGroupBreakdownRow(item, '20'))
    teu40 += breakdownUsedTeu(getGroupBreakdownRow(item, '40'))
  }
  return { total: teu20 + teu40, teu20, teu40 }
}

export function progressBarColor(pct: number): string {
  if (pct >= 100) return '#D32F2F'
  if (pct >= 85) return '#ED6C02'
  return '#2E7D32'
}

export function depotMonogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'CY'
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase()
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

/** Utilization by container slot count (matches CY contract master data). */
export function cyUtilizationPctByCount(preAdvisedCount: number, contractCount: number): number {
  if (contractCount <= 0) return 0
  return Math.min(100, Math.round((preAdvisedCount / contractCount) * 100))
}

/** Utilization is based on pre-forecasted TEU only until LOGICTECK bookings affect capacity. */
export function cyUtilizationPct(preAdvisedTeu: number, contractTeu: number): number {
  if (contractTeu <= 0) return 0
  return Math.min(100, Math.round((preAdvisedTeu / contractTeu) * 100))
}

/** 45' shares the same CY contract pool as 40'. */
const SECONDARY_TO_PRIMARY: Record<string, string> = { '45': '40' }

export function getCapacityGroupKey(size: string): string {
  const trimmed = size.trim().toLowerCase()
  if (trimmed.startsWith('40') || trimmed.includes('45')) return '40'
  if (trimmed.startsWith('20')) return '20'
  const key = normalizeSizeKey(size)
  return SECONDARY_TO_PRIMARY[key] ?? key
}

export function isSecondaryCapacitySize(size: string): boolean {
  const key = normalizeSizeKey(size)
  return SECONDARY_TO_PRIMARY[key] !== undefined
}

export function getCapacityDisplayLabel(sizeOrGroupKey: string): string {
  const groupKey = getCapacityGroupKey(sizeOrGroupKey)
  if (groupKey === '40') return '40 / 45'
  return formatContainerSizeLabel(groupKey)
}

/** CY allocation card labels — always 20ft / 40ft like the yard allocation UI. */
export function getAllocationSizeLabel(groupKey: '20' | '40'): string {
  return groupKey === '20' ? '20ft' : '40ft'
}

export function getAllocationReturnsLabel(groupKey: '20' | '40'): string {
  return `${getAllocationSizeLabel(groupKey)} Returns`
}

export function getAllocationHoldLabel(groupKey: '20' | '40'): string {
  return `Hold ${getAllocationReturnsLabel(groupKey)}`
}

export interface CySizeMetrics {
  sizeLabel: string
  teuPerContainer: number
  preAdvisedCount: number
  bookingCount: number
  availableSlots: number
  contractSlots: number
}

export function getSizeMetrics(
  allocation: {
    breakdown: CyAllocationBreakdownRow[]
  },
  containerSize: string,
): CySizeMetrics {
  const groupKey = getCapacityGroupKey(containerSize)
  const row = allocation.breakdown.find(
    (r) => getCapacityGroupKey(r.sizeLabel) === groupKey,
  )
  const teuPerContainer =
    row?.teuPerContainer ?? (Number.parseInt(groupKey, 10) <= 20 && groupKey.length <= 2 ? 1 : 2)

  return {
    sizeLabel: getCapacityDisplayLabel(groupKey),
    teuPerContainer,
    preAdvisedCount: row?.preAdvisedCount ?? 0,
    bookingCount: row?.bookingCount ?? 0,
    availableSlots: row?.availableCount ?? 0,
    contractSlots: row?.contractCount ?? 0,
  }
}

export function formatCySizeOptionLabel(
  depotName: string,
  allocation: Parameters<typeof getSizeMetrics>[0],
  containerSize: string,
  hasCapacity: boolean,
): string {
  const metrics = getSizeMetrics(allocation, containerSize)
  const capacityNote = !hasCapacity ? ' — insufficient space' : ''
  return `${depotName} — ${metrics.availableSlots} available for ${metrics.sizeLabel} (${formatCyCountSplit(metrics.preAdvisedCount, metrics.bookingCount)})${capacityNote}`
}

export function formatDepotCapacitySummary(row: {
  breakdown: CyAllocationBreakdownRow[]
  availableTeu?: number
  preAdvisedTeu?: number
  bookingTeu?: number
}): string {
  const sizeParts = row.breakdown
    .filter((r) => r.contractCount > 0)
    .map(
      (r) =>
        `${getCapacityDisplayLabel(r.sizeLabel)}: ${breakdownAvailableTeu(r)}/${breakdownContractTeu(r)} TEU`,
    )
  const sizes = sizeParts.length > 0 ? sizeParts.join(' · ') : `${Math.round(row.availableTeu ?? 0)} TEU available`
  const teuSplit = formatCyTeuSplit(row.preAdvisedTeu ?? 0, row.bookingTeu ?? 0)
  return `${sizes} (${teuSplit})`
}

export function countWithdrawalLinesBySizeGroup(lines: { containerSize: string }[]): Record<'20' | '40', number> {
  const counts: Record<'20' | '40', number> = { '20': 0, '40': 0 }
  for (const line of lines) {
    const key = getCapacityGroupKey(line.containerSize)
    if (key === '20' || key === '40') counts[key] += 1
  }
  return counts
}

export function depotHasCapacityForWithdrawal(
  allocation: { depotName: string; breakdown: CyAllocationBreakdownRow[] },
  lines: { containerSize: string }[],
): { ok: boolean; reason?: string } {
  const needed = countWithdrawalLinesBySizeGroup(lines)
  for (const group of ['20', '40'] as const) {
    if (needed[group] === 0) continue
    const row = getGroupBreakdownRow(allocation, group)
    const available = row?.availableCount ?? 0
    if (available < needed[group]) {
      return {
        ok: false,
        reason: `Need ${needed[group]} ${getCapacityDisplayLabel(group)} slot(s); only ${available} available at ${allocation.depotName}.`,
      }
    }
  }
  return { ok: true }
}

export function formatWithdrawalDepotOptionLabel(
  allocation: {
    depotName: string
    breakdown: CyAllocationBreakdownRow[]
    availableTeu: number
    preAdvisedTeu: number
    bookingTeu: number
    contractTeu: number
  },
  lines: { containerSize: string }[],
): string {
  const capacity = depotHasCapacityForWithdrawal(allocation, lines)
  const summary = formatDepotCapacitySummary(allocation)
  const teuNote = `${Math.round(allocation.preAdvisedTeu)} / ${allocation.contractTeu} TEU`
  return `${allocation.depotName} — ${summary} · ${teuNote}${capacity.ok ? '' : ' — insufficient for this batch'}`
}
