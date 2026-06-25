import axios from 'axios'
import { store } from '../store'
import { logout } from '../store/slices/authSlice'
import { resolveAssetUrl } from '../utils/assetUrl'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      store.dispatch(logout())
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
  createdAt: string
}

export const profileApi = {
  get: () => api.get<Profile>('/profile'),
  update: (data: { email: string; fullName: string }) => api.put<Profile>('/profile', data),
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
  list: () => api.get<PreAdvice[]>('/preadvice'),
  get: (id: number) => api.get<PreAdvice>(`/preadvice/${id}`),
  lookups: () => api.get<PreAdviceLookups>('/preadvice/lookups'),
  create: (data: {
    shippingLineId: number
    containerNo: string
    containerSizeId: number
    containerTypeId: number
    remarks?: string
  }) => api.post<PreAdvice>('/preadvice', data),
  update: (
    id: number,
    data: {
      shippingLineId: number
      containerNo: string
      containerSizeId: number
      containerTypeId: number
      remarks?: string
    },
  ) => api.put<PreAdvice>(`/preadvice/${id}`, data),
  delete: (id: number) => api.delete(`/preadvice/${id}`),
  submit: (id: number) => api.post<PreAdvice>(`/preadvice/${id}/submit`),
  cancel: (id: number, reason?: string) =>
    api.post<PreAdvice>(`/preadvice/${id}/cancel`, reason ? { reason } : {}),
  documents: (id: number) => api.get<PreAdviceDocument[]>(`/preadvice/${id}/documents`),
  uploadDocument: (id: number, file: File, category: string, comment?: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('category', category)
    if (comment) form.append('comment', comment)
    return api.post<PreAdviceDocument>(`/preadvice/${id}/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  deleteDocument: (preAdviceId: number, documentId: number) =>
    api.delete(`/preadvice/${preAdviceId}/documents/${documentId}`),
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
  remarks?: string | null
  createdAt: string
  complianceRemarks?: string | null
  complianceRequestedAt?: string | null
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
  approve: (data: { preAdviceId: number; depotId: number; remarks?: string }) =>
    api.post<Evaluation>('/evaluations/approve', data),
  reject: (data: { preAdviceId: number; remarks: string }) =>
    api.post<Evaluation>('/evaluations/reject', data),
  returnForCompliance: (data: { preAdviceId: number; remarks: string }) =>
    api.post<Evaluation>('/evaluations/return-for-compliance', data),
}

export interface CyAllocationBreakdownCell {
  typeCode: string
  typeLabel: string
  activeReturns: number
  usedTeu: number
}

export interface CyAllocationBreakdownRow {
  sizeLabel: string
  teuPerContainer: number
  cells: CyAllocationBreakdownCell[]
}

export interface CyAllocation {
  depotId: number
  depotName: string
  depotAddress: string
  shippingLineId: number
  shippingLineName: string
  contractTeu: number
  usedTeu: number
  availableTeu: number
  activeReturns: number
  hasCapacity: boolean
  breakdown: CyAllocationBreakdownRow[]
}

export interface CyAllocationForApproval {
  preAdviceId: number
  referenceNo: string
  requestedTeu: number
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
  depotId: number
  depotName: string
  yardInDate: string
  dwellDays: number
  daysRemaining: number
  complianceStatus: ContainerDwellCompliance
  scheduleStatus: string | null
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

export interface ShippingLineDepotContract {
  id: number
  shippingLineId: number
  shippingLineName: string
  depotId: number
  depotName: string
  contractTeu: number
  usedTeu: number
  availableTeu: number
  isActive: boolean
}

export const shippingLineDepotContractApi = {
  list: () => api.get<ShippingLineDepotContract[]>('/shipping-line-depot-contracts'),
  create: (data: { shippingLineId: number; depotId: number; contractTeu: number }) =>
    api.post<ShippingLineDepotContract>('/shipping-line-depot-contracts', data),
  update: (id: number, data: { contractTeu: number; isActive: boolean }) =>
    api.put<ShippingLineDepotContract>(`/shipping-line-depot-contracts/${id}`, data),
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
  status: string
  paidAt?: string | null
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
  }
  generatedAt: string
  isUsed: boolean
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
  get: (id: number) => api.get<Schedule>(`/schedules/${id}`),
  getByPreAdvice: async (preAdviceId: number): Promise<{ data: Schedule | null }> => {
    try {
      const { data } = await api.get<Schedule>(`/schedules/by-preadvice/${preAdviceId}`)
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
  depot: () => api.get<Payment[]>('/payments/depot'),
  getSettings: () => api.get<PaymentSettings>('/payments/settings'),
  updateSettings: (returnFeeAmount: number) =>
    api.put<PaymentSettings>('/payments/settings', { returnFeeAmount }),
  getBySchedule: (scheduleId: number) => api.get<Payment | null>(`/payments/by-schedule/${scheduleId}`),
  upload: (scheduleId: number, proof: File) => {
    const form = new FormData()
    form.append('scheduleId', String(scheduleId))
    form.append('proof', proof)
    return api.post<Payment>('/payments/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  verify: (id: number, approved: boolean) =>
    api.post<Payment>(`/payments/${id}/verify?approved=${approved}`),
}

export const qrApi = {
  get: (bookingId: number) => api.get<QrBooking>(`/qr/${bookingId}`),
  getBySchedule: (scheduleId: number) => api.get<QrBooking>(`/qr/schedule/${scheduleId}`),
  downloadUrl: (bookingId: number) => resolveAssetUrl(`/api/qr/download/${bookingId}`),
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

export const reportApi = {
  dailyReturns: (params: { from?: string; to?: string; depotId?: number }) =>
    api.get<DailyReturnReport>('/reports/returns/daily', { params }),
  monthlyReturns: (params: { year?: number; depotId?: number }) =>
    api.get<MonthlyReturnReport>('/reports/returns/monthly', { params }),
  shippingLines: (params: { from?: string; to?: string; depotId?: number }) =>
    api.get<ShippingLineReport>('/reports/shipping-lines', { params }),
  depots: (params: { from?: string; to?: string; depotId?: number }) =>
    api.get<DepotReport>('/reports/depots', { params }),
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
