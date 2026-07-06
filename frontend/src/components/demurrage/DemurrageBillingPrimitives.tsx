import { Box, Chip, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { LIST_PRIMARY } from '../layout/ListPagePrimitives'
import type { DemurrageBilling } from '../../services/api'
import { formatDate, formatPeso } from '../../utils/datetime'
import { getBillingFeeLines } from './demurrageBillingUtils'

export const demurrageHeroSx = {
  p: { xs: 2.5, sm: 3 },
  mb: 3,
  borderRadius: 3,
  background: `linear-gradient(135deg, ${LIST_PRIMARY} 0%, #0A3580 60%, #0C4DA8 100%)`,
  color: '#fff',
  boxShadow: '0 8px 24px rgba(11, 61, 145, 0.22)',
  position: 'relative' as const,
  overflow: 'hidden' as const,
}

export const demurrageHeroOrbSx = {
  position: 'absolute' as const,
  right: -30,
  top: -30,
  width: 140,
  height: 140,
  borderRadius: '50%',
  bgcolor: 'rgba(255,255,255,0.06)',
}

export const demurrageTabsPaperSx = {
  mb: 2,
  borderRadius: 3,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: '#fff',
  boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
  overflow: 'hidden',
}

export function SummaryCard({
  label,
  value,
  subValue,
  color,
}: {
  label: string
  value: string | number
  subValue?: string
  color: string
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: '#fff',
        boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
        minWidth: 0,
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 600, lineHeight: 1.3, wordBreak: 'break-word', display: 'block' }}
      >
        {label}
      </Typography>
      <Typography
        variant="h5"
        sx={{
          fontWeight: 800,
          color,
          mt: 0.5,
          fontSize: { xs: '1.35rem', sm: '1.5rem' },
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </Typography>
      {subValue && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          {subValue}
        </Typography>
      )}
    </Paper>
  )
}

export function DemurrageFeeBreakdown({
  item,
  compact,
}: {
  item: DemurrageBilling
  compact?: boolean
}) {
  const lines = getBillingFeeLines(item)

  if (compact && lines.length <= 2 && lines.every((l) => ['Demurrage', 'Detention'].includes(l.description))) {
    return (
      <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {formatPeso(item.totalAmount)}
      </Typography>
    )
  }

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: LIST_PRIMARY }}>
        {formatPeso(item.totalAmount)}
      </Typography>
      <Box
        component="ul"
        sx={{
          m: 0,
          mt: 0.5,
          pl: 2,
          '& li': { fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.5 },
        }}
      >
        {lines.map((line) => (
          <Box component="li" key={`${line.description}-${line.sortOrder}`}>
            {line.description}: {formatPeso(line.amount)}
          </Box>
        ))}
      </Box>
    </Box>
  )
}

export function DemurrageFeeTable({ lines }: { lines: ReturnType<typeof getBillingFeeLines> }) {
  return (
    <Table size="small" sx={{ '& td, & th': { borderColor: 'divider', py: 1 } }}>
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 700, color: 'text.secondary', width: '65%' }}>Fee</TableCell>
          <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary' }}>
            Amount
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {lines.map((line) => (
          <TableRow key={`${line.description}-${line.sortOrder}`}>
            <TableCell>{line.description}</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {formatPeso(line.amount)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function BillingContextCard({
  referenceNo,
  containerNo,
  truckerName,
  validUntil,
  daysOverdue,
}: {
  referenceNo?: string
  containerNo?: string
  truckerName?: string
  validUntil?: string
  daysOverdue?: number
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mb: 2,
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'grey.50',
      }}
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {referenceNo && (
          <Chip label={referenceNo} size="small" sx={{ fontFamily: 'monospace', fontWeight: 700 }} />
        )}
        {containerNo && <Chip label={containerNo} size="small" variant="outlined" sx={{ fontWeight: 700 }} />}
        {truckerName && <Chip label={truckerName} size="small" variant="outlined" />}
        {validUntil && (
          <Chip
            label={`Expired ${formatDate(validUntil)}${daysOverdue ? ` · ${daysOverdue}d overdue` : ''}`}
            size="small"
            color="warning"
            sx={{ fontWeight: 600 }}
          />
        )}
      </Box>
    </Paper>
  )
}

export function DialogTotalBar({ total, label = 'Total due' }: { total: number; label?: string }) {
  return (
    <Box
      sx={{
        mt: 2,
        p: 2,
        borderRadius: 2.5,
        bgcolor: 'grey.50',
        border: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 800, color: LIST_PRIMARY, fontVariantNumeric: 'tabular-nums' }}>
        {formatPeso(total)}
      </Typography>
    </Box>
  )
}

export function DemurrageHero({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <Paper elevation={0} sx={demurrageHeroSx}>
      <Box sx={demurrageHeroOrbSx} />
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
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
            {icon}
          </Box>
          <Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' }, textWrap: 'balance' }}
            >
              {title}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.82)', mt: 0.5, maxWidth: 560, textWrap: 'pretty' }}>
              {description}
            </Typography>
          </Box>
        </Box>
        {action}
      </Box>
    </Paper>
  )
}
