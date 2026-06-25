import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined'
import { useCallback, useEffect, useMemo, useState, Fragment } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { hexToRgba, ICS_PRIMARY } from '../../components/layout/DetailPagePrimitives'
import {
  ListDesktopOnly,
  ListMobileCard,
  ListMobileChipRow,
  ListMobileMeta,
  ListMobileOnly,
  ListMobileTitle,
  listPageRootSx,
  listTablePaperSx,
} from '../../components/layout/ListPagePrimitives'
import CyAllocationBreakdownGrid from '../../components/evaluations/CyAllocationBreakdownGrid'
import { cyAllocationApi, type CyAllocation } from '../../services/api'
import { useAppSelector } from '../../store/hooks'

const primaryDark = ICS_PRIMARY

function utilizationPct(used: number, contract: number) {
  if (contract <= 0) return 0
  return Math.min(100, Math.round((used / contract) * 100))
}

function SummaryCard({ label, value, color }: { label: string; value: string | number; color: string }) {
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
      <Typography variant="h5" sx={{ fontWeight: 800, color, mt: 0.5, fontSize: { xs: '1.35rem', sm: '1.5rem' } }}>
        {value}
      </Typography>
    </Paper>
  )
}

export default function CyAllocationPage() {
  const user = useAppSelector((s) => s.auth.user)
  const [searchParams] = useSearchParams()
  const preAdviceId = searchParams.get('preAdviceId')
  const [items, setItems] = useState<CyAllocation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    cyAllocationApi
      .list()
      .then(({ data }) => setItems(data))
      .catch(() => setError('Failed to load container yard allocations.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const summary = useMemo(() => {
    const totalContract = items.reduce((sum, i) => sum + i.contractTeu, 0)
    const totalUsed = items.reduce((sum, i) => sum + i.usedTeu, 0)
    const totalAvailable = items.reduce((sum, i) => sum + i.availableTeu, 0)
    const withSpace = items.filter((i) => i.hasCapacity).length
    return { totalContract, totalUsed, totalAvailable, withSpace, yards: items.length }
  }, [items])

  const shippingLineName = items[0]?.shippingLineName ?? user?.shippingLineId ? 'Your shipping line' : ''

  return (
    <Box sx={listPageRootSx}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3 },
          mb: 3,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${primaryDark} 0%, #0A3580 60%, #0C4DA8 100%)`,
          color: '#fff',
          boxShadow: '0 8px 24px rgba(11, 61, 145, 0.22)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', position: 'relative' }}>
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
            <WarehouseOutlinedIcon />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
              CY contract allocation
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.82)', mt: 0.5, maxWidth: 640 }}>
              {shippingLineName
                ? `Contract TEU capacity by container yard for ${shippingLineName}. Check available space before approving a pre-advice.`
                : 'Contract TEU capacity by container yard. Check available space before assigning a CY on approval.'}
            </Typography>
            {preAdviceId && (
              <Typography
                component={RouterLink}
                to={`/evaluations/${preAdviceId}`}
                sx={{
                  display: 'inline-block',
                  mt: 1.5,
                  color: '#fff',
                  fontWeight: 600,
                  textDecoration: 'underline',
                }}
              >
                ← Back to evaluation {preAdviceId}
              </Typography>
            )}
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, 1fr)' },
          gap: { xs: 1.5, sm: 2 },
          mb: 3,
          minWidth: 0,
        }}
      >
        <SummaryCard label="Container yards" value={summary.yards} color={primaryDark} />
        <SummaryCard label="Contract TEU" value={summary.totalContract} color="#0088B5" />
        <SummaryCard label="Used TEU" value={summary.totalUsed.toFixed(1)} color="#ED6C02" />
        <SummaryCard label="Available TEU" value={summary.totalAvailable.toFixed(1)} color="#2E7D32" />
      </Box>

      <Paper elevation={0} sx={listTablePaperSx}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress sx={{ color: primaryDark }} />
          </Box>
        ) : items.length === 0 ? (
          <Typography sx={{ py: 8, textAlign: 'center', color: 'text.secondary', px: 2 }}>
            No CY contracts configured for this shipping line. Ask an administrator to set up contract
            allocations in Master Data.
          </Typography>
        ) : (
          <>
            <ListMobileOnly>
              {items.map((row) => (
                <ListMobileCard key={row.depotId}>
                  <ListMobileTitle>{row.depotName}</ListMobileTitle>
                  <ListMobileMeta>{row.depotAddress}</ListMobileMeta>
                  <ListMobileChipRow>
                    <Chip
                      size="small"
                      label={`${row.availableTeu.toFixed(1)} TEU free`}
                      color={row.hasCapacity ? 'success' : 'error'}
                      sx={{ fontWeight: 600, maxWidth: '100%', height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal' } }}
                    />
                    <Chip
                      size="small"
                      label={`${row.usedTeu.toFixed(1)} / ${row.contractTeu} TEU`}
                      variant="outlined"
                      sx={{ fontWeight: 600, maxWidth: '100%', height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal' } }}
                    />
                    <Chip
                      size="small"
                      label={`${row.activeReturns} returns`}
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  </ListMobileChipRow>
                  <LinearProgress
                    variant="determinate"
                    value={utilizationPct(row.usedTeu, row.contractTeu)}
                    sx={{ mt: 1.5, height: 8, borderRadius: 4 }}
                  />
                  {row.breakdown.length > 0 && (
                    <Box sx={{ mt: 1.5, minWidth: 0 }}>
                      <CyAllocationBreakdownGrid rows={row.breakdown} compact />
                    </Box>
                  )}
                </ListMobileCard>
              ))}
            </ListMobileOnly>
            <ListDesktopOnly>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow
                      sx={{
                        bgcolor: hexToRgba(primaryDark, 0.04),
                        '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary', py: 1.75 },
                      }}
                    >
                      <TableCell>Container yard</TableCell>
                      <TableCell align="right">Contract (TEU)</TableCell>
                      <TableCell align="right">Used (TEU)</TableCell>
                      <TableCell align="right">Available (TEU)</TableCell>
                      <TableCell align="right">Active returns</TableCell>
                      <TableCell>Utilization</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((row) => {
                      const pct = utilizationPct(row.usedTeu, row.contractTeu)
                      return (
                        <Fragment key={row.depotId}>
                          <TableRow hover>
                            <TableCell>
                              <Typography sx={{ fontWeight: 700, color: primaryDark }}>{row.depotName}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {row.depotAddress}
                              </Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                              {row.contractTeu}
                            </TableCell>
                            <TableCell align="right">{row.usedTeu.toFixed(1)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: '#2E7D32' }}>
                              {row.availableTeu.toFixed(1)}
                            </TableCell>
                            <TableCell align="right">{row.activeReturns}</TableCell>
                            <TableCell sx={{ minWidth: 140 }}>
                              <LinearProgress
                                variant="determinate"
                                value={pct}
                                color={pct >= 90 ? 'error' : pct >= 70 ? 'warning' : 'primary'}
                                sx={{ height: 8, borderRadius: 4 }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {pct}% used
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={row.hasCapacity ? 'Space available' : 'Full / insufficient'}
                                color={row.hasCapacity ? 'success' : 'error'}
                                sx={{ fontWeight: 600 }}
                              />
                            </TableCell>
                          </TableRow>
                          {row.breakdown.length > 0 && (
                            <TableRow>
                              <TableCell colSpan={7} sx={{ py: 2, px: 3, bgcolor: 'rgba(11, 61, 145, 0.02)' }}>
                                <CyAllocationBreakdownGrid rows={row.breakdown} />
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </ListDesktopOnly>
          </>
        )}
      </Paper>
    </Box>
  )
}
