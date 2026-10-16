import { Alert, Box, Button, Chip, Link, Paper, Typography } from '@mui/material'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useLocation, useSearchParams } from 'react-router-dom'
import ContainerIdentityPhotos from '../../components/preAdvice/ContainerIdentityPhotos'
import LogicteckContainerPhotoGallery from '../../components/inventory/LogicteckContainerPhotoGallery'
import InventoryFootprintBadge, {
  inventoryFootprintFromSource,
} from '../../components/inventory/InventoryFootprintBadge'
import {
  DetailBackButton,
  DetailHero,
  DetailLoadingState,
  InfoTile,
  sectionPaperSx,
} from '../../components/layout/DetailPagePrimitives'
import { ICS_PRIMARY } from '../../theme/colors'
import {
  containerInventoryApi,
  type ContainerInventoryDetail,
  type ContainerInventoryItem,
  type PreAdviceDocument,
} from '../../services/api'
import { formatDisplayDate } from '../../utils/datetime'
import { formatInventorySizeLabel } from '../../utils/inventorySummary'
import { getShippingLineFullName } from '../../utils/shippingLine'
import { inventoryDetailBasePath, parseInventoryDetailQuery, type InventoryDetailScope } from '../../utils/inventoryDetailRoute'
import { INVENTORY_SOURCE_LABELS } from '../../utils/inventorySummary'

function resolveScope(pathname: string): InventoryDetailScope {
  return pathname.startsWith('/depot/') ? 'depot' : 'evaluator'
}

function dwellLabel(days: number): string {
  return days === 1 ? '1 day' : `${days} days`
}

function complianceLabel(status: ContainerInventoryItem['complianceStatus']): string {
  switch (status) {
    case 'WithinLimit':
      return 'Within limit'
    case 'ApproachingLimit':
      return 'Approaching limit'
    case 'Overstay':
      return 'Overstay'
    case 'Released':
      return 'Released'
    default:
      return status
  }
}

export default function ContainerInventoryDetailPage() {
  const location = useLocation()
  const scope = resolveScope(location.pathname)
  const listPath = inventoryDetailBasePath(scope).replace('/detail', '')
  const [searchParams] = useSearchParams()
  const query = useMemo(() => parseInventoryDetailQuery(searchParams), [searchParams])

  const [detail, setDetail] = useState<ContainerInventoryDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!query.source) {
      setError('Missing inventory reference.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    containerInventoryApi
      .detail({
        source: query.source,
        scheduleId: query.scheduleId,
        manualEntryId: query.manualEntryId,
        containerNo: query.containerNo,
        depotId: query.depotId,
        shippingLineId: query.shippingLineId,
      })
      .then(({ data }) => setDetail(data))
      .catch(() => setError('Could not load container details.'))
      .finally(() => setLoading(false))
  }, [query])

  const item = detail?.item
  const icsPhotos: PreAdviceDocument[] = detail?.icsPhotos ?? []
  const logicteckPhotos = detail?.logicteckPhotos ?? []
  const photoFootprint =
    detail?.photoFootprintSource ?? detail?.footprintSource ?? (item ? inventoryFootprintFromSource(item.source) : 'ICS')
  const footprint = detail?.footprintSource ?? (item ? inventoryFootprintFromSource(item.source) : 'ICS')
  const icsPreAdviceId = item?.preAdviceId ?? null

  if (loading) {
    return <DetailLoadingState showTabs={false} infoTiles={6} sections={2} />
  }

  if (error || !item) {
    return (
      <Box sx={{ p: 3 }}>
        <DetailBackButton to={listPath} label="Back to CY inventory" />
        <Alert severity="error" sx={{ mt: 2 }}>{error || 'Container not found.'}</Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ pb: 4 }}>
      <DetailBackButton to={listPath} label="Back to CY inventory" />

      <DetailHero
        icon={<Inventory2OutlinedIcon />}
        title={item.containerNo}
        subtitle={`${item.depotName} · ${getShippingLineFullName(item.shippingLineCode, item.shippingLineName)}`}
        chips={
          <>
            <InventoryFootprintBadge footprint={footprint} />
            <Chip
              size="small"
              label={item.yardStatus === 'Released' ? 'Released' : 'At yard'}
              color={item.yardStatus === 'Released' ? 'info' : 'success'}
              variant={item.yardStatus === 'Released' ? 'filled' : 'outlined'}
              sx={{ fontWeight: 600 }}
            />
          </>
        }
      />

      <Paper elevation={0} sx={sectionPaperSx}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
          Yard record
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
            gap: 2,
          }}
        >
          <InfoTile label="Size / type" value={`${formatInventorySizeLabel(item.containerSize)} ${item.containerType}`} />
          <InfoTile label="Yard-in date" value={formatDisplayDate(item.yardInDate)} />
          <InfoTile label="Gate-in slot" value={item.gateInTime ?? '—'} />
          <InfoTile label="Dwell time" value={dwellLabel(item.dwellDays)} />
          <InfoTile label="Compliance" value={complianceLabel(item.complianceStatus)} />
          <InfoTile label="Trucker" value={item.truckerName?.trim() || '—'} />
          <InfoTile label="Record type" value={INVENTORY_SOURCE_LABELS[item.source] ?? item.source} />
          <InfoTile
            label="Pre-forecast / ref."
            value={
              item.preAdviceId ? (
                <Link component={RouterLink} to={`/evaluations/${item.preAdviceId}`} sx={{ fontWeight: 600 }}>
                  {item.referenceNo}
                </Link>
              ) : (
                item.referenceNo || '—'
              )
            }
          />
          <InfoTile label="Remarks" value={item.remarks?.trim() || '—'} />
        </Box>
      </Paper>

      {detail.extraFields.length > 0 && (
        <Paper elevation={0} sx={sectionPaperSx}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
            LOGICTECK feed details
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
              gap: 2,
            }}
          >
            {detail.extraFields.map((field) => (
              <InfoTile key={field.label} label={field.label} value={field.value} />
            ))}
          </Box>
        </Paper>
      )}

      <Paper elevation={0} sx={sectionPaperSx}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          Container photos
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {photoFootprint === 'LOGICTECK'
            ? 'Container photos from LOGICTECK (yard identity capture). ICS pre-forecast uploads are not shown on LOGICTECK footprint records.'
            : 'Container photos from ICS (pre-forecast identity and damage uploads).'}
        </Typography>
        {photoFootprint === 'LOGICTECK' ? (
          <LogicteckContainerPhotoGallery photos={logicteckPhotos} />
        ) : icsPhotos.length > 0 && icsPreAdviceId ? (
          <ContainerIdentityPhotos preAdviceId={icsPreAdviceId} documents={icsPhotos} canManage={false} />
        ) : icsPreAdviceId ? (
          <Button component={RouterLink} to={`/evaluations/${icsPreAdviceId}`} variant="outlined" sx={{ fontWeight: 600 }}>
            Open pre-forecast for photos
          </Button>
        ) : (
          <Typography variant="body2" color="text.secondary">No ICS photos on file for this inventory record.</Typography>
        )}
      </Paper>

      {item.yardStatus === 'Released' && item.releaseReferenceNo && (
        <Paper elevation={0} sx={{ ...sectionPaperSx, borderColor: 'info.light' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: ICS_PRIMARY }}>
            Released
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {item.releaseWithdrawalId ? (
              <Link component={RouterLink} to={`/evaluations/atw/${item.releaseWithdrawalId}`} sx={{ fontWeight: 600 }}>
                {item.releaseReferenceNo}
              </Link>
            ) : (
              item.releaseReferenceNo
            )}
          </Typography>
        </Paper>
      )}
    </Box>
  )
}
