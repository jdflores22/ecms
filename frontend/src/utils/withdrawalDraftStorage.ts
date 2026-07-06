import type { WithdrawalFormValues } from '../components/withdrawals/WithdrawalForm'

const STORAGE_KEY = 'ecms.withdrawal.new.draft'

function emptyLine(): WithdrawalFormValues['lines'][number] {
  return { containerNo: '', containerSizeId: '', containerTypeId: '' }
}

export function emptyWithdrawalFormValues(today: string, expiration: string): WithdrawalFormValues {
  return {
    atwNumber: '',
    shippingLineId: '',
    lines: [emptyLine()],
    currentDepotId: '',
    destination: '',
    issueDate: today,
    expirationDate: expiration,
    remarks: '',
  }
}

/** Merge a stored draft with defaults so optional fields are never undefined. */
export function normalizeWithdrawalDraft(
  draft: WithdrawalFormValues | null,
  defaults: WithdrawalFormValues,
  options?: { clearDepot?: boolean },
): WithdrawalFormValues {
  if (!draft) return defaults
  return {
    ...defaults,
    ...draft,
    atwNumber: draft.atwNumber ?? '',
    destination: draft.destination ?? '',
    remarks: draft.remarks ?? '',
    currentDepotId: options?.clearDepot ? '' : (draft.currentDepotId ?? defaults.currentDepotId),
    lines:
      draft.lines?.length > 0
        ? draft.lines.map((line) => ({
            containerNo: line.containerNo ?? '',
            containerSizeId: line.containerSizeId ?? '',
            containerTypeId: line.containerTypeId ?? '',
          }))
        : defaults.lines,
  }
}

export function loadWithdrawalDraft(): WithdrawalFormValues | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as WithdrawalFormValues
  } catch {
    return null
  }
}

export function saveWithdrawalDraft(values: WithdrawalFormValues): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values))
  } catch {
    // ignore quota errors
  }
}

export function clearWithdrawalDraft(): void {
  localStorage.removeItem(STORAGE_KEY)
}
