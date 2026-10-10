import { Box, Chip } from '@mui/material'
import { hexToRgba, ICS_PRIMARY } from '../layout/DetailPagePrimitives'
import type { PreAdvice, Schedule } from '../../services/api'
import { formatDateTime, formatScheduleDate, formatArrivalWindow, formatScheduleTimeHundreds } from '../../utils/datetime'
import { formatContainerSizeLabel } from '../../utils/containerSize'
import { scheduleStatusLabel } from '../../utils/scheduleStatus'
import {
  EvaluationField,
  EvaluationFieldColumn,
  EvaluationTabFooter,
  EvaluationTabShell,
  EvaluationTwoColumnBody,
} from '../evaluations/EvaluationDetailFieldGrid'

type DepotScheduleContainerDetailsTabPanelProps = {
  schedule: Schedule
  preAdvice: PreAdvice
  truckerName: string
  depotRemarksDraft?: string
}

export default function DepotScheduleContainerDetailsTabPanel({
  schedule,
  preAdvice,
  truckerName,
  depotRemarksDraft = '',
}: DepotScheduleContainerDetailsTabPanelProps) {
  const depotRemarks = schedule.depotRemarks?.trim() || depotRemarksDraft.trim()
  const hasRemarks = Boolean(preAdvice.remarks?.trim()) || Boolean(depotRemarks)
  const hasAssignment = Boolean(schedule.date && schedule.status !== 'WaitingSchedule')

  return (
    <EvaluationTabShell title="Container details">
      <EvaluationTwoColumnBody
        left={
          <EvaluationFieldColumn title="Container">
            <EvaluationField label="Reference no." value={schedule.referenceNo} mono />
            <EvaluationField label="Container number" value={preAdvice.containerNo} mono />
            <EvaluationField label="Size" value={formatContainerSizeLabel(preAdvice.containerSize)} />
            <EvaluationField label="Type" value={preAdvice.containerType} />
            <EvaluationField label="Depot (CY)" value={schedule.depotName} />
          </EvaluationFieldColumn>
        }
        right={
          <EvaluationFieldColumn title="Request & schedule">
            <EvaluationField label="Requesting trucker" value={truckerName} />
            <EvaluationField label="Shipping line" value={preAdvice.shippingLineName} />
            <EvaluationField
              label="Free time valid until"
              value={
                preAdvice.demurrageValidUntil
                  ? formatScheduleDate(preAdvice.demurrageValidUntil)
                  : '—'
              }
            />
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
        <Box
          sx={{
            pt: 2,
            mt: 0.5,
            borderTop: '1px solid',
            borderColor: hexToRgba(ICS_PRIMARY, 0.12),
          }}
        >
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

      {hasRemarks ? (
        <EvaluationTabFooter>
          {preAdvice.remarks?.trim() && (
            <EvaluationField label="Trucker remarks" value={preAdvice.remarks.trim()} />
          )}
          {depotRemarks && <EvaluationField label="Depot remarks" value={depotRemarks} />}
        </EvaluationTabFooter>
      ) : null}
    </EvaluationTabShell>
  )
}
