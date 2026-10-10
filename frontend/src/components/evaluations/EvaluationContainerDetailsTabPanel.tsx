import { Chip } from '@mui/material'
import type { Evaluation, PreAdvice } from '../../services/api'
import { formatDateTime } from '../../utils/datetime'
import { formatContainerSizeLabel } from '../../utils/containerSize'
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
      <EvaluationTwoColumnBody
        left={
          <EvaluationFieldColumn title="Container">
            <EvaluationField label="Container number" value={item.containerNo} mono />
            <EvaluationField label="Size" value={formatContainerSizeLabel(item.containerSize)} />
            <EvaluationField label="Type" value={item.containerType} />
          </EvaluationFieldColumn>
        }
        right={
          <EvaluationFieldColumn title="Parties & submission">
            <EvaluationField label="Trucker" value={item.truckerName} />
            <EvaluationField label="Shipping line" value={item.shippingLineName} />
            <EvaluationField label="Submitted" value={formatDateTime(item.createdAt)} />
            {decision?.depotName && <EvaluationField label="Assigned CY" value={decision.depotName} />}
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
