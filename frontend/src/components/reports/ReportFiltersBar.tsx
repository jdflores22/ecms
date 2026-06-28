import {
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import FilterListIcon from '@mui/icons-material/FilterList'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined'
import type { ReactNode } from 'react'
import type { ReportTabId } from '../../config/reportConfig'
import type { Depot } from '../../services/api'
import { shiftIsoDate, todayIsoDate } from '../../utils/datetime'
import { hexToRgba, ICS_PRIMARY } from '../layout/DetailPagePrimitives'

const TAB_ICONS: Record<ReportTabId, ReactNode> = {
  daily: <CalendarTodayOutlinedIcon fontSize="small" />,
  monthly: <CalendarMonthOutlinedIcon fontSize="small" />,
  shippingLines: <LocalShippingOutlinedIcon fontSize="small" />,
  depots: <WarehouseOutlinedIcon fontSize="small" />,
}

interface ReportFiltersBarProps {
  tabs: { id: ReportTabId; label: string }[]
  tabIndex: number
  onTabChange: (index: number) => void
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
  loading: boolean
  onRefresh: () => void
}

function startOfCurrentMonth(): string {
  const today = todayIsoDate()
  return `${today.slice(0, 7)}-01`
}

export default function ReportFiltersBar({
  tabs,
  tabIndex,
  onTabChange,
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
      <Tabs
        value={tabIndex}
        onChange={(_, v) => onTabChange(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          px: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: hexToRgba(ICS_PRIMARY, 0.02),
          '& .MuiTab-root': {
            fontWeight: 600,
            textTransform: 'none',
            minHeight: 48,
            gap: 0.75,
          },
          '& .Mui-selected': { color: ICS_PRIMARY },
          '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0', bgcolor: '#00A3E0' },
        }}
      >
        {tabs.map((t) => (
          <Tab key={t.id} icon={TAB_ICONS[t.id]} iconPosition="start" label={t.label} />
        ))}
      </Tabs>

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
