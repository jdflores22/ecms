import type { ContainerInventoryItem } from '../services/api'
import { getAllocationSizeLabel, getCapacityGroupKey, normalizeSizeKey } from './cyAllocation'
import { todayIsoDate } from './datetime'

/** ECMS container type codes from master data (GP, HC, RF, OT). */
export const ECMS_INVENTORY_TYPE_CODES = ['GP', 'HC', 'RF', 'OT'] as const

export type EcmsInventoryTypeCode = (typeof ECMS_INVENTORY_TYPE_CODES)[number]

export interface InventorySummaryRow {
  depotId: number
  depotName: string
  size20Count: number
  size40Count: number
  typeCounts: Record<EcmsInventoryTypeCode, number>
  preAdvisedCount: number
  manualCount: number
  bookingCount: number
  overstayCount: number
  yardInToday: number
  teus: number
  units: number
}

function teuForContainer(size: string): number {
  const feet = Number.parseInt(normalizeSizeKey(size), 10)
  return !Number.isNaN(feet) && feet <= 20 ? 1 : 2
}

function normalizeTypeCode(typeCode: string): EcmsInventoryTypeCode | null {
  const code = typeCode.trim().toUpperCase()
  return ECMS_INVENTORY_TYPE_CODES.includes(code as EcmsInventoryTypeCode)
    ? (code as EcmsInventoryTypeCode)
    : null
}

function emptyTypeCounts(): Record<EcmsInventoryTypeCode, number> {
  return ECMS_INVENTORY_TYPE_CODES.reduce(
    (acc, code) => {
      acc[code] = 0
      return acc
    },
    {} as Record<EcmsInventoryTypeCode, number>,
  )
}

export function buildInventorySummaryRows(items: ContainerInventoryItem[]): InventorySummaryRow[] {
  const today = todayIsoDate()
  const grouped = new Map<number, InventorySummaryRow>()

  for (const item of items) {
    let row = grouped.get(item.depotId)
    if (!row) {
      row = {
        depotId: item.depotId,
        depotName: item.depotName,
        size20Count: 0,
        size40Count: 0,
        typeCounts: emptyTypeCounts(),
        preAdvisedCount: 0,
        manualCount: 0,
        bookingCount: 0,
        overstayCount: 0,
        yardInToday: 0,
        teus: 0,
        units: 0,
      }
      grouped.set(item.depotId, row)
    }

    const sizeGroup = getCapacityGroupKey(item.containerSize)
    if (sizeGroup === '20') row.size20Count += 1
    if (sizeGroup === '40') row.size40Count += 1

    const typeCode = normalizeTypeCode(item.containerType)
    if (typeCode) row.typeCounts[typeCode] += 1

    if (item.source === 'Workflow') row.preAdvisedCount += 1
    else row.manualCount += 1

    if (item.complianceStatus === 'Overstay') row.overstayCount += 1
    if (item.yardInDate === today) row.yardInToday += 1

    row.units += 1
    row.teus += teuForContainer(item.containerSize)
  }

  return [...grouped.values()].sort((a, b) => a.depotName.localeCompare(b.depotName))
}

export function sumInventorySummaryRows(rows: InventorySummaryRow[]): InventorySummaryRow {
  const totals: InventorySummaryRow = {
    depotId: 0,
    depotName: 'TOTAL',
    size20Count: 0,
    size40Count: 0,
    typeCounts: emptyTypeCounts(),
    preAdvisedCount: 0,
    manualCount: 0,
    bookingCount: 0,
    overstayCount: 0,
    yardInToday: 0,
    teus: 0,
    units: 0,
  }

  for (const row of rows) {
    totals.size20Count += row.size20Count
    totals.size40Count += row.size40Count
    for (const code of ECMS_INVENTORY_TYPE_CODES) {
      totals.typeCounts[code] += row.typeCounts[code]
    }
    totals.preAdvisedCount += row.preAdvisedCount
    totals.manualCount += row.manualCount
    totals.bookingCount += row.bookingCount
    totals.overstayCount += row.overstayCount
    totals.yardInToday += row.yardInToday
    totals.teus += row.teus
    totals.units += row.units
  }

  return totals
}

export function formatSummaryCount(value: number): string {
  return value > 0 ? String(value) : '-'
}

export function formatInventorySizeLabel(size: string): string {
  const group = getCapacityGroupKey(size)
  if (group === '20' || group === '40') return getAllocationSizeLabel(group)
  return size.trim()
}

export const INVENTORY_SOURCE_LABELS = {
  Workflow: 'Pre-advice',
  Manual: 'Manual',
} as const
