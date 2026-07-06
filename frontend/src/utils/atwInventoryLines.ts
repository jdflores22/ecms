import type { ContainerInventoryItem } from '../services/api'
import type { WithdrawalLineFormValue } from '../components/withdrawals/WithdrawalLineGrid'
import { formatContainerSizeLabel } from './containerSize'

export interface SizeOption {
  id: number
  label: string
}

export interface TypeOption {
  id: number
  code: string
  label: string
}

export function inventoryRowKey(item: ContainerInventoryItem) {
  if (item.scheduleId != null) return `schedule:${item.scheduleId}`
  if (item.manualEntryId != null) return `manual:${item.manualEntryId}`
  return `${item.source}:${item.referenceNo}:${item.containerNo}`
}

/** @deprecated Prefer inventoryRowKey for list keys; container-only identity for line matching. */
export function inventoryItemKey(item: ContainerInventoryItem) {
  return inventoryRowKey(item)
}

export function dedupeInventoryByContainer(items: ContainerInventoryItem[]): ContainerInventoryItem[] {
  const ranked = [...items].sort((a, b) => {
    const sourceRank = (item: ContainerInventoryItem) => (item.source === 'Workflow' ? 0 : 1)
    const bySource = sourceRank(a) - sourceRank(b)
    if (bySource !== 0) return bySource
    return b.dwellDays - a.dwellDays
  })

  const seen = new Set<string>()
  const unique: ContainerInventoryItem[] = []
  for (const item of ranked) {
    const key = normalizeContainerNo(item.containerNo)
    if (!key || seen.has(key)) continue
    seen.add(key)
    unique.push(item)
  }
  return unique
}

export function normalizeContainerNo(containerNo: string) {
  return containerNo.trim().toUpperCase()
}

export function resolveSizeId(sizeLabel: string, sizes: SizeOption[]): number | '' {
  const normalized = formatContainerSizeLabel(sizeLabel)
  const match = sizes.find(
    (s) => formatContainerSizeLabel(s.label) === normalized || s.label === sizeLabel,
  )
  return match?.id ?? ''
}

export function resolveTypeId(typeValue: string, types: TypeOption[]): number | '' {
  const upper = typeValue.trim().toUpperCase()
  const match =
    types.find((t) => t.code.toUpperCase() === upper) ??
    types.find((t) => t.label.toUpperCase() === upper)
  return match?.id ?? ''
}

export function inventoryItemToLine(
  item: ContainerInventoryItem,
  sizes: SizeOption[],
  types: TypeOption[],
): WithdrawalLineFormValue | null {
  const containerSizeId = resolveSizeId(item.containerSize, sizes)
  const containerTypeId = resolveTypeId(item.containerType, types)
  if (containerSizeId === '' || containerTypeId === '') return null
  return {
    containerNo: item.containerNo,
    containerSizeId,
    containerTypeId,
  }
}

export function mergeInventoryLines(
  existing: WithdrawalLineFormValue[],
  additions: WithdrawalLineFormValue[],
  max = 50,
): WithdrawalLineFormValue[] {
  const seen = new Set(existing.map((line) => normalizeContainerNo(line.containerNo)))
  const merged = [...existing]
  for (const line of additions) {
    const key = normalizeContainerNo(line.containerNo)
    if (!key || seen.has(key)) continue
    seen.add(key)
    merged.push(line)
    if (merged.length >= max) break
  }
  return merged
}
