import {
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import FilterListIcon from '@mui/icons-material/FilterList'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined'
import type { ReactElement } from 'react'
import type { ReportTabId } from '../../config/reportConfig'
import type { Depot, ReportShippingLineOption } from '../../services/api'
import { shiftIsoDate, todayIsoDate } from '../../utils/datetime'
import { hexToRgba, ICS_PRIMARY } from '../layout/DetailPagePrimitives'

const TAB_ICONS: Record<ReportTabId, ReactElement> = {
  daily: <CalendarTodayOutlinedIcon fontSize="small" />,
  monthly: <CalendarMonthOutlinedIcon fontSize="small" />,
  shippingLines: <LocalShippingOutlinedIcon fontSize="small" />,
  depots: <WarehouseOutlinedIcon fontSize="small" />,
}

interface ReportFiltersBarProps {
  tabs: { id: ReportTabId; label: string }[]
  selectedTabId: ReportTabId
  onTabIdChange: (id: ReportTabId) => void
  usesDateRange: boolean
  from: string
  to: string
  year: number
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  onYearChange: (value: number) => void
  showDepotFilter: boolean
  depotId: number | ''
  depots: Depot[]
  onDepotChange: (value: number | '') => void
  showShippingLineFilter: boolean
  shippingLineId: number | ''
  shippingLines: ReportShippingLineOption[]
  onShippingLineChange: (value: number | '') => void
  loading: boolean
  onRefresh: () => void
}

function startOfCurrentMonth(): string {
  const today = todayIsoDate()
  return `${today.slice(0, 7)}-01`
}

export default function ReportFiltersBar({
  tabs,
  selectedTabId,
  onTabIdChange,
  usesDateRange,
  from,
  to,
  year,
  onFromChange,
  onToChange,
  onYearChange,
  showDepotFilter,
  depotId,
  depots,
  onDepotChange,
  showShippingLineFilter,
  shippingLineId,
  shippingLines,
  onShippingLineChange,
  loading,
  onRefresh,
}: ReportFiltersBarProps) {
  const applyPreset = (presetFrom: string, presetTo: string) => {
    onFromChange(presetFrom)
    onToChange(presetTo)
  }

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 2.5,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: '#fff',
        boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              bgcolor: hexToRgba(ICS_PRIMARY, 0.08),
              color: ICS_PRIMARY,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <FilterListIcon fontSize="small" />
          </Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Filters
          </Typography>
        </Box>

        {usesDateRange && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            <Chip
              size="small"
              label="Last 7 days"
              onClick={() => applyPreset(shiftIsoDate(todayIsoDate(), -6), todayIsoDate())}
              sx={{ fontWeight: 600 }}
            />
            <Chip
              size="small"
              label="Last 30 days"
              onClick={() => applyPreset(shiftIsoDate(todayIsoDate(), -29), todayIsoDate())}
              sx={{ fontWeight: 600 }}
            />
            <Chip
              size="small"
              label="This month"
              onClick={() => applyPreset(startOfCurrentMonth(), todayIsoDate())}
              sx={{ fontWeight: 600 }}
            />
          </Box>
        )}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end' }}>
          {tabs.length > 1 && (
            <FormControl
              size="small"
              sx={{ minWidth: { xs: '100%', sm: 220 }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            >
              <InputLabel>Report type</InputLabel>
              <Select
                label="Report type"
                value={selectedTabId}
                onChange={(e) => onTabIdChange(e.target.value as ReportTabId)}
              >
                {tabs.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {TAB_ICONS[t.id]}
                      {t.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {usesDateRange ? (
            <>
              <TextField
                label="From"
                type="date"
                size="small"
                value={from}
                onChange={(e) => onFromChange(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ flex: { xs: '1 1 140px', sm: '0 0 auto' }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <TextField
                label="To"
                type="date"
                size="small"
                value={to}
                onChange={(e) => onToChange(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ flex: { xs: '1 1 140px', sm: '0 0 auto' }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </>
          ) : (
            <TextField
              label="Year"
              type="number"
              size="small"
              value={year}
              onChange={(e) => onYearChange(Number(e.target.value))}
              sx={{ width: 120, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          )}
          {showShippingLineFilter && (
            <FormControl
              size="small"
              sx={{ minWidth: { xs: '100%', sm: 240 }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            >
              <InputLabel>Shipping line</InputLabel>
              <Select
                label="Shipping line"
                value={shippingLineId}
                onChange={(e) => onShippingLineChange(e.target.value as number | '')}
              >
                <MenuItem value="">All shipping lines</MenuItem>
                {shippingLines.map((line) => (
                  <MenuItem key={line.id} value={line.id}>
                    {line.code} — {line.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {showDepotFilter && (
            <FormControl
              size="small"
              sx={{ minWidth: { xs: '100%', sm: 200 }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            >
              <InputLabel>Depot</InputLabel>
              <Select
                label="Depot"
                value={depotId}
                onChange={(e) => onDepotChange(e.target.value as number | '')}
              >
                <MenuItem value="">All depots</MenuItem>
                {depots.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            disabled={loading}
            sx={{ fontWeight: 600, borderRadius: 2, minHeight: 40, px: 2.5 }}
          >
            Apply
          </Button>
        </Box>
      </Box>
    </Paper>
  )
}
