import { Box, Chip, LinearProgress, Paper, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined'
import { hexToRgba, ICS_PRIMARY } from '../layout/DetailPagePrimitives'
import type { CyAllocation, LogicteckCyLine } from '../../services/api'
import CyPipelineTeuInline, { CY_PIPELINE_COLORS } from './CyPipelineTeuInline'
import {
  breakdownAtYardTeu,
  breakdownCommittedTeu,
  breakdownConfirmedTeu,
  breakdownContractTeu,
  breakdownPreForecastTeu,
  cyUtilizationPctCapped,
  depotMonogram,
  formatUtilizationPctLabel,
  getAllocationReturnsLabel,
  getAllocationSizeLabel,
  getGroupBreakdownRow,
  progressBarColor,
} from '../../utils/cyAllocation'

interface CyYardAllocationCardProps {
  allocation: CyAllocation
  shippingLineCode: string
  shippingLineName: string
  /** Shipping-line page: one card per CY. Depot page: one card per line contracted at this CY. */
  perspective?: 'byYard' | 'byShippingLine'
  /** This yard's allocation is supplied by LOGICTECK. */
  logicteck?: boolean
  /** LOGICTECK allocation for the selected shipping line at this yard. */
  logicteckLine?: LogicteckCyLine | null
}

const primaryDark = ICS_PRIMARY

function PipelineRow({
  label,
  atYardTeu,
  confirmedTeu,
  preForecastTeu,
  limitTeu,
  atLimit = false,
  percent,
}: {
  label: string
  atYardTeu: number
  confirmedTeu: number
  preForecastTeu: number
  limitTeu: number
  atLimit?: boolean
  percent?: number
}) {
  if (limitTeu <= 0 && atYardTeu <= 0) return null

  const atYard = Math.round(atYardTeu)
  const committedTeu = atYard + Math.round(confirmedTeu) + Math.round(preForecastTeu)
  const pct = percent ?? cyUtilizationPctCapped(committedTeu, limitTeu)
  const over = committedTeu > limitTeu || pct >= 100 && limitTeu > 0 && committedTeu >= limitTeu

  return (
    <Box sx={{ mb: 1.75 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {label}
          </Typography>
          {atLimit && (
            <Chip
              label="AT LIMIT"
              size="small"
              sx={{
                height: 20,
                fontWeight: 800,
                fontSize: '0.65rem',
                bgcolor: '#FFEBEE',
                color: '#C62828',
              }}
            />
          )}
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 700, color: over ? '#C62828' : 'text.primary' }}>
          {percent != null
            ? over && committedTeu > limitTeu
              ? `${percent}% · over limit`
              : `${percent}%`
            : formatUtilizationPctLabel(committedTeu, limitTeu)}
        </Typography>
      </Box>
      <Box sx={{ mb: 0.75 }}>
        <Typography variant="body2" sx={{ lineHeight: 1.35 }}>
          <Box component="span" sx={{ fontWeight: 800, fontSize: '1.05rem', color: CY_PIPELINE_COLORS.atYard }}>
            {atYard}
          </Box>
          <Box component="span" sx={{ fontSize: '0.8125rem', color: 'text.secondary', fontWeight: 600, ml: 0.5 }}>
            TEU at yard
          </Box>
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, fontWeight: 500 }}>
          of {limitTeu} TEU contract
        </Typography>
        <CyPipelineTeuInline confirmedTeu={confirmedTeu} preForecastTeu={preForecastTeu} variant="inline" />
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 8,
          borderRadius: 4,
          bgcolor: hexToRgba(primaryDark, 0.08),
          '& .MuiLinearProgress-bar': {
            bgcolor: over ? '#D32F2F' : progressBarColor(pct),
            borderRadius: 4,
          },
        }}
      />
    </Box>
  )
}

export default function CyYardAllocationCard({
  allocation,
  shippingLineCode,
  shippingLineName,
  perspective = 'byYard',
  logicteck = allocation.isLogicteck,
  logicteckLine = null,
}: CyYardAllocationCardProps) {
  const headerMonogram =
    perspective === 'byShippingLine'
      ? (shippingLineCode || allocation.shippingLineCode || '—').slice(0, 4).toUpperCase()
      : depotMonogram(allocation.depotName)
  const headerTitle =
    perspective === 'byShippingLine' ? shippingLineName || allocation.shippingLineName : allocation.depotName
  const headerCaption =
    perspective === 'byShippingLine'
      ? ''
      : `${shippingLineCode || allocation.shippingLineCode} · ${shippingLineName || allocation.shippingLineName}`
  const row20 = getGroupBreakdownRow(allocation, '20')
  const row40 = getGroupBreakdownRow(allocation, '40')
  const teuAtYard = logicteckLine ? logicteckLine.teu.used : Math.round(allocation.atYardTeu)
  const teuConfirmed = logicteckLine ? 0 : Math.round(allocation.confirmedTeu)
  const teuPreForecast = logicteckLine
    ? logicteckLine.size20.pending + logicteckLine.size40.pending * 2
    : Math.round(allocation.preForecastTeu)
  const teuCommitted = logicteckLine ? logicteckLine.teu.used + teuPreForecast : Math.round(allocation.preAdvisedTeu)
  const teuLimit = logicteckLine ? logicteckLine.teu.limit : allocation.contractTeu
  const teuAtYard20 = logicteckLine ? logicteckLine.size20.inYard : breakdownAtYardTeu(row20)
  const teuAtYard40 = logicteckLine ? logicteckLine.size40.inYard * 2 : breakdownAtYardTeu(row40)
  const teuLimit20 = logicteckLine ? logicteckLine.size20.limit : breakdownContractTeu(row20)
  const teuLimit40 = logicteckLine ? logicteckLine.size40.limit * 2 : breakdownContractTeu(row40)
  const teuConfirmed20 = logicteckLine ? 0 : breakdownConfirmedTeu(row20)
  const teuConfirmed40 = logicteckLine ? 0 : breakdownConfirmedTeu(row40)
  const teuPreForecast20 = logicteckLine ? logicteckLine.size20.pending : breakdownPreForecastTeu(row20)
  const teuPreForecast40 = logicteckLine ? logicteckLine.size40.pending * 2 : breakdownPreForecastTeu(row40)
  const teuPct = logicteckLine
    ? Math.min(100, logicteckLine.teu.percent)
    : cyUtilizationPctCapped(teuCommitted, teuLimit)
  const teuOver = logicteckLine
    ? logicteckLine.teu.used > logicteckLine.teu.limit
    : teuLimit > 0 && teuCommitted > teuLimit
  const logicteckAtLimit = Boolean(
    logicteckLine &&
      (logicteckLine.size20.onHold ||
        logicteckLine.size40.onHold ||
        logicteckLine.size20.percent >= 100 ||
        logicteckLine.size40.percent >= 100 ||
        logicteckLine.teu.percent >= 100),
  )

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: teuOver ? '#EF5350' : 'divider',
        bgcolor: '#fff',
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          px: 2.5,
          pt: 2,
          pb: 1.5,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', lineHeight: 1.1 }}>
            {headerMonogram}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5, flexWrap: 'wrap' }}>
            <Typography sx={{ color: 'text.secondary', fontWeight: 500 }}>
              {headerTitle}
            </Typography>
            {logicteck && perspective !== 'byShippingLine' && (
              <Chip
                label="Logicteck"
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  bgcolor: hexToRgba(primaryDark, 0.08),
                  color: primaryDark,
                }}
              />
            )}
          </Box>
          {headerCaption ? (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary', fontWeight: 600 }}>
              {headerCaption}
            </Typography>
          ) : null}
        </Box>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: '#FAFBFC',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          {perspective === 'byShippingLine' ? (
            <LocalShippingOutlinedIcon sx={{ color: '#78909C' }} />
          ) : (
            <WarehouseOutlinedIcon sx={{ color: '#78909C' }} />
          )}
        </Box>
      </Box>

      <Box sx={{ px: 2.5, py: 2, flex: 1, borderTop: '1px solid', borderColor: '#EEF1F4' }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.06em' }}>
          {perspective === 'byShippingLine' ? 'ALLOCATION' : 'YARD UTILIZATION'}
        </Typography>

        <Box sx={{ mt: 1.25, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 0.75 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ lineHeight: 1.2 }}>
                <Box component="span" sx={{ fontWeight: 800, fontSize: '1.5rem', color: CY_PIPELINE_COLORS.atYard }}>
                  {teuAtYard}
                </Box>
                <Box component="span" sx={{ fontSize: '0.875rem', color: 'text.secondary', fontWeight: 600, ml: 0.5 }}>
                  TEU at yard
                </Box>
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35, fontWeight: 500 }}>
                of {teuLimit} TEU contract
              </Typography>
              <CyPipelineTeuInline
                confirmedTeu={teuConfirmed}
                preForecastTeu={teuPreForecast}
                variant="hero"
              />
            </Box>
            <Typography sx={{ fontWeight: 800, color: teuOver ? '#C62828' : 'text.primary', flexShrink: 0 }}>
              {logicteckLine
                ? teuOver
                  ? `${logicteckLine.teu.percent}% · over limit`
                  : `${logicteckLine.teu.percent}%`
                : formatUtilizationPctLabel(teuCommitted, teuLimit)}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={teuPct}
            sx={{
              height: 10,
              borderRadius: 5,
              bgcolor: hexToRgba(primaryDark, 0.08),
              '& .MuiLinearProgress-bar': {
                bgcolor: teuOver ? '#D32F2F' : progressBarColor(teuPct),
                borderRadius: 5,
              },
            }}
          />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 1.25,
              mt: 1.25,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: CY_PIPELINE_COLORS.atYard, display: 'block' }}>
                {getAllocationSizeLabel('20')}: {teuAtYard20} TEU at yard
              </Typography>
              <CyPipelineTeuInline
                confirmedTeu={teuConfirmed20}
                preForecastTeu={teuPreForecast20}
                variant="caption"
              />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: CY_PIPELINE_COLORS.atYard, display: 'block' }}>
                {getAllocationSizeLabel('40')}: {teuAtYard40} TEU at yard
              </Typography>
              <CyPipelineTeuInline
                confirmedTeu={teuConfirmed40}
                preForecastTeu={teuPreForecast40}
                variant="caption"
              />
            </Box>
          </Box>
        </Box>

        {(row20 || logicteckLine) && (
          <PipelineRow
            label={getAllocationReturnsLabel('20')}
            atYardTeu={teuAtYard20}
            confirmedTeu={teuConfirmed20}
            preForecastTeu={teuPreForecast20}
            limitTeu={teuLimit20}
            atLimit={
              logicteckLine
                ? logicteckLine.size20.onHold || logicteckLine.size20.percent >= 100
                : teuLimit20 > 0 && breakdownCommittedTeu(row20) >= teuLimit20
            }
            percent={logicteckLine ? logicteckLine.size20.percent : undefined}
          />
        )}
        {(row40 || logicteckLine) && (
          <PipelineRow
            label={getAllocationReturnsLabel('40')}
            atYardTeu={teuAtYard40}
            confirmedTeu={teuConfirmed40}
            preForecastTeu={teuPreForecast40}
            limitTeu={teuLimit40}
            atLimit={
              logicteckLine
                ? logicteckLine.size40.onHold || logicteckLine.size40.percent >= 100
                : teuLimit40 > 0 && breakdownCommittedTeu(row40) >= teuLimit40
            }
            percent={logicteckLine ? logicteckLine.size40.percent : undefined}
          />
        )}
      </Box>

      <Box
        sx={{
          px: 2.5,
          py: 1.25,
          borderTop: '1px solid',
          borderColor: '#EEF1F4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        <Chip
          size="small"
          label={
            (logicteckLine ? !logicteckAtLimit : allocation.hasCapacity)
              ? 'Space available'
              : 'At or over contract limit'
          }
          color={(logicteckLine ? !logicteckAtLimit : allocation.hasCapacity) ? 'success' : 'error'}
          sx={{ fontWeight: 700 }}
        />
        {perspective === 'byShippingLine' && allocation.shippingLineId > 0 && (
          <Typography
            component={RouterLink}
            to={`/depot/container-inventory?shippingLineId=${allocation.shippingLineId}`}
            variant="caption"
            sx={{ fontWeight: 700, color: primaryDark, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            View inventory
          </Typography>
        )}
      </Box>
    </Paper>
  )
}
