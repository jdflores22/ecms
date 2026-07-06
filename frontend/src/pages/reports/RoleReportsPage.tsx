import { Alert, Box, Button, Chip, Paper, Typography } from '@mui/material'
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import DownloadIcon from '@mui/icons-material/Download'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import ReportFiltersBar from '../../components/reports/ReportFiltersBar'
import ReportStatusSummary from '../../components/reports/ReportStatusSummary'
import ReportStatusTable from '../../components/reports/ReportStatusTable'
import { StatCardsSkeleton } from '../../components/layout/SkeletonPrimitives'
import { heroMutedChipSx, heroPaperSx } from '../../components/layout/DetailPagePrimitives'
import { listHeroActionSx, listPageRootSx } from '../../components/layout/ListPagePrimitives'
import {
  isReportPageKey,
  REPORT_PAGE_CONFIG,
  type ReportTabId,
  usesDateRangeForTab,
} from '../../config/reportConfig'
import { roleLabel } from '../../config/roleConfig'
import { resolvePageKey } from '../../config/routeAccess'
import {
  depotApi,
  reportApi,
  type DailyReturnReport,
  type Depot,
  type DepotReport,
  type MonthlyReturnReport,
  type ReportShippingLineOption,
  type ShippingLineReport,
} from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import { currentPhYear, defaultReportFromDate, formatScheduleDate, todayIsoDate } from '../../utils/datetime'
import { REPORT_STATUS_META, type ReportStatusRow } from '../../utils/reportStats'

const STATUS_HEADERS = ['Scheduled', 'Confirmed', 'Completed', 'No show'] as const

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v)
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function mapDailyRows(report: DailyReturnReport): ReportStatusRow[] {
  return report.rows.map((row) => ({
    key: row.date,
    label: formatScheduleDate(row.date),
    scheduled: row.scheduled,
    confirmed: row.confirmed,
    completed: row.completed,
    cancelled: row.cancelled,
  }))
}

function mapMonthlyRows(report: MonthlyReturnReport): ReportStatusRow[] {
  return report.rows.map((row) => ({
    key: String(row.month),
    label: row.label,
    scheduled: row.scheduled,
    confirmed: row.confirmed,
    completed: row.completed,
    cancelled: row.cancelled,
  }))
}

function mapShippingLineRows(report: ShippingLineReport): ReportStatusRow[] {
  return report.rows.map((row) => ({
    key: String(row.shippingLineId),
    label: row.name,
    sublabel: row.code,
    scheduled: row.scheduled,
    confirmed: row.confirmed,
    completed: row.completed,
    cancelled: row.cancelled,
  }))
}

function mapDepotRows(report: DepotReport): ReportStatusRow[] {
  return report.rows.map((row) => ({
    key: String(row.depotId),
    label: row.name,
    scheduled: row.scheduled,
    confirmed: row.confirmed,
    completed: row.completed,
    cancelled: row.cancelled,
  }))
}

export default function RoleReportsPage() {
  const user = useAppSelector((s) => s.auth.user)
  const location = useLocation()
  const pageKey = resolvePageKey(location.pathname)
  const reportConfig = pageKey && isReportPageKey(pageKey) ? REPORT_PAGE_CONFIG[pageKey] : null

  const [reportType, setReportType] = useState<ReportTabId>('daily')
  const [from, setFrom] = useState(defaultReportFromDate())
  const [to, setTo] = useState(todayIsoDate())
  const [year, setYear] = useState(currentPhYear())
  const [depotId, setDepotId] = useState<number | ''>('')
  const [depots, setDepots] = useState<Depot[]>([])
  const [shippingLineId, setShippingLineId] = useState<number | ''>('')
  const [shippingLines, setShippingLines] = useState<ReportShippingLineOption[]>([])
  const [daily, setDaily] = useState<DailyReturnReport | null>(null)
  const [monthly, setMonthly] = useState<MonthlyReturnReport | null>(null)
  const [byLine, setByLine] = useState<ShippingLineReport | null>(null)
  const [byDepot, setByDepot] = useState<DepotReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const activeTabId: ReportTabId | null =
    reportConfig?.tabs.find((t) => t.id === reportType)?.id ?? reportConfig?.tabs[0]?.id ?? null
  const usesDateRange = activeTabId ? usesDateRangeForTab(activeTabId) : false

  useEffect(() => {
    if (reportConfig?.showDepotFilter) {
      depotApi.list().then(({ data }) => setDepots(data)).catch(() => {})
    }
  }, [reportConfig?.showDepotFilter])

  useEffect(() => {
    if (reportConfig?.showShippingLineFilter) {
      reportApi
        .shippingLineOptions()
        .then(({ data }) => setShippingLines(data))
        .catch(() => {})
    }
  }, [reportConfig?.showShippingLineFilter])

  useEffect(() => {
    if (reportConfig?.tabs[0]) setReportType(reportConfig.tabs[0].id)
  }, [pageKey, reportConfig])

  const load = useCallback(() => {
    if (!user || !reportConfig || user.role !== reportConfig.role || !activeTabId) return
    setLoading(true)
    setError('')
    const depot = depotId === '' ? undefined : Number(depotId)
    const shippingLine = shippingLineId === '' ? undefined : Number(shippingLineId)

    const request =
      activeTabId === 'daily'
        ? reportApi.dailyReturns({ from, to, depotId: depot })
        : activeTabId === 'monthly'
          ? reportApi.monthlyReturns({ year, depotId: depot })
          : activeTabId === 'shippingLines'
            ? reportApi.shippingLines({ from, to, depotId: depot, shippingLineId: shippingLine })
            : reportApi.depots({ from, to, depotId: depot })

    request
      .then((res) => {
        setDaily(null)
        setMonthly(null)
        setByLine(null)
        setByDepot(null)
        if (activeTabId === 'daily') setDaily(res.data as DailyReturnReport)
        else if (activeTabId === 'monthly') setMonthly(res.data as MonthlyReturnReport)
        else if (activeTabId === 'shippingLines') setByLine(res.data as ShippingLineReport)
        else setByDepot(res.data as DepotReport)
      })
      .catch(() => setError('Failed to load report.'))
      .finally(() => setLoading(false))
  }, [user, reportConfig, activeTabId, from, to, year, depotId, shippingLineId])

  useEffect(() => {
    load()
  }, [load])

  const { tableRows, periodLabel, labelHeader, showCodeColumn } = useMemo(() => {
    if (activeTabId === 'daily' && daily) {
      return {
        tableRows: mapDailyRows(daily),
        periodLabel: `${formatScheduleDate(daily.from)} → ${formatScheduleDate(daily.to)}`,
        labelHeader: 'Date',
        showCodeColumn: false,
      }
    }
    if (activeTabId === 'monthly' && monthly) {
      return {
        tableRows: mapMonthlyRows(monthly),
        periodLabel: `Year ${monthly.year}`,
        labelHeader: 'Month',
        showCodeColumn: false,
      }
    }
    if (activeTabId === 'shippingLines' && byLine) {
      return {
        tableRows: mapShippingLineRows(byLine),
        periodLabel: `${formatScheduleDate(byLine.from)} → ${formatScheduleDate(byLine.to)}`,
        labelHeader: 'Shipping line',
        showCodeColumn: true,
      }
    }
    if (activeTabId === 'depots' && byDepot) {
      return {
        tableRows: mapDepotRows(byDepot),
        periodLabel: `${formatScheduleDate(byDepot.from)} → ${formatScheduleDate(byDepot.to)}`,
        labelHeader: 'Container yard',
        showCodeColumn: false,
      }
    }
    return { tableRows: [], periodLabel: '', labelHeader: 'Row', showCodeColumn: false }
  }, [activeTabId, daily, monthly, byLine, byDepot])

  if (!user || !reportConfig || user.role !== reportConfig.role) {
    return <Navigate to="/" replace />
  }

  const exportCsv = () => {
    if (tableRows.length === 0) return
    const statusKeys = REPORT_STATUS_META.map((m) => m.key)

    if (activeTabId === 'daily' && daily) {
      downloadCsv(
        `returns-daily-${daily.from}-${daily.to}.csv`,
        ['Date', ...STATUS_HEADERS],
        daily.rows.map((r) => [r.date, r.scheduled, r.confirmed, r.completed, r.cancelled]),
      )
    } else if (activeTabId === 'monthly' && monthly) {
      downloadCsv(
        `returns-monthly-${monthly.year}.csv`,
        ['Month', ...STATUS_HEADERS],
        monthly.rows.map((r) => [r.label, r.scheduled, r.confirmed, r.completed, r.cancelled]),
      )
    } else if (activeTabId === 'shippingLines' && byLine) {
      downloadCsv(
        `returns-by-shipping-line-${byLine.from}-${byLine.to}.csv`,
        ['Code', 'Shipping line', ...STATUS_HEADERS],
        byLine.rows.map((r) => [r.code, r.name, r.scheduled, r.confirmed, r.completed, r.cancelled]),
      )
    } else if (activeTabId === 'depots' && byDepot) {
      downloadCsv(
        `returns-by-depot-${byDepot.from}-${byDepot.to}.csv`,
        ['Depot', ...STATUS_HEADERS],
        byDepot.rows.map((r) => [r.name, r.scheduled, r.confirmed, r.completed, r.cancelled]),
      )
    } else {
      downloadCsv(
        `returns-${activeTabId}.csv`,
        [labelHeader, ...STATUS_HEADERS],
        tableRows.map((r) => [
          r.label,
          ...statusKeys.map((k) => r[k]),
        ]),
      )
    }
  }

  const hasExportData = tableRows.length > 0

  return (
    <Box sx={listPageRootSx}>
      <Paper elevation={0} sx={heroPaperSx}>
        <Box
          sx={{
            position: 'absolute',
            right: -30,
            top: -30,
            width: 140,
            height: 140,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.06)',
          }}
        />
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
            position: 'relative',
          }}
        >
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', minWidth: 0 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.14)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <AssessmentOutlinedIcon />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 0.75 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                  {reportConfig.title}
                </Typography>
                <Chip size="small" label={roleLabel(user.role)} sx={heroMutedChipSx} />
              </Box>
              <Typography sx={{ color: 'rgba(255,255,255,0.82)', maxWidth: 560 }}>
                {reportConfig.subtitle}
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={exportCsv}
            disabled={loading || !hasExportData}
            sx={{
              ...listHeroActionSx,
              '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.4)', color: 'rgba(11,61,145,0.5)' },
            }}
          >
            Export CSV
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <ReportFiltersBar
        tabs={reportConfig.tabs}
        selectedTabId={activeTabId ?? 'daily'}
        onTabIdChange={setReportType}
        usesDateRange={usesDateRange}
        from={from}
        to={to}
        year={year}
        onFromChange={setFrom}
        onToChange={setTo}
        onYearChange={setYear}
        showDepotFilter={reportConfig.showDepotFilter}
        depotId={depotId}
        depots={depots}
        onDepotChange={setDepotId}
        showShippingLineFilter={reportConfig.showShippingLineFilter}
        shippingLineId={shippingLineId}
        shippingLines={shippingLines}
        onShippingLineChange={setShippingLineId}
        loading={loading}
        onRefresh={load}
      />

      {loading ? (
        <Box sx={{ mb: 2.5 }}>
          <StatCardsSkeleton count={4} />
        </Box>
      ) : (
        tableRows.length > 0 && <ReportStatusSummary periodLabel={periodLabel} rows={tableRows} />
      )}

      <ReportStatusTable
        loading={loading}
        labelHeader={labelHeader}
        showCodeColumn={showCodeColumn}
        rows={tableRows}
      />
    </Box>
  )
}
