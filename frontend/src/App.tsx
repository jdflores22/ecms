import { Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppRouteSkeleton } from './components/layout/SkeletonPrimitives'
import { ensureValidAccessToken } from './services/api'
import { useAppSelector } from './store/hooks'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import LandingPage from './pages/LandingPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import { CertificateVerifyPage } from './routes/lazyPages'
import AppLayout from './layouts/AppLayout'
import RoleRouteGuard from './components/auth/RoleRouteGuard'
import {
  AdminAuditLogPage,
  AdminPaymentsPage,
  AdminRevenuePage,
  AdminTransactionReportsPage,
  AdminUsersPage,
  AdminVersionPage,
  AtwBulkSelectPage,
  AtwDetailPage,
  AtwNewPage,
  AtwPage,
  ContainerInventoryPage,
  CyAllocationPage,
  DailyReturnsPage,
  DashboardPage,
  DemurrageBillingDetailPage,
  DepotSchedulesPage,
  DepotBroadcastPage,
  DepotWithdrawalDetailPage,
  DepotWithdrawalsPage,
  EvaluationDetailPage,
  EvaluationsPage,
  EvaluatorDemurrageBillingPage,
  MasterDataPage,
  CertificateTemplatesPage,
  CertificateTemplatePreviewPage,
  TruckerNewsPage,
  PreAdviceDetailPage,
  PreAdviceNewPage,
  PreAdvicePage,
  ProfilePage,
  QrPrintPage,
  ReportsRedirect,
  RoleReportsPage,
  RolesPage,
  ScheduleDetailPage,
  TruckerDemurrageBillingPage,
  TruckerPaymentUploadPage,
  TruckerNotificationsPage,
  TruckerPaymentsPage,
  TruckerQrPage,
  TruckerReturnDetailPage,
  TruckerReturnsPage,
  TruckerWithdrawalsPage,
  TruckerWithdrawalSchedulePage,
  WithdrawalDetailPage,
  WithdrawalNewPage,
} from './routes/lazyPages'

function RouteFallback() {
  return <AppRouteSkeleton />
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAppSelector((s) => s.auth.accessToken)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function GuestOrApp() {
  const token = useAppSelector((s) => s.auth.accessToken)
  const userId = useAppSelector((s) => s.auth.user?.id)
  const location = useLocation()
  const [authReady, setAuthReady] = useState(() => !token)

  useEffect(() => {
    if (!token) {
      setAuthReady(true)
      return
    }

    let cancelled = false
    ensureValidAccessToken().finally(() => {
      if (!cancelled) setAuthReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [token])

  if (!authReady) {
    return <AppRouteSkeleton />
  }

  if (!token) {
    if (location.pathname === '/') return <LandingPage />
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <AppLayout key={userId ?? 'session'} />
}

function LegacyPreAdviceRedirect() {
  const location = useLocation()
  return (
    <Navigate
      to={`${location.pathname.replace(/^\/preadvice(?=\/|$)/, '/preforecast')}${location.search}`}
      replace
    />
  )
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup/:role" element={<SignUpPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/verify/certificate/:token"
        element={
          <Suspense fallback={<RouteFallback />}>
            <CertificateVerifyPage />
          </Suspense>
        }
      />
      <Route
        path="/trucker/qr/print/:bookingId"
        element={
          <ProtectedRoute>
            <RoleRouteGuard>
              <QrPrintPage />
            </RoleRouteGuard>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<GuestOrApp />}>
        <Route
          index
          element={
            <RoleRouteGuard>
              <DashboardPage />
            </RoleRouteGuard>
          }
        />
        <Route path="preadvice/*" element={<LegacyPreAdviceRedirect />} />
        <Route
          path="preforecast"
          element={
            <RoleRouteGuard>
              <PreAdvicePage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="preforecast/new"
          element={
            <RoleRouteGuard>
              <PreAdviceNewPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="preforecast/:id"
          element={
            <RoleRouteGuard>
              <PreAdviceDetailPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="evaluations"
          element={
            <RoleRouteGuard>
              <EvaluationsPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="evaluations/container-inventory"
          element={
            <RoleRouteGuard>
              <ContainerInventoryPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="evaluations/reports"
          element={
            <RoleRouteGuard>
              <RoleReportsPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="evaluations/demurrage-billing/:id"
          element={
            <RoleRouteGuard>
              <DemurrageBillingDetailPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="evaluations/demurrage-billing"
          element={
            <RoleRouteGuard>
              <EvaluatorDemurrageBillingPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="evaluations/atw/new"
          element={
            <RoleRouteGuard>
              <AtwNewPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="evaluations/atw/new/containers"
          element={
            <RoleRouteGuard>
              <AtwBulkSelectPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="evaluations/atw/:id"
          element={
            <RoleRouteGuard>
              <AtwDetailPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="evaluations/atw"
          element={
            <RoleRouteGuard>
              <AtwPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="evaluations/cy-allocation"
          element={
            <RoleRouteGuard>
              <CyAllocationPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="evaluations/:id"
          element={
            <RoleRouteGuard>
              <EvaluationDetailPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="depot/reports"
          element={
            <RoleRouteGuard>
              <RoleReportsPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="depot/withdrawals/:id"
          element={
            <RoleRouteGuard>
              <DepotWithdrawalDetailPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="depot/withdrawals"
          element={
            <RoleRouteGuard>
              <DepotWithdrawalsPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="depot/schedules"
          element={
            <RoleRouteGuard>
              <DepotSchedulesPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="depot/schedules/:id"
          element={
            <RoleRouteGuard>
              <ScheduleDetailPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="depot/daily-returns"
          element={
            <RoleRouteGuard>
              <DailyReturnsPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="depot/broadcasts"
          element={
            <RoleRouteGuard>
              <DepotBroadcastPage />
            </RoleRouteGuard>
          }
        />
        <Route path="depot/payments" element={<Navigate to="/admin/payments" replace />} />
        <Route
          path="admin/payments"
          element={
            <RoleRouteGuard>
              <AdminPaymentsPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="trucker/reports"
          element={
            <RoleRouteGuard>
              <RoleReportsPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="trucker/returns"
          element={
            <RoleRouteGuard>
              <TruckerReturnsPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="trucker/returns/:id"
          element={
            <RoleRouteGuard>
              <TruckerReturnDetailPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="trucker/notifications"
          element={
            <RoleRouteGuard>
              <TruckerNotificationsPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="trucker/payments/:scheduleId"
          element={
            <RoleRouteGuard>
              <TruckerPaymentUploadPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="trucker/payments"
          element={
            <RoleRouteGuard>
              <TruckerPaymentsPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="trucker/demurrage-billing/:id"
          element={
            <RoleRouteGuard>
              <DemurrageBillingDetailPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="trucker/demurrage-billing"
          element={
            <RoleRouteGuard>
              <TruckerDemurrageBillingPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="trucker/withdrawals/schedule"
          element={
            <RoleRouteGuard>
              <TruckerWithdrawalSchedulePage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="trucker/withdrawals/new"
          element={
            <RoleRouteGuard>
              <WithdrawalNewPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="trucker/withdrawals/:id"
          element={
            <RoleRouteGuard>
              <WithdrawalDetailPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="trucker/withdrawals"
          element={
            <RoleRouteGuard>
              <TruckerWithdrawalsPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="trucker/qr"
          element={
            <RoleRouteGuard>
              <TruckerQrPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="admin/users"
          element={
            <RoleRouteGuard>
              <AdminUsersPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="admin/roles"
          element={
            <RoleRouteGuard>
              <RolesPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="admin/master-data"
          element={
            <RoleRouteGuard>
              <MasterDataPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="admin/trucker-news"
          element={
            <RoleRouteGuard>
              <TruckerNewsPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="admin/certificate-templates/preview"
          element={
            <RoleRouteGuard>
              <CertificateTemplatePreviewPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="admin/certificate-templates"
          element={
            <RoleRouteGuard>
              <CertificateTemplatesPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="admin/audit"
          element={
            <RoleRouteGuard>
              <AdminAuditLogPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="admin/version"
          element={
            <RoleRouteGuard>
              <AdminVersionPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="admin/revenue"
          element={
            <RoleRouteGuard>
              <AdminRevenuePage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="admin/reports"
          element={
            <RoleRouteGuard>
              <AdminTransactionReportsPage />
            </RoleRouteGuard>
          }
        />
        <Route path="admin/reports/revenue" element={<Navigate to="/admin/revenue" replace />} />
        <Route
          path="reports"
          element={
            <RoleRouteGuard>
              <ReportsRedirect />
            </RoleRouteGuard>
          }
        />
        <Route
          path="profile"
          element={
            <RoleRouteGuard>
              <ProfilePage />
            </RoleRouteGuard>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
