import type { CyAllocationBreakdownRow } from '../services/api'
import { formatContainerSizeLabel } from './containerSize'

/** Match backend TeuCalculator.NormalizeLabel */
export function normalizeSizeKey(size: string): string {
  return size.trim().replace(/['ftFT]+$/u, '')
}

/** Count split shown on CY capacity panels (pre-advised = ECMS; booking = LOGICTECK). */
export function formatCyCountSplit(preAdvisedCount: number, bookingCount: number): string {
  return `${preAdvisedCount} pre-advised · ${bookingCount} booking`
}

/** Utilization percentage; may exceed 100 when over contract limit. */
export function cyUtilizationPctUncapped(used: number, limit: number): number {
  if (limit <= 0) return used > 0 ? 100 : 0
  return Math.round((used / limit) * 10) / 10
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

/** Utilization is based on pre-advised TEU only until LOGICTECK bookings affect capacity. */
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
  availableCount: number
  preAdvisedCount: number
  bookingCount: number
}): string {
  const sizeParts = row.breakdown
    .filter((r) => r.contractCount > 0)
    .map((r) => `${getCapacityDisplayLabel(r.sizeLabel)}: ${r.availableCount}/${r.contractCount}`)
  const sizes = sizeParts.length > 0 ? sizeParts.join(' · ') : `${row.availableCount} available`
  return `${sizes} (${formatCyCountSplit(row.preAdvisedCount, row.bookingCount)})`
}
