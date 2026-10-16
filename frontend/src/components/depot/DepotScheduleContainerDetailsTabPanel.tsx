import { Box, Chip, Stack, Typography } from '@mui/material'
import { hexToRgba, ICS_PRIMARY } from '../layout/DetailPagePrimitives'
import type { Evaluation, PreAdvice, Schedule } from '../../services/api'
import { backToBackUnitFieldLabel } from '../preAdvice/preAdviceUnitSectionSx'
import { getPreAdviceContainerUnit } from '../../utils/preAdviceContainerUnit'
import { formatDateTime, formatScheduleDate, formatArrivalWindow, formatScheduleTimeHundreds } from '../../utils/datetime'
import { scheduleStatusLabel } from '../../utils/scheduleStatus'
import {
  EvaluationField,
  EvaluationFieldColumn,
  EvaluationTabFooter,
  EvaluationTwoColumnBody,
} from '../evaluations/EvaluationDetailFieldGrid'

const unitDetailsGridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  gap: { xs: 1.5, sm: 2 },
  alignItems: 'start',
} as const

const sectionDividerSx = {
  pt: 2,
  mt: 0.5,
  borderTop: '1px solid',
  borderColor: hexToRgba(ICS_PRIMARY, 0.12),
} as const

type DepotScheduleContainerDetailsTabPanelProps = {
  schedule: Schedule
  preAdvice: PreAdvice
  evaluation: Evaluation | null
  truckerName: string
  depotRemarksDraft?: string
}

function BackToBackUnitScheduleBlock({
  variant,
  preAdvice,
  schedule,
  cyName,
  freeUntil,
  showReturnAssignment,
  showDivider,
}: {
  variant: 'primary' | 'companion'
  preAdvice: PreAdvice
  schedule: Schedule
  cyName: string
  freeUntil: string | null | undefined
  showReturnAssignment: boolean
  showDivider?: boolean
}) {
  const unit = getPreAdviceContainerUnit(preAdvice, variant === 'primary' ? 'Primary' : 'Companion')

  return (
    <Box sx={showDivider ? sectionDividerSx : undefined}>
      <EvaluationFieldColumn title={backToBackUnitFieldLabel(variant, unit.containerNo)}>
        <Box sx={unitDetailsGridSx}>
          <EvaluationField label="Assigned CY" value={cyName} />
          <EvaluationField
            label="Free time valid until"
            value={freeUntil ? formatScheduleDate(freeUntil) : '—'}
          />
          {showReturnAssignment ? (
            <>
              <EvaluationField label="Return date" value={formatScheduleDate(schedule.date)} />
              <EvaluationField label="Return time" value={formatScheduleTimeHundreds(schedule.time)} />
              <EvaluationField
                label="Arrival window"
                value={formatArrivalWindow(schedule.date, schedule.time)}
                span={2}
              />
            </>
          ) : null}
        </Box>
      </EvaluationFieldColumn>
    </Box>
  )
}

export default function DepotScheduleContainerDetailsTabPanel({
  schedule,
  preAdvice,
  evaluation,
  truckerName,
  depotRemarksDraft = '',
}: DepotScheduleContainerDetailsTabPanelProps) {
  const depotRemarks = schedule.depotRemarks?.trim() || depotRemarksDraft.trim()
  const hasRemarks = Boolean(preAdvice.remarks?.trim()) || Boolean(depotRemarks)
  const hasAssignment = Boolean(schedule.date && schedule.status !== 'WaitingSchedule')
  const b2b = Boolean(preAdvice.isBackToBack)

  const companionCyName =
    evaluation?.companionDepotName?.trim() || schedule.depotName

  return (
    <Stack spacing={2.5}>
      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: ICS_PRIMARY }}>
        Container details
      </Typography>

      {b2b ? (
        <Stack spacing={0}>
          <EvaluationFieldColumn title="Request">
            <Box sx={unitDetailsGridSx}>
              <EvaluationField label="Reference no." value={schedule.referenceNo} mono />
              <EvaluationField label="Requesting trucker" value={truckerName} />
              <EvaluationField label="Shipping line" value={preAdvice.shippingLineName} />
              <EvaluationField
                label="Status"
                value={
                  <Chip
                    label={scheduleStatusLabel(schedule.status)}
                    size="small"
                    color={schedule.status === 'WaitingSchedule' ? 'warning' : 'default'}
                    sx={{ fontWeight: 600 }}
                  />
                }
              />
              <EvaluationField label="Submitted" value={formatDateTime(preAdvice.createdAt)} span={2} />
            </Box>
          </EvaluationFieldColumn>

          <BackToBackUnitScheduleBlock
            variant="primary"
            preAdvice={preAdvice}
            schedule={schedule}
            cyName={schedule.depotName}
            freeUntil={preAdvice.demurrageValidUntil}
            showReturnAssignment={hasAssignment}
            showDivider
          />
          <BackToBackUnitScheduleBlock
            variant="companion"
            preAdvice={preAdvice}
            schedule={schedule}
            cyName={companionCyName}
            freeUntil={preAdvice.backToBackCompanionDemurrageValidUntil}
            showReturnAssignment={hasAssignment}
            showDivider
          />
        </Stack>
      ) : (
        <>
          <EvaluationTwoColumnBody
            left={
              <EvaluationFieldColumn title="Return depot & free time">
                <EvaluationField label="Reference no." value={schedule.referenceNo} mono />
                <EvaluationField label="Depot (CY)" value={schedule.depotName} />
                <EvaluationField
                  label="Free time valid until"
                  value={
                    preAdvice.demurrageValidUntil
                      ? formatScheduleDate(preAdvice.demurrageValidUntil)
                      : '—'
                  }
                />
              </EvaluationFieldColumn>
            }
            right={
              <EvaluationFieldColumn title="Request & schedule">
                <EvaluationField label="Requesting trucker" value={truckerName} />
                <EvaluationField label="Shipping line" value={preAdvice.shippingLineName} />
                <EvaluationField
                  label="Status"
                  value={
                    <Chip
                      label={scheduleStatusLabel(schedule.status)}
                      size="small"
                      color={schedule.status === 'WaitingSchedule' ? 'warning' : 'default'}
                      sx={{ fontWeight: 600 }}
                    />
                  }
                />
                <EvaluationField label="Submitted" value={formatDateTime(preAdvice.createdAt)} />
              </EvaluationFieldColumn>
            }
          />

          {hasAssignment && (
            <Box sx={sectionDividerSx}>
              <EvaluationFieldColumn title="Return assignment">
                <EvaluationField label="Return date" value={formatScheduleDate(schedule.date)} />
                <EvaluationField label="Return time" value={formatScheduleTimeHundreds(schedule.time)} />
                <EvaluationField
                  label="Arrival window"
                  value={formatArrivalWindow(schedule.date, schedule.time)}
                />
              </EvaluationFieldColumn>
            </Box>
          )}
        </>
      )}

      {hasRemarks ? (
        <EvaluationTabFooter>
          {preAdvice.remarks?.trim() && (
            <EvaluationField label="Trucker remarks" value={preAdvice.remarks.trim()} />
          )}
          {depotRemarks && <EvaluationField label="Depot remarks" value={depotRemarks} />}
        </EvaluationTabFooter>
      ) : null}
    </Stack>
  )
}
