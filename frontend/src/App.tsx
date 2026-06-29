import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAppSelector } from './store/hooks'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import LandingPage from './pages/LandingPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import PreAdvicePage from './pages/PreAdvicePage'
import PreAdviceNewPage from './pages/preAdvice/PreAdviceNewPage'
import PreAdviceDetailPage from './pages/preAdvice/PreAdviceDetailPage'
import EvaluationsPage from './pages/EvaluationsPage'
import EvaluationDetailPage from './pages/evaluations/EvaluationDetailPage'
import ContainerInventoryPage from './pages/evaluations/ContainerInventoryPage'
import EvaluatorDemurrageBillingPage from './pages/evaluations/DemurrageBillingPage'
import DemurrageBillingDetailPage from './pages/demurrage/DemurrageBillingDetailPage'
import CyAllocationPage from './pages/evaluations/CyAllocationPage'
import DailyReturnsPage from './pages/depot/DailyReturnsPage'
import DepotSchedulesPage from './pages/depot/SchedulesPage'
import ScheduleDetailPage from './pages/depot/ScheduleDetailPage'
import AdminPaymentsPage from './pages/admin/PaymentsPage'
import TruckerReturnsPage from './pages/trucker/ReturnsPage'
import TruckerReturnDetailPage from './pages/trucker/ReturnDetailPage'
import TruckerPaymentsPage from './pages/trucker/PaymentsPage'
import TruckerPaymentUploadPage from './pages/trucker/PaymentUploadPage'
import TruckerDemurrageBillingPage from './pages/trucker/DemurrageBillingPage'
import TruckerQrPage from './pages/trucker/QrPage'
import QrPrintPage from './pages/trucker/QrPrintPage'
import AdminUsersPage from './pages/admin/UsersPage'
import RolesPage from './pages/admin/RolesPage'
import MasterDataPage from './pages/admin/MasterDataPage'
import AdminAuditLogPage from './pages/admin/AuditLogPage'
import AdminVersionPage from './pages/admin/AdminVersionPage'
import AdminTransactionReportsPage from './pages/admin/AdminTransactionReportsPage'
import RoleReportsPage from './pages/reports/RoleReportsPage'
import ReportsRedirect from './pages/reports/ReportsRedirect'
import ProfilePage from './pages/ProfilePage'
import AppLayout from './layouts/AppLayout'
import RoleRouteGuard from './components/auth/RoleRouteGuard'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAppSelector((s) => s.auth.accessToken)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function GuestOrApp() {
  const token = useAppSelector((s) => s.auth.accessToken)
  const location = useLocation()

  if (!token) {
    if (location.pathname === '/') return <LandingPage />
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <AppLayout />
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
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup/:role" element={<SignUpPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
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
          path="admin/reports"
          element={
            <RoleRouteGuard>
              <AdminTransactionReportsPage />
            </RoleRouteGuard>
          }
        />
        <Route path="admin/revenue" element={<Navigate to="/admin/reports?tab=revenue" replace />} />
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
  )
}
