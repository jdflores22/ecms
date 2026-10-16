import { Box, Chip } from '@mui/material'
import type { Evaluation, PreAdvice } from '../../services/api'
import PreAdviceContainerUnitsReadOnly from '../preAdvice/PreAdviceContainerUnitsReadOnly'
import { formatDateTime } from '../../utils/datetime'
import {
  EvaluationField,
  EvaluationFieldColumn,
  EvaluationTabFooter,
  EvaluationTabShell,
  EvaluationTwoColumnBody,
} from './EvaluationDetailFieldGrid'

type EvaluationContainerDetailsTabPanelProps = {
  item: PreAdvice
  decision: Evaluation | null
}

export default function EvaluationContainerDetailsTabPanel({
  item,
  decision,
}: EvaluationContainerDetailsTabPanelProps) {
  const hasFooterRemarks =
    Boolean(item.remarks?.trim())
    || Boolean(item.complianceRemarks)
    || Boolean(decision?.remarks)

  return (
    <EvaluationTabShell title="Container details">
      <Box sx={{ mb: 2 }}>
        <PreAdviceContainerUnitsReadOnly item={item} />
      </Box>

      <EvaluationTwoColumnBody
        left={
          <EvaluationFieldColumn title="Parties & submission">
            <EvaluationField label="Trucker" value={item.truckerName} />
            <EvaluationField label="Shipping line" value={item.shippingLineName} />
            <EvaluationField label="Submitted" value={formatDateTime(item.createdAt)} />
            {decision?.depotName && (
              <EvaluationField
                label={item.isBackToBack ? 'Container A assigned CY' : 'Assigned CY'}
                value={decision.depotName}
              />
            )}
            {item.isBackToBack && decision?.companionDepotName && (
              <EvaluationField label="Container B assigned CY" value={decision.companionDepotName} />
            )}
            {decision && (
              <EvaluationField
                label="Evaluation"
                value={
                  <Chip
                    label={decision.status}
                    size="small"
                    color={decision.status === 'Approved' ? 'success' : 'error'}
                    sx={{ fontWeight: 600 }}
                  />
                }
              />
            )}
            {decision?.evaluatorName && <EvaluationField label="Evaluator" value={decision.evaluatorName} />}
            {decision?.evaluatedAt && (
              <EvaluationField label="Evaluated" value={formatDateTime(decision.evaluatedAt)} />
            )}
          </EvaluationFieldColumn>
        }
      />

      {hasFooterRemarks ? (
        <EvaluationTabFooter>
          {item.remarks?.trim() && (
            <EvaluationField label="Trucker remarks" value={item.remarks.trim()} />
          )}
          {item.complianceRemarks && (
            <EvaluationField label="Compliance instructions" value={item.complianceRemarks} />
          )}
          {decision?.remarks && <EvaluationField label="Evaluation remarks" value={decision.remarks} />}
        </EvaluationTabFooter>
      ) : null}
    </EvaluationTabShell>
  )
}
