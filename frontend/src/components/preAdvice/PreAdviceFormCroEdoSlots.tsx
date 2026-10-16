import type { ReactNode } from 'react'
import { Box, Typography } from '@mui/material'
import type { PreAdvice, PreAdviceDocument } from '../../services/api'
import { docIdentityUnit } from '../../utils/preAdviceIdentityUnit'
import CroEdoUnitUploadPanel from './CroEdoUnitUploadPanel'
import { formatContainerSummary } from '../../utils/containerSize'

type Props = {
  item: PreAdvice
  preAdviceId: number
  documents: PreAdviceDocument[]
  canManage: boolean
  onDocumentsChange: (documents: PreAdviceDocument[]) => void
}

export function buildPreAdviceFormCroEdoSlots({
  item,
  preAdviceId,
  documents,
  canManage,
  onDocumentsChange,
}: Props): { primaryCroSlot: ReactNode; companionCroSlot: ReactNode } {
  const mergeUploaded = (uploaded: PreAdviceDocument) => {
    const next = [
      ...documents.filter(
        (d) =>
          d.id !== uploaded.id &&
          !(d.category === uploaded.category && docIdentityUnit(d) === docIdentityUnit(uploaded)),
      ),
      uploaded,
    ]
    onDocumentsChange(next)
  }

  const primaryCro = documents.find(
    (d) => d.category === 'CroEdo' && docIdentityUnit(d) === 'Primary',
  )
  const companionCro = documents.find(
    (d) => d.category === 'CroEdo' && docIdentityUnit(d) === 'Companion',
  )

  const primaryLabel = `Primary · ${item.containerNo}`
  const companionLabel =
    item.backToBackCompanionContainerNo
      ? formatContainerSummary(
          item.backToBackCompanionContainerNo,
          item.backToBackCompanionContainerSize ?? '20',
          item.backToBackCompanionContainerType ?? '',
        )
      : 'Companion container'

  const readOnlyNote = (unit: 'Primary' | 'Companion') => {
    const doc = unit === 'Primary' ? primaryCro : companionCro
    if (!doc) return null
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        CRO/eDO on file: <strong>{doc.fileName}</strong>
      </Typography>
    )
  }

  return {
    primaryCroSlot: canManage ? (
      <CroEdoUnitUploadPanel
        preAdviceId={preAdviceId}
        unit="Primary"
        unitLabel={primaryLabel}
        existing={primaryCro}
        canManage={canManage}
        onUploaded={mergeUploaded}
      />
    ) : (
      <Box sx={{ mt: 2 }}>{readOnlyNote('Primary')}</Box>
    ),
    companionCroSlot: canManage ? (
      <CroEdoUnitUploadPanel
        preAdviceId={preAdviceId}
        unit="Companion"
        unitLabel={companionLabel}
        existing={companionCro}
        canManage={canManage}
        onUploaded={mergeUploaded}
      />
    ) : (
      <Box sx={{ mt: 2 }}>{readOnlyNote('Companion')}</Box>
    ),
  }
}
