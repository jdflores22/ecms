import { Box, Chip } from '@mui/material'
import PreAdviceBackToBackChip from '../preAdvice/PreAdviceBackToBackChip'
import PreAdviceContainerUnitsReadOnly from '../preAdvice/PreAdviceContainerUnitsReadOnly'
import { PreAdviceStatusChip } from '../preAdvice/PreAdviceStatusChip'
import { InlineLoadingSkeleton } from '../layout/SkeletonPrimitives'
import { LOGICTECK_QR, qrLogicteckStatusFromPreAdvice, qrLookupStatusColor } from '../../config/logicteckQr'
import type { Evaluation, PreAdvice, QrBooking, Schedule } from '../../services/api'
import { formatDateTime, formatScheduleSlot } from '../../utils/datetime'
import {
  EvaluationField,
  EvaluationFieldColumn,
  EvaluationTabFooter,
  EvaluationTabShell,
  EvaluationTwoColumnBody,
} from './EvaluationDetailFieldGrid'

type EvaluationOverviewTabPanelProps = {
  item: PreAdvice
  decision: Evaluation | null
  schedule: Schedule | null
  scheduleLoading: boolean
  qrBooking: QrBooking | null
}

export default function EvaluationOverviewTabPanel({
  item,
  decision,
  schedule,
  scheduleLoading,
  qrBooking,
}: EvaluationOverviewTabPanelProps) {
  const qrStatus = qrLogicteckStatusFromPreAdvice(item)
  const hasFooterRemarks =
    Boolean(item.remarks?.trim())
    || Boolean(item.complianceRemarks)
    || Boolean(decision?.remarks)

  return (
    <EvaluationTabShell
      title="Full overview"
      headerExtra={
        <>
          <PreAdviceStatusChip status={item.status} scheduleStatus={schedule?.status ?? item.scheduleStatus} />
          {item.isBackToBack && <PreAdviceBackToBackChip item={item} />}
          {item.hasQrBooking && qrStatus && (
            <Chip label={qrStatus} size="small" color={qrLookupStatusColor(qrStatus)} sx={{ fontWeight: 700 }} />
          )}
        </>
      }
    >
      <EvaluationTwoColumnBody
        left={
          <EvaluationFieldColumn title="Pre-forecast">
            <EvaluationField label="Reference" value={item.referenceNo} mono />
            <EvaluationField label="Submitted" value={formatDateTime(item.createdAt)} />
            <EvaluationField label="Trucker" value={item.truckerName} />
            <EvaluationField label="Shipping line" value={item.shippingLineName} />
            {item.qrCode && <EvaluationField label="ICS QR reference" value={item.qrCode} mono />}
          </EvaluationFieldColumn>
        }
        right={null}
      />

      <Box sx={{ mt: 2 }}>
        <PreAdviceContainerUnitsReadOnly item={item} />
      </Box>

      {hasFooterRemarks && (
        <EvaluationTabFooter>
          {item.remarks?.trim() && <EvaluationField label="Trucker remarks" value={item.remarks.trim()} />}
          {item.complianceRemarks && (
            <EvaluationField label="Compliance instructions" value={item.complianceRemarks} />
          )}
          {decision?.remarks && <EvaluationField label="Evaluation remarks" value={decision.remarks} />}
        </EvaluationTabFooter>
      )}

      {decision && (
        <EvaluationTabFooter>
          <EvaluationFieldColumn title="ICS evaluation">
            <EvaluationField
              label="Decision"
              value={
                <Chip
                  label={decision.status}
                  size="small"
                  color={decision.status === 'Approved' ? 'success' : 'error'}
                  sx={{ fontWeight: 600 }}
                />
              }
            />
            {decision.depotName && (
              <EvaluationField
                label={item.isBackToBack ? 'Container A assigned CY' : 'Assigned CY'}
                value={decision.depotName}
              />
            )}
            {item.isBackToBack && decision.companionDepotName && (
              <EvaluationField label="Container B assigned CY" value={decision.companionDepotName} />
            )}
            <EvaluationField label="Evaluator" value={decision.evaluatorName} />
            <EvaluationField label="Evaluated" value={formatDateTime(decision.evaluatedAt)} />
          </EvaluationFieldColumn>
        </EvaluationTabFooter>
      )}

      {item.status === 'Approved' && (scheduleLoading || schedule || qrBooking) && (
        <EvaluationTwoColumnBody
          left={
            scheduleLoading ? (
              <InlineLoadingSkeleton rows={2} />
            ) : schedule ? (
              <EvaluationFieldColumn title="Return schedule">
                <EvaluationField label="Depot (CY)" value={schedule.depotName} />
                {schedule.date && (
                  <EvaluationField
                    label="Return slot"
                    value={formatScheduleSlot(schedule.date, schedule.time)}
                  />
                )}
                <EvaluationField label="Schedule status" value={schedule.status} />
                <EvaluationField label="Reference" value={schedule.referenceNo} mono />
              </EvaluationFieldColumn>
            ) : null
          }
          right={
            qrBooking ? (
              <EvaluationFieldColumn title={LOGICTECK_QR.sectionTitle}>
                <EvaluationField label={LOGICTECK_QR.bookingIdLabel} value={qrBooking.qrCode} mono />
                <EvaluationField label="Generated" value={formatDateTime(qrBooking.generatedAt)} />
              </EvaluationFieldColumn>
            ) : null
          }
        />
      )}
    </EvaluationTabShell>
  )
}
