import type { AtwIssueFormValues } from '../components/withdrawals/AtwIssueForm'

const STORAGE_KEY = 'ecms.evaluator.atw.new.draft'

export function emptyAtwIssueFormValues(
  atwNumber: string,
  today: string,
): AtwIssueFormValues {
  return {
    atwNumber,
    authorizedTruckerId: '',
    lines: [],
    currentDepotId: '',
    destination: '',
    issueDate: today,
    expirationDate: today,
    remarks: '',
  }
}

export function normalizeAtwIssueDraft(
  draft: AtwIssueFormValues | null,
  defaults: AtwIssueFormValues,
): AtwIssueFormValues {
  if (!draft) return defaults
  return {
    ...defaults,
    ...draft,
    atwNumber: defaults.atwNumber,
    destination: draft.destination ?? '',
    remarks: draft.remarks ?? '',
    authorizedTruckerId: draft.authorizedTruckerId ?? '',
    currentDepotId: draft.currentDepotId ?? '',
    lines: (draft.lines ?? []).map((line) => ({
      containerNo: line.containerNo ?? '',
      containerSizeId: line.containerSizeId ?? '',
      containerTypeId: line.containerTypeId ?? '',
    })),
  }
}

export function loadAtwIssueDraft(): AtwIssueFormValues | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AtwIssueFormValues
  } catch {
    return null
  }
}

export function saveAtwIssueDraft(values: AtwIssueFormValues): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(values))
  } catch {
    // ignore quota errors
  }
}

export function clearAtwIssueDraft(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}
