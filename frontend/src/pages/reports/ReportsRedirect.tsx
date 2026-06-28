import { Navigate } from 'react-router-dom'
import { getReportPathForRole } from '../../config/reportConfig'
import { useAppSelector } from '../../store/hooks'

/** Legacy /reports URL — sends users to their role-specific reports page. */
export default function ReportsRedirect() {
  const user = useAppSelector((s) => s.auth.user)
  if (!user?.role) return <Navigate to="/login" replace />
  return <Navigate to={getReportPathForRole(user.role)} replace />
}
