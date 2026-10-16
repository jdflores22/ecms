import type { ContainerInventoryItem } from '../services/api'

export type InventoryDetailScope = 'evaluator' | 'depot'

export function inventoryDetailBasePath(scope: InventoryDetailScope): string {
  return scope === 'depot' ? '/depot/container-inventory/detail' : '/evaluations/container-inventory/detail'
}

export function buildInventoryDetailSearchParams(
  item: ContainerInventoryItem,
  options?: { shippingLineId?: number },
): URLSearchParams {
  const params = new URLSearchParams()
  params.set('source', item.source)
  if (item.scheduleId != null) params.set('scheduleId', String(item.scheduleId))
  if (item.manualEntryId != null) params.set('manualEntryId', String(item.manualEntryId))
  if (item.source === 'Logicteck') {
    params.set('containerNo', item.containerNo)
    params.set('depotId', String(item.depotId))
    params.set('shippingLineId', String(item.shippingLineId))
  }
  const lineId = options?.shippingLineId ?? item.shippingLineId
  if (lineId && item.source !== 'Logicteck') {
    params.set('shippingLineId', String(lineId))
  }
  return params
}

export function inventoryDetailUrl(scope: InventoryDetailScope, item: ContainerInventoryItem, options?: { shippingLineId?: number }) {
  const base = inventoryDetailBasePath(scope)
  const qs = buildInventoryDetailSearchParams(item, options).toString()
  return qs ? `${base}?${qs}` : base
}

export function parseInventoryDetailQuery(searchParams: URLSearchParams) {
  return {
    source: searchParams.get('source') ?? '',
    scheduleId: searchParams.get('scheduleId') ? Number(searchParams.get('scheduleId')) : undefined,
    manualEntryId: searchParams.get('manualEntryId') ? Number(searchParams.get('manualEntryId')) : undefined,
    containerNo: searchParams.get('containerNo') ?? undefined,
    depotId: searchParams.get('depotId') ? Number(searchParams.get('depotId')) : undefined,
    shippingLineId: searchParams.get('shippingLineId') ? Number(searchParams.get('shippingLineId')) : undefined,
  }
}
