import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { Box, Button, Paper, Typography } from '@mui/material'
import type { PreAdvice, PreAdviceDocument } from '../../services/api'
import { getPreAdviceContainerUnit } from '../../utils/preAdviceContainerUnit'
import { preAdviceUnitRoleLabel, preAdviceUnitSectionSx } from './preAdviceUnitSectionSx'
import {
  unitIdentityPhotoProgress,
  unitIdentityPhotosComplete,
  type PreAdviceIdentityUnit,
} from '../../utils/preAdviceIdentityUnit'
import type { PreAdviceDetailTab } from './PreAdviceDetailTabPanels'

type Props = {
  item: PreAdvice
  documents: PreAdviceDocument[]
  showActionHints: boolean
  onOpenPhotoTab: (tab: PreAdviceDetailTab) => void
}

function ContainerPhotoCard({
  variant,
  containerNo,
  sizeTypeLine,
  uploaded,
  total,
  needsAction,
  onOpen,
}: {
  variant: 'primary' | 'companion'
  containerNo: string
  sizeTypeLine: string
  uploaded: number
  total: number
  needsAction: boolean
  onOpen: () => void
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        ...preAdviceUnitSectionSx(variant),
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'center' },
        justifyContent: 'space-between',
        gap: 2,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
          {preAdviceUnitRoleLabel(variant)}
          {needsAction ? ' · Incomplete' : ' · Complete'}
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: 'monospace', letterSpacing: 0.3 }}>
          {containerNo}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
          {sizeTypeLine} · {uploaded}/{total} photos
        </Typography>
      </Box>
      <Button
        variant="outlined"
        size="small"
        endIcon={<ChevronRightIcon />}
        onClick={onOpen}
        sx={{
          fontWeight: 600,
          borderRadius: 2,
          textTransform: 'none',
          whiteSpace: 'nowrap',
          alignSelf: { xs: 'stretch', sm: 'center' },
        }}
      >
        {needsAction ? 'Open photos' : 'View photos'}
      </Button>
    </Paper>
  )
}

export default function PreAdvicePhotosOverviewCards({
  item,
  documents,
  showActionHints,
  onOpenPhotoTab,
}: Props) {
  const units: { unit: PreAdviceIdentityUnit; variant: 'primary' | 'companion'; tab: PreAdviceDetailTab }[] =
    [
      {
        unit: 'Primary',
        variant: 'primary',
        tab: item.isBackToBack ? 'photos-primary' : 'photos',
      },
    ]

  if (item.isBackToBack) {
    units.push({ unit: 'Companion', variant: 'companion', tab: 'photos-companion' })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {units.map(({ unit, variant, tab }) => {
        const meta = getPreAdviceContainerUnit(item, unit)
        const progress = unitIdentityPhotoProgress(documents, [], unit)
        const needs = showActionHints && !unitIdentityPhotosComplete(documents, [], unit)

        return (
          <ContainerPhotoCard
            key={unit}
            variant={variant}
            containerNo={meta.containerNo}
            sizeTypeLine={meta.sizeTypeLine}
            uploaded={progress.uploaded}
            total={progress.total}
            needsAction={needs}
            onOpen={() => onOpenPhotoTab(tab)}
          />
        )
      })}
    </Box>
  )
}
