import axios from 'axios'
import { store } from '../store'
import { logout, setCredentials } from '../store/slices/authSlice'
import { resolveAssetUrl } from '../utils/assetUrl'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshPromise: Promise<string | null> | null = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true
      const refreshToken = store.getState().auth.refreshToken
      if (refreshToken) {
        try {
          refreshPromise ??= axios
            .post<LoginResponse>(
              `${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/refresh`,
              { refreshToken },
              { withCredentials: true },
            )
            .then(({ data }) => {
              store.dispatch(
                setCredentials({
                  accessToken: data.accessToken,
                  refreshToken: data.refreshToken,
                  user: data.user,
                }),
              )
              return data.accessToken
            })
            .finally(() => {
              refreshPromise = null
            })

          const accessToken = await refreshPromise
          if (accessToken) {
            originalRequest.headers = originalRequest.headers ?? {}
            originalRequest.headers.Authorization = `Bearer ${accessToken}`
            return api(originalRequest)
          }
        } catch {
          store.dispatch(logout())
        }
      } else {
        store.dispatch(logout())
      }
    }
    return Promise.reject(error)
  },
)

export default api

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  expiresAt: string
  user: {
    id: number
    username: string
    email: string
    fullName: string
    role: string
    shippingLineId?: number | null
    depotId?: number | null
    profilePhoto?: string | null
    allowedPages?: string[]
  }
}

export const authApi = {
  login: (username: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { username, password }),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
  register: (data: {
    username: string
    email: string
    password: string
    fullName: string
    role: string
    shippingLineId?: number | null
    depotId?: number | null
  }) => api.post<LoginResponse>('/auth/register', data),
  signUp: (data: {
    username: string
    email: string
    password: string
    fullName: string
    role: 'Trucker'
  }) => api.post<LoginResponse>('/auth/signup', data),
  forgotPassword: (emailOrUsername: string) =>
    api.post<{ message: string; resetToken?: string | null }>('/auth/forgot-password', {
      emailOrUsername,
    }),
  resetPassword: (token: string, newPassword: string) =>
    api.post<{ message: string }>('/auth/reset-password', { token, newPassword }),
  refresh: (refreshToken: string) =>
    api.post<LoginResponse>('/auth/refresh', { refreshToken }),
}

export interface Profile {
  id: number
  username: string
  email: string
  fullName: string
  role: string
  status: string
  shippingLineId?: number | null
  shippingLineName?: string | null
  depotId?: number | null
  depotName?: string | null
  profilePhoto?: string | null
  createdAt: string
}

export const profileApi = {
  get: () => api.get<Profile>('/profile'),
  update: (data: { email: string; fullName: string }) => api.put<Profile>('/profile', data),
  uploadPhoto: (photo: File) => {
    const form = new FormData()
    form.append('photo', photo)
    return api.post<Profile>('/profile/photo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  removePhoto: () => api.delete<Profile>('/profile/photo'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ message: string }>('/profile/change-password', { currentPassword, newPassword }),
}

export const dashboardApi = {
  get: (role: string) => {
    const map: Record<string, string> = {
      ShippingLineEvaluator: '/dashboard/shipping-line',
      DepotPersonnel: '/dashboard/depot',
      Trucker: '/dashboard/trucker',
      Administrator: '/dashboard/admin',
    }
    const path = map[role]
    if (!path) {
      return Promise.reject(new Error(`No dashboard configured for role: ${role}`))
    }
    return api.get(path)
  },
}

export const preAdviceApi = {
  list: () => api.get<PreAdvice[]>('/preforecast'),
  get: (id: number) => api.get<PreAdvice>(`/preforecast/${id}`),
  lookups: () => api.get<PreAdviceLookups>('/preforecast/lookups'),
  checkDuplicate: (params: {
    containerNo: string
    containerSizeId: number
    containerTypeId: number
    excludePreAdviceId?: number
  }) =>
    api.get<{
      isDuplicate: boolean
      referenceNo?: string | null
      status?: string | null
      truckerName?: string | null
    }>('/preforecast/check-duplicate', { params }),
  create: (data: {
    shippingLineId: number
    containerNo: string
    containerSizeId: number
    containerTypeId: number
    remarks?: string
  }) => api.post<PreAdvice>('/preforecast', data),
  update: (
    id: number,
    data: {
      shippingLineId: number
      containerNo: string
      containerSizeId: number
      containerTypeId: number
      remarks?: string
    },
  ) => api.put<PreAdvice>(`/preforecast/${id}`, data),
  delete: (id: number) => api.delete(`/preforecast/${id}`),
  submit: (id: number) => api.post<PreAdvice>(`/preforecast/${id}/submit`),
  cancel: (id: number, reason?: string) =>
    api.post<PreAdvice>(`/preforecast/${id}/cancel`, reason ? { reason } : {}),
  documents: (id: number) => api.get<PreAdviceDocument[]>(`/preforecast/${id}/documents`),
  uploadDocument: (id: number, file: File, category: string, comment?: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('category', category)
    if (comment) form.append('comment', comment)
    return api.post<PreAdviceDocument>(`/preforecast/${id}/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  deleteDocument: (preAdviceId: number, documentId: number) =>
    api.delete(`/preforecast/${preAdviceId}/documents/${documentId}`),
}

export interface WithdrawalLookups {
  shippingLines: { id: number; name: string; code: string }[]
  containerSizes: { id: number; label: string }[]
  containerTypes: { id: number; code: string; label: string }[]
  depots: { id: number; name: string }[]
}

export interface WithdrawalLine {
  id: number
  lineNo: number
  containerId: number
  containerNo: string
  containerSizeId: number
  containerSize: string
  containerTypeId: number
  containerType: string
  lineStatus: string
}

export interface Withdrawal {
  id: number
  referenceNo: string
  atwNumber: string
  truckerId: number
  truckerName: string
  shippingLineId: number
  shippingLineName: string
  currentDepotId: number
  currentDepotName: string
  destination: string
  issueDate: string
  expirationDate: string
  purpose: string
  status: string
  remarks?: string | null
  createdAt: string
  submittedAt?: string | null
  hasAtwDocument: boolean
  reviewRemarks?: string | null
  containerCount: number
  containerSummary: string
  lines: WithdrawalLine[]
}

export interface EvaluatorAtwLookups {
  shippingLine: { id: number; name: string; code: string }
  nextAtwNumber: string
  truckers: { id: number; name: string; username: string }[]
  containerSizes: { id: number; label: string }[]
  containerTypes: { id: number; code: string; label: string }[]
  depots: { id: number; name: string }[]
}

export interface WithdrawalDocument {
  id: number
  withdrawalRequestId: number
  documentType: string
  fileName: string
  filePath: string
  contentType: string
  fileSize: number
  createdAt: string
}

export const withdrawalApi = {
  list: () => api.get<Withdrawal[]>('/withdrawals'),
  get: (id: number) => api.get<Withdrawal>(`/withdrawals/${id}`),
  lookups: () => api.get<WithdrawalLookups>('/withdrawals/lookups'),
  checkDuplicate: (params: {
    currentDepotId: number
    containerNo: string
    containerSizeId: number
    containerTypeId: number
    excludeWithdrawalId?: number
  }) =>
    api.get<{
      isDuplicate: boolean
      referenceNo?: string | null
      status?: string | null
      truckerName?: string | null
    }>('/withdrawals/check-duplicate', { params }),
  create: (data: {
    atwNumber: string
    shippingLineId: number
    lines: { containerNo: string; containerSizeId: number; containerTypeId: number }[]
    currentDepotId: number
    destination: string
    issueDate: string
    expirationDate: string
    remarks?: string
  }) => api.post<Withdrawal>('/withdrawals', data),
  update: (
    id: number,
    data: {
      atwNumber: string
      shippingLineId: number
      lines: { containerNo: string; containerSizeId: number; containerTypeId: number }[]
      currentDepotId: number
      destination: string
      issueDate: string
      expirationDate: string
      remarks?: string
    },
  ) => api.put<Withdrawal>(`/withdrawals/${id}`, data),
  submit: (id: number) => api.post<Withdrawal>(`/withdrawals/${id}/submit`),
  documents: (id: number) => api.get<WithdrawalDocument[]>(`/withdrawals/${id}/documents`),
  uploadDocument: (id: number, file: File, documentType = 'AtwCertificate') => {
    const form = new FormData()
    form.append('file', file)
    form.append('documentType', documentType)
    return api.post<WithdrawalDocument>(`/withdrawals/${id}/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  deleteDocument: (withdrawalId: number, documentId: number) =>
    api.delete(`/withdrawals/${withdrawalId}/documents/${documentId}`),
  pendingReviewCount: () => api.get<{ count: number }>('/withdrawals/pending-review/count'),
  pendingActionCount: () => api.get<{ count: number }>('/withdrawals/pending-action/count'),
  evaluatorLookups: () => api.get<EvaluatorAtwLookups>('/withdrawals/evaluator-lookups'),
  issue: (data: {
    atwNumber?: string | null
    authorizedTruckerId: number
    lines: { containerNo: string; containerSizeId: number; containerTypeId: number }[]
    currentDepotId: number
    destination: string
    issueDate: string
    expirationDate: string
    remarks?: string
  }) => api.post<Withdrawal>('/withdrawals/issue', data),
  approve: (id: number, remarks?: string) =>
    api.post<Withdrawal>(`/withdrawals/${id}/approve`, { remarks: remarks ?? null }),
  reject: (id: number, remarks: string) =>
    api.post<Withdrawal>(`/withdrawals/${id}/reject`, { remarks }),
  release: (id: number) => api.post<Withdrawal>(`/withdrawals/${id}/release`),
}

export interface PreAdviceDocument {
  id: number
  preAdviceId: number
  category?: string | null
  categoryLabel?: string | null
  comment?: string | null
  fileName: string
  filePath: string
  contentType: string
  fileSize: number
  uploadedByName: string
  createdAt: string
}

export interface PreAdviceLookups {
  shippingLines: { id: number; name: string; code: string }[]
  containerSizes: { id: number; label: string }[]
  containerTypes: { id: number; code: string; label: string }[]
}

export interface PreAdvice {
  id: number
  referenceNo: string
  truckerId: number
  truckerName: string
  shippingLineId: number
  shippingLineName: string
  containerId: number
  containerNo: string
  containerSize: string
  containerType: string
  status: string
  demurrageValidUntil?: string | null
  remarks?: string | null
  createdAt: string
  complianceRemarks?: string | null
  complianceRequestedAt?: string | null
  hasDamageReport: boolean
  hasQrBooking: boolean
  qrCode?: string | null
  qrBookingId?: number | null
  logicteckStatus?: string | null
}

export interface Evaluation {
  id: number
  preAdviceId: number
  referenceNo: string
  evaluatorId: number
  evaluatorName: string
  depotId?: number | null
  depotName?: string | null
  remarks?: string | null
  status: string
  evaluatedAt: string
}

export interface Depot {
  id: number
  name: string
  address: string
  capacity: number
  isActive: boolean
}

export const evaluationApi = {
  list: () => api.get<Evaluation[]>('/evaluations'),
  getByPreAdvice: async (preAdviceId: number): Promise<{ data: Evaluation | null }> => {
    try {
      const { data } = await api.get<Evaluation>(`/evaluations/by-preforecast/${preAdviceId}`)
      return { data }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        return { data: null }
      }
      throw err
    }
  },
  approve: (data: { preAdviceId: number; depotId: number; demurrageValidUntil: string; remarks?: string }) =>
    api.post<Evaluation>('/evaluations/approve', data),
  reject: (data: { preAdviceId: number; remarks: string }) =>
    api.post<Evaluation>('/evaluations/reject', data),
  returnForCompliance: (data: { preAdviceId: number; remarks: string }) =>
    api.post<Evaluation>('/evaluations/return-for-compliance', data),
}

export interface CyAllocationBreakdownCell {
  typeCode: string
  typeLabel: string
  preAdvisedCount: number
  preAdvisedTeu: number
  bookingCount: number
  bookingTeu: number
}

export interface CyAllocationBreakdownRow {
  sizeLabel: string
  teuPerContainer: number
  containerSizeId: number
  contractCount: number
  preAdvisedCount: number
  availableCount: number
  bookingCount: number
  cells: CyAllocationBreakdownCell[]
}

export interface CyAllocation {
  contractId: number
  depotId: number
  depotName: string
  depotAddress: string
  shippingLineId: number
  shippingLineCode: string
  shippingLineName: string
  contractTeu: number
  contractCount: number
  preAdvisedTeu: number
  bookingTeu: number
  availableTeu: number
  availableCount: number
  preAdvisedCount: number
  bookingCount: number
  hasCapacity: boolean
  breakdown: CyAllocationBreakdownRow[]
}

export interface CyAllocationForApproval {
  preAdviceId: number
  referenceNo: string
  containerNo: string
  containerSize: string
  allocations: CyAllocation[]
}

export const cyAllocationApi = {
  list: (shippingLineId?: number) =>
    api.get<CyAllocation[]>('/cy-allocations', {
      params: shippingLineId ? { shippingLineId } : undefined,
    }),
  forApproval: (preAdviceId: number) =>
    api.get<CyAllocationForApproval>(`/cy-allocations/for-approval/${preAdviceId}`),
  updateContract: (
    contractId: number,
    data: { sizes: { containerSizeId: number; contractCount: number }[]; isActive?: boolean },
  ) => api.put<CyAllocation>(`/cy-allocations/contracts/${contractId}`, { ...data, isActive: data.isActive ?? true }),
}

export type ContainerDwellCompliance = 'WithinLimit' | 'ApproachingLimit' | 'Overstay'

export type ContainerInventorySource = 'Workflow' | 'Manual'

export interface ContainerInventoryItem {
  scheduleId: number | null
  manualEntryId: number | null
  preAdviceId: number | null
  referenceNo: string
  source: ContainerInventorySource
  containerNo: string
  containerSize: string
  containerType: string
  shippingLineCode: string
  shippingLineName: string
  truckerName: string | null
  depotId: number
  depotName: string
  yardInDate: string
  gateInTime: string | null
  dwellDays: number
  daysRemaining: number
  complianceStatus: ContainerDwellCompliance
  scheduleStatus: string | null
  remarks: string | null
}

export interface ContainerInventoryDepotSummary {
  depotId: number
  depotName: string
  count: number
  overstayCount: number
}

export interface ContainerInventorySummary {
  totalAtYard: number
  withinLimitCount: number
  approachingLimitCount: number
  overstayCount: number
  dwellLimitDays: number
  warningThresholdDays: number
  size20Count: number
  size40Count: number
  usedTeu: number
  contractTeu: number
  byDepot: ContainerInventoryDepotSummary[]
}

export interface ContainerInventoryResponse {
  summary: ContainerInventorySummary
  items: ContainerInventoryItem[]
}

export const containerInventoryApi = {
  list: (params?: { depotId?: number; shippingLineId?: number; compliance?: ContainerDwellCompliance }) =>
    api.get<ContainerInventoryResponse>('/container-inventory', { params }),
  createManual: (data: {
    containerNo: string
    containerSizeId: number
    containerTypeId: number
    depotId: number
    yardInDate: string
    remarks?: string
    shippingLineId?: number
  }) => api.post('/container-inventory/manual', data),
  bulkCreateManual: (entries: {
    containerNo: string
    containerSizeId: number
    containerTypeId: number
    depotId: number
    yardInDate: string
    remarks?: string
    shippingLineId?: number
  }[]) => api.post<{ successCount: number; errors: { line: number; containerNo: string; message: string }[] }>(
    '/container-inventory/manual/bulk',
    { entries },
  ),
  deleteManual: (id: number) => api.delete(`/container-inventory/manual/${id}`),
}

export interface ShippingLineDepotContractSize {
  containerSizeId: number
  sizeLabel: string
  teuPerContainer: number
  contractCount: number
  preAdvisedCount: number
  availableCount: number
}

export interface ShippingLineDepotContract {
  id: number
  shippingLineId: number
  shippingLineName: string
  depotId: number
  depotName: string
  sizes: ShippingLineDepotContractSize[]
  isActive: boolean
}

export const shippingLineDepotContractApi = {
  list: () => api.get<ShippingLineDepotContract[]>('/shipping-line-depot-contracts'),
  create: (data: {
    shippingLineId: number
    depotId: number
    sizes: { containerSizeId: number; contractCount: number }[]
  }) => api.post<ShippingLineDepotContract>('/shipping-line-depot-contracts', data),
  update: (
    id: number,
    data: { sizes: { containerSizeId: number; contractCount: number }[]; isActive: boolean },
  ) => api.put<ShippingLineDepotContract>(`/shipping-line-depot-contracts/${id}`, data),
  deactivate: (id: number) => api.post(`/shipping-line-depot-contracts/${id}/deactivate`),
}

export const depotApi = {
  list: () => api.get<Depot[]>('/depots'),
  listAdmin: () => api.get<Depot[]>('/depots/admin'),
  create: (data: { name: string; address: string; capacity: number }) =>
    api.post<Depot>('/depots', data),
  update: (id: number, data: { name: string; address: string; capacity: number; isActive: boolean }) =>
    api.put<Depot>(`/depots/${id}`, data),
  deactivate: (id: number) => api.delete(`/depots/${id}`),
}

export interface ShippingLine {
  id: number
  name: string
  code: string
  isActive: boolean
}

export const shippingLineApi = {
  list: () => api.get<ShippingLine[]>('/shipping-lines'),
  create: (data: { name: string; code: string }) => api.post<ShippingLine>('/shipping-lines', data),
  update: (id: number, data: { name: string; code: string; isActive: boolean }) =>
    api.put<ShippingLine>(`/shipping-lines/${id}`, data),
  deactivate: (id: number) => api.delete(`/shipping-lines/${id}`),
}

export interface ContainerMaster {
  id: number
  containerNo: string
  size: string
  type: string
  shippingLineId: number
  shippingLineName: string
}

export const containerApi = {
  list: () => api.get<ContainerMaster[]>('/containers'),
  create: (data: { containerNo: string; size: string; type: string; shippingLineId: number }) =>
    api.post<ContainerMaster>('/containers', data),
  update: (
    id: number,
    data: { containerNo: string; size: string; type: string; shippingLineId: number },
  ) => api.put<ContainerMaster>(`/containers/${id}`, data),
  delete: (id: number) => api.delete(`/containers/${id}`),
}

export interface ContainerSizeMaster {
  id: number
  label: string
  teu: number
  sortOrder: number
  isActive: boolean
}

export interface ContainerTypeMaster {
  id: number
  code: string
  label: string
  sortOrder: number
  isActive: boolean
}

export const containerSizeApi = {
  list: () => api.get<ContainerSizeMaster[]>('/container-sizes'),
  create: (data: { label: string; teu: number; sortOrder: number; isActive: boolean }) =>
    api.post<ContainerSizeMaster>('/container-sizes', data),
  update: (id: number, data: { label: string; teu: number; sortOrder: number; isActive: boolean }) =>
    api.put<ContainerSizeMaster>(`/container-sizes/${id}`, data),
  deactivate: (id: number) => api.post(`/container-sizes/${id}/deactivate`),
}

export const containerTypeApi = {
  list: () => api.get<ContainerTypeMaster[]>('/container-types'),
  create: (data: { code: string; label: string; sortOrder: number; isActive: boolean }) =>
    api.post<ContainerTypeMaster>('/container-types', data),
  update: (id: number, data: { code: string; label: string; sortOrder: number; isActive: boolean }) =>
    api.put<ContainerTypeMaster>(`/container-types/${id}`, data),
  deactivate: (id: number) => api.post(`/container-types/${id}/deactivate`),
}

export interface Schedule {
  id: number
  preAdviceId: number
  referenceNo: string
  depotId: number
  depotName: string
  date: string
  time: string
  slotNo: number
  status: string
  truckerId?: number | null
  truckerName?: string | null
}

export interface Payment {
  id: number
  scheduleId: number
  truckerId: number
  truckerName: string
  amount: number
  proofFile?: string | null
  proofReferenceNo?: string | null
  proofTransactionAt?: string | null
  status: string
  paidAt?: string | null
}

export interface PaymentProofMetadataInput {
  proofReferenceNo?: string | null
  proofTransactionAt?: string | null
}

export interface QrBooking {
  id: number
  scheduleId: number
  qrCode: string
  payload: {
    bookingId: string
    containerNo: string
    shippingLine: string
    depot: string
    scheduleDate: string
    scheduleTime: string
    trucker: string
    validateUrl?: string | null
  }
  generatedAt: string
  isUsed: boolean
  logicteckBookedAt?: string | null
  logicteckStatus: string
}

export interface BookLogicteckResponse {
  success: boolean
  message: string
  booking?: QrBooking | null
  externalReference?: string | null
  portalUrl?: string | null
}

export interface UserListItem {
  id: number
  username: string
  fullName: string
  role: string
}

export interface SlotInfo {
  slotNo: number
  available: boolean
  scheduleId?: number | null
  referenceNo?: string | null
}

export interface SlotAvailability {
  depotId: number
  depotName: string
  date: string
  maxSlots: number
  dailyLimit: number
  bookedCount: number
  slots: SlotInfo[]
}

export const scheduleApi = {
  list: () => api.get<Schedule[]>('/schedules'),
  waitingCount: () => api.get<{ count: number }>('/schedules/waiting/count'),
  get: (id: number) => api.get<Schedule>(`/schedules/${id}`),
  getByPreAdvice: async (preAdviceId: number): Promise<{ data: Schedule | null }> => {
    try {
      const { data } = await api.get<Schedule>(`/schedules/by-preforecast/${preAdviceId}`)
      return { data }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        return { data: null }
      }
      throw err
    }
  },
  slots: (depotId: number, date: string, excludeScheduleId?: number) =>
    api.get<SlotAvailability>('/schedules/slots', {
      params: { depotId, date, excludeScheduleId },
    }),
  update: (id: number, data: {
    date: string
    time: string
    slotNo: number
    status: string
    truckerId?: number | null
  }) => api.put<Schedule>(`/schedules/${id}`, data),
}

export interface PaymentSettings {
  returnFeeAmount: number
  updatedAt: string
}

export const paymentApi = {
  mine: () => api.get<Payment[]>('/payments/mine'),
  pending: () => api.get<Payment[]>('/payments/pending'),
  pendingCount: () => api.get<{ count: number }>('/payments/pending/count'),
  dueCount: () => api.get<{ count: number }>('/payments/due/count'),
  depot: () => api.get<Payment[]>('/payments/depot'),
  getSettings: () => api.get<PaymentSettings>('/payments/settings'),
  updateSettings: (returnFeeAmount: number) =>
    api.put<PaymentSettings>('/payments/settings', { returnFeeAmount }),
  getBySchedule: (scheduleId: number) => api.get<Payment | null>(`/payments/by-schedule/${scheduleId}`),
  upload: (
    scheduleId: number,
    proof: File,
    metadata?: PaymentProofMetadataInput,
  ) => {
    const form = new FormData()
    form.append('scheduleId', String(scheduleId))
    form.append('proof', proof)
    if (metadata?.proofReferenceNo) form.append('proofReferenceNo', metadata.proofReferenceNo)
    if (metadata?.proofTransactionAt) form.append('proofTransactionAt', metadata.proofTransactionAt)
    return api.post<Payment>('/payments/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  updateProofMetadata: (id: number, metadata: PaymentProofMetadataInput) =>
    api.put<Payment>(`/payments/${id}/proof-metadata`, metadata),
  extractProofMetadata: (id: number) => api.post<Payment>(`/payments/${id}/extract-proof`),
  downloadProofFile: (id: number) =>
    api.get<Blob>(`/payments/${id}/proof-file`, { responseType: 'blob' }),
  verify: (id: number, approved: boolean, metadata?: PaymentProofMetadataInput) =>
    api.post<Payment>(`/payments/${id}/verify`, {
      approved,
      proofReferenceNo: metadata?.proofReferenceNo ?? null,
      proofTransactionAt: metadata?.proofTransactionAt ?? null,
    }),
}

export interface DemurrageBillingFeeLine {
  id: number
  description: string
  amount: number
  sortOrder: number
}

export interface DemurrageBilling {
  id: number
  referenceNo: string
  preAdviceId: number
  preAdviceReferenceNo: string
  shippingLineId: number
  shippingLineName: string
  truckerId: number
  truckerName: string
  containerNo: string
  containerSize: string
  containerType: string
  demurrageValidUntil: string
  expiredOn: string
  daysOverdue: number
  demurrageAmount: number
  detentionAmount: number
  totalAmount: number
  feeLines: DemurrageBillingFeeLine[]
  status: string
  proofFile?: string | null
  proofReferenceNo?: string | null
  proofTransactionAt?: string | null
  paidAt?: string | null
  createdAt: string
}

export interface DemurrageBillingFeeInput {
  description: string
  amount: number
}

export interface EligibleDemurragePreAdvice {
  preAdviceId: number
  referenceNo: string
  containerNo: string
  truckerName: string
  demurrageValidUntil: string
  daysOverdue: number
}

export interface DemurrageBlockCheck {
  isBlocked: boolean
  message?: string | null
  billing?: DemurrageBilling | null
}

export const demurrageBillingApi = {
  list: () => api.get<DemurrageBilling[]>('/demurrage-billing'),
  get: (id: number) => api.get<DemurrageBilling>(`/demurrage-billing/${id}`),
  eligiblePreAdvices: () => api.get<EligibleDemurragePreAdvice[]>('/demurrage-billing/eligible-pre-forecasts'),
  create: (payload: { preAdviceId: number; feeLines?: DemurrageBillingFeeInput[] }) =>
    api.post<DemurrageBilling>('/demurrage-billing', payload),
  updateFees: (id: number, feeLines: DemurrageBillingFeeInput[]) =>
    api.put<DemurrageBilling>(`/demurrage-billing/${id}/fees`, { feeLines }),
  checkBlock: (params: {
    containerNo: string
    shippingLineId: number
    containerSizeId: number
    containerTypeId: number
  }) => api.get<DemurrageBlockCheck>('/demurrage-billing/check-block', { params }),
  uploadProof: (
    id: number,
    proof: File,
    metadata?: PaymentProofMetadataInput,
  ) => {
    const form = new FormData()
    form.append('proof', proof)
    if (metadata?.proofReferenceNo) form.append('proofReferenceNo', metadata.proofReferenceNo)
    if (metadata?.proofTransactionAt) form.append('proofTransactionAt', metadata.proofTransactionAt)
    return api.post<DemurrageBilling>(`/demurrage-billing/${id}/upload-proof`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  verify: (id: number, approved: boolean, metadata?: PaymentProofMetadataInput) =>
    api.post<DemurrageBilling>(`/demurrage-billing/${id}/verify`, {
      approved,
      proofReferenceNo: metadata?.proofReferenceNo ?? null,
      proofTransactionAt: metadata?.proofTransactionAt ?? null,
    }),
}

export const qrApi = {
  get: (bookingId: number) => api.get<QrBooking>(`/qr/${bookingId}`),
  getBySchedule: (scheduleId: number) => api.get<QrBooking>(`/qr/schedule/${scheduleId}`),
  getByCode: (qrCode: string) => api.get<QrBooking>(`/qr/code/${encodeURIComponent(qrCode)}`),
  downloadUrl: (bookingId: number) => resolveAssetUrl(`/api/qr/download/${bookingId}`),
  bookLogicteck: (bookingId: number) => api.post<BookLogicteckResponse>(`/qr/${bookingId}/book-logicteck`),
}

export const logicteckApi = {
  validateQr: (qrCode: string, apiKey?: string) =>
    api.post<{
      valid: boolean
      message?: string | null
      bookingReference?: string | null
      containerNo?: string | null
      shippingLine?: string | null
      trucker?: string | null
      preAdviceReference?: string | null
      scheduledDate?: string | null
      scheduledTime?: string | null
      depot?: string | null
    }>(
      '/logicteck/validate-qr',
      { qrCode },
      apiKey ? { headers: { 'X-Logicteck-Api-Key': apiKey } } : undefined,
    ),
  lookupBooking: (qrCode: string, apiKey?: string) =>
    api.get<{
      found: boolean
      message?: string | null
      bookingReference?: string | null
      containerNo?: string | null
      isBooked: boolean
      isRetrieved: boolean
    }>(`/logicteck/booking/${encodeURIComponent(qrCode)}`, {
      headers: apiKey ? { 'X-Logicteck-Api-Key': apiKey } : undefined,
    }),
}

export interface AuditLog {
  id: number
  userId: number
  username: string
  action: string
  module: string
  details?: string | null
  timestamp: string
}

export interface AuditLogPage {
  items: AuditLog[]
  total: number
  page: number
  pageSize: number
}

export const auditApi = {
  list: (params: {
    userId?: number
    module?: string
    action?: string
    from?: string
    to?: string
    page?: number
    pageSize?: number
  }) => api.get<AuditLogPage>('/audit', { params }),
}

export interface Notification {
  id: number
  title: string
  message: string
  category: string
  linkPath?: string | null
  isRead: boolean
  createdAt: string
  referenceNo?: string | null
  actorName?: string | null
}

export interface NotificationPage {
  items: Notification[]
  total: number
  unreadCount: number
  page: number
  pageSize: number
}

export const notificationApi = {
  list: (params?: { page?: number; pageSize?: number; unreadOnly?: boolean }) =>
    api.get<NotificationPage>('/notifications', { params }),
  unreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
  markRead: (id: number) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
}

export interface DailyReturnReportRow {
  date: string
  scheduled: number
  confirmed: number
  completed: number
  cancelled: number
}

export interface DailyReturnReport {
  from: string
  to: string
  rows: DailyReturnReportRow[]
  totalScheduled: number
  totalCompleted: number
}

export interface MonthlyReturnReportRow {
  year: number
  month: number
  label: string
  scheduled: number
  confirmed: number
  completed: number
  cancelled: number
}

export interface MonthlyReturnReport {
  year: number
  rows: MonthlyReturnReportRow[]
  totalScheduled: number
  totalCompleted: number
}

export interface ShippingLineReportRow {
  shippingLineId: number
  code: string
  name: string
  scheduled: number
  confirmed: number
  completed: number
  cancelled: number
}

export interface ShippingLineReport {
  from: string
  to: string
  rows: ShippingLineReportRow[]
  totalScheduled: number
  totalCompleted: number
}

export interface DepotReportRow {
  depotId: number
  name: string
  scheduled: number
  confirmed: number
  completed: number
  cancelled: number
}

export interface DepotReport {
  from: string
  to: string
  rows: DepotReportRow[]
  totalScheduled: number
  totalCompleted: number
}

export interface RevenueReportRow {
  label: string
  periodStart: string
  periodEnd: string
  paymentCount: number
  totalAmount: number
}

export interface RevenueReport {
  period: string
  from: string
  to: string
  rows: RevenueReportRow[]
  totalPayments: number
  totalRevenue: number
  averagePayment: number
}

export interface TransactionReportRow {
  paymentId: number
  scheduleId: number
  referenceNo: string
  truckerName: string
  shippingLineId: number
  shippingLineCode: string
  shippingLineName: string
  depotId: number
  depotName: string
  status: string
  amount: number
  transactionDate: string
  transactionAt: string | null
}

export interface TransactionReport {
  from: string
  to: string
  rows: TransactionReportRow[]
  total: number
  page: number
  pageSize: number
  paidCount: number
  paidAmount: number
  pendingCount: number
  rejectedCount: number
}

export interface TransactionShippingLineOverviewRow {
  shippingLineId: number
  code: string
  name: string
  totalCount: number
  paidCount: number
  pendingCount: number
  rejectedCount: number
  paidAmount: number
}

export interface TransactionDepotOverviewRow {
  depotId: number
  name: string
  totalCount: number
  paidCount: number
  pendingCount: number
  rejectedCount: number
  paidAmount: number
}

export interface TransactionShippingLineOverview {
  from: string
  to: string
  rows: TransactionShippingLineOverviewRow[]
  totalCount: number
  paidCount: number
  paidAmount: number
  pendingCount: number
  rejectedCount: number
}

export interface TransactionDepotOverview {
  from: string
  to: string
  rows: TransactionDepotOverviewRow[]
  totalCount: number
  paidCount: number
  paidAmount: number
  pendingCount: number
  rejectedCount: number
}

export const reportApi = {
  dailyReturns: (params: { from?: string; to?: string; depotId?: number }) =>
    api.get<DailyReturnReport>('/reports/returns/daily', { params }),
  monthlyReturns: (params: { year?: number; depotId?: number }) =>
    api.get<MonthlyReturnReport>('/reports/returns/monthly', { params }),
  shippingLines: (params: { from?: string; to?: string; depotId?: number }) =>
    api.get<ShippingLineReport>('/reports/shipping-lines', { params }),
  depots: (params: { from?: string; to?: string; depotId?: number }) =>
    api.get<DepotReport>('/reports/depots', { params }),
  revenue: (params: { period: 'weekly' | 'monthly' | 'yearly'; year?: number }) =>
    api.get<RevenueReport>('/reports/revenue', { params }),
  transactions: (params: { from?: string; to?: string; page?: number; pageSize?: number }) =>
    api.get<TransactionReport>('/reports/transactions', { params }),
  transactionShippingLines: (params: { from?: string; to?: string }) =>
    api.get<TransactionShippingLineOverview>('/reports/transactions/shipping-lines', { params }),
  transactionDepots: (params: { from?: string; to?: string }) =>
    api.get<TransactionDepotOverview>('/reports/transactions/depots', { params }),
}

export const userApi = {
  truckers: () => api.get<UserListItem[]>('/users/truckers'),
  list: () => api.get<UserAdmin[]>('/users'),
  lookups: () => api.get<AdminLookups>('/users/lookups'),
  update: (id: number, data: UpdateUserRequest) => api.put<UserAdmin>(`/users/${id}`, data),
}

export interface RoleCatalog {
  id: number
  name: string
  label: string
  description: string
  capabilities: string[]
  allowedPages: string[]
}

export const roleApi = {
  list: () => api.get<RoleCatalog[]>('/roles'),
  access: () => api.get<{ allowedPages: string[] }>('/roles/access'),
  update: (name: string, data: { description: string; capabilities: string[]; allowedPages: string[] }) =>
    api.put<RoleCatalog>(`/roles/${encodeURIComponent(name)}`, data),
}

export interface UserAdmin {
  id: number
  username: string
  email: string
  fullName: string
  role: string
  status: string
  shippingLineId?: number | null
  shippingLineName?: string | null
  depotId?: number | null
  depotName?: string | null
}

export interface AdminLookups {
  roles: { id: number; name: string }[]
  shippingLines: { id: number; name: string; code: string }[]
  depots: { id: number; name: string }[]
}

export interface UpdateUserRequest {
  email: string
  fullName: string
  role: string
  status: string
  shippingLineId?: number | null
  depotId?: number | null
}
