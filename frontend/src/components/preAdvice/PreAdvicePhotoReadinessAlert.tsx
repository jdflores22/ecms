import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { Box, Button, Chip, LinearProgress, Paper, Typography } from '@mui/material'
import type { PreAdvice } from '../../services/api'
import { getPreAdviceContainerUnit } from '../../utils/preAdviceContainerUnit'
import { sectionPaperSx } from '../layout/DetailPagePrimitives'
import { ICS_PRIMARY } from '../../theme/colors'
import { preAdviceUnitRoleLabel, preAdviceUnitSectionSx, preAdviceUnitChipSx } from './preAdviceUnitSectionSx'
import type { PreAdviceDetailTab } from './PreAdviceDetailTabPanels'

export type PreAdvicePhotoReadiness = {
  resubmit: boolean
  uploaded: number
  total: number
  perUnitTotal: number
  primaryUploaded: number
  primaryMissing: number
  companionUploaded: number
  companionMissing: number
  croComplete: boolean
}

type Props = {
  item: PreAdvice
  readiness: PreAdvicePhotoReadiness
  onOpenPhotoTab: (tab: PreAdviceDetailTab) => void
  onOpenRequestDetails: () => void
}

function UnitRow({
  variant,
  containerNo,
  sizeTypeLine,
  uploaded,
  total,
  missing,
  onOpen,
}: {
  variant: 'primary' | 'companion'
  containerNo: string
  sizeTypeLine: string
  uploaded: number
  total: number
  missing: number
  onOpen: () => void
}) {
  const complete = missing === 0
  const pct = total > 0 ? Math.round((uploaded / total) * 100) : 0

  return (
    <Box sx={{ ...preAdviceUnitSectionSx(variant), flex: 1, minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.75 }}>
        {preAdviceUnitRoleLabel(variant)}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: 'monospace', letterSpacing: 0.3, mb: 0.25 }}>
        {containerNo}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {sizeTypeLine}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 6,
          borderRadius: 3,
          mb: 1,
          bgcolor: 'action.hover',
          '& .MuiLinearProgress-bar': { bgcolor: complete ? 'success.main' : ICS_PRIMARY },
        }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        {uploaded} of {total} photos
        {!complete ? ` · ${missing} remaining` : ' · Complete'}
      </Typography>
      <Button
        size="small"
        variant="outlined"
        endIcon={<ChevronRightIcon />}
        onClick={onOpen}
        sx={{ fontWeight: 600, borderRadius: 2, textTransform: 'none' }}
      >
        {complete ? 'Open photos' : 'Continue upload'}
      </Button>
    </Box>
  )
}

export default function PreAdvicePhotoReadinessAlert({
  item,
  readiness,
  onOpenPhotoTab,
  onOpenRequestDetails,
}: Props) {
  const title = readiness.resubmit ? 'Photos needed before resubmit' : 'Photos needed before submit'

  return (
    <Paper elevation={0} sx={{ ...sectionPaperSx, mb: 2 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 1, mb: 0.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Chip
          label={`${readiness.uploaded}/${readiness.total} overall`}
          size="small"
          sx={preAdviceUnitChipSx}
        />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, maxWidth: 640 }}>
        {item.isBackToBack
          ? 'Upload identity photos in each container tab above. Keep primary and companion files separate.'
          : 'Upload all required container views in the photos tab.'}
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
          mb: readiness.croComplete ? 0 : 2,
        }}
      >
        <UnitRow
          variant="primary"
          containerNo={getPreAdviceContainerUnit(item, 'Primary').containerNo}
          sizeTypeLine={getPreAdviceContainerUnit(item, 'Primary').sizeTypeLine}
          uploaded={readiness.primaryUploaded}
          total={readiness.perUnitTotal}
          missing={readiness.primaryMissing}
          onOpen={() => onOpenPhotoTab(item.isBackToBack ? 'photos-primary' : 'photos')}
        />
        {item.isBackToBack && (
          <UnitRow
            variant="companion"
            containerNo={getPreAdviceContainerUnit(item, 'Companion').containerNo}
            sizeTypeLine={getPreAdviceContainerUnit(item, 'Companion').sizeTypeLine}
            uploaded={readiness.companionUploaded}
            total={readiness.perUnitTotal}
            missing={readiness.companionMissing}
            onOpen={() => onOpenPhotoTab('photos-companion')}
          />
        )}
      </Box>

      {!readiness.croComplete && (
        <Box
          sx={{
            pt: 2,
            mt: 0.5,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 1.5,
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            CRO/eDO copies are attached under <strong>Request details</strong> for each container.
          </Typography>
          <Button
            size="small"
            variant="text"
            onClick={onOpenRequestDetails}
            sx={{ fontWeight: 600, textTransform: 'none', flexShrink: 0 }}
          >
            Request details
          </Button>
        </Box>
      )}
    </Paper>
  )
}
