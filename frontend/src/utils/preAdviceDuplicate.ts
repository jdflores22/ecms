export interface PreAdviceDuplicateInfo {
  referenceNo?: string | null
  status?: string | null
  truckerName?: string | null
}

export function formatPreAdviceDuplicateWarning(duplicate: PreAdviceDuplicateInfo): string {
  const ref = duplicate.referenceNo ?? '—'
  const status = duplicate.status ?? '—'
  const trucker = duplicate.truckerName?.trim()
  const truckerPart = trucker ? ` · submitted by ${trucker}` : ''
  return `A pre-forecast for this container already exists (${ref} · ${status}${truckerPart}).`
}
