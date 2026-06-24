import axios from 'axios'
import { store } from '../store'
import { logout } from '../store/slices/authSlice'

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
    role: 'Broker' | 'Trucker'
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
      Broker: '/dashboard/broker',
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
  create: (data: { shippingLineId: number; containerId: number; remarks?: string }) =>
    api.post<PreAdvice>('/preadvice', data),
  update: (id: number, data: { shippingLineId: number; containerId: number; remarks?: string }) =>
    api.put<PreAdvice>(`/preadvice/${id}`, data),
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
  containers: {
    id: number
    containerNo: string
    size: string
    type: string
    shippingLineId: number
  }[]
}

export interface PreAdvice {
  id: number
  referenceNo: string
  brokerId: number
  brokerName: string
  shippingLineId: number
  shippingLineName: string
  containerId: number
  containerNo: string
  containerSize: string
  containerType: string
  status: string
  remarks?: string | null
  createdAt: string
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
  getByPreAdvice: (preAdviceId: number) => api.get<Schedule>(`/schedules/by-preadvice/${preAdviceId}`),
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

export const paymentApi = {
  mine: () => api.get<Payment[]>('/payments/mine'),
  pending: () => api.get<Payment[]>('/payments/pending'),
  depot: () => api.get<Payment[]>('/payments/depot'),
  getBySchedule: (scheduleId: number) => api.get<Payment | null>(`/payments/by-schedule/${scheduleId}`),
  upload: (scheduleId: number, amount: number, proof: File) => {
    const form = new FormData()
    form.append('scheduleId', String(scheduleId))
    form.append('amount', String(amount))
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
  downloadUrl: (bookingId: number) => `/api/qr/download/${bookingId}`,
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
