import { Alert, Box, Chip, Typography } from '@mui/material'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { PreAdvice, PreAdviceDocument } from '../../services/api'
import {
  getPreAdviceContainerUnit,
  identityPhotosSectionTitle,
} from '../../utils/preAdviceContainerUnit'
import ContainerIdentityPhotos, { type ContainerIdentityPhotosHandle } from './ContainerIdentityPhotos'
import {
  docIdentityUnit,
  filterDocsForUnit,
  type PreAdviceIdentityUnit,
} from '../../utils/preAdviceIdentityUnit'

export type PreAdvicePhotosWorkspaceHandle = ContainerIdentityPhotosHandle

type Props = {
  item: PreAdvice
  preAdviceId: number
  documents: PreAdviceDocument[]
  loading?: boolean
  canManage?: boolean
  deferUpload?: boolean
  onChange?: () => void
  onDocumentsChange?: (documents: PreAdviceDocument[]) => void
  onPendingCategoriesChange?: (categories: string[]) => void
  error?: string
  onError?: (message: string) => void
  /** When set, only this container’s photo set is shown (split detail tabs). */
  unit?: PreAdviceIdentityUnit
}

const PreAdvicePhotosWorkspace = forwardRef<PreAdvicePhotosWorkspaceHandle, Props>(
  function PreAdvicePhotosWorkspace(
    {
      item,
      preAdviceId,
      documents,
      loading,
      canManage = false,
      deferUpload,
      onChange,
      onDocumentsChange,
      onPendingCategoriesChange,
      error,
      onError,
      unit,
    },
    ref,
  ) {
    const primaryRef = useRef<ContainerIdentityPhotosHandle>(null)
    const companionRef = useRef<ContainerIdentityPhotosHandle>(null)
    const [primaryPending, setPrimaryPending] = useState<string[]>([])
    const [companionPending, setCompanionPending] = useState<string[]>([])
    const onPendingCategoriesChangeRef = useRef(onPendingCategoriesChange)
    onPendingCategoriesChangeRef.current = onPendingCategoriesChange
    const lastPendingNotifyRef = useRef('')

    useEffect(() => {
      const categories =
        unit === 'Primary'
          ? primaryPending.map((c) => `Primary:${c}`)
          : unit === 'Companion'
            ? companionPending.map((c) => `Companion:${c}`)
            : [
                ...primaryPending.map((c) => `Primary:${c}`),
                ...companionPending.map((c) => `Companion:${c}`),
              ]
      const snapshot = categories.join('\0')
      if (snapshot === lastPendingNotifyRef.current) return
      lastPendingNotifyRef.current = snapshot
      onPendingCategoriesChangeRef.current?.(categories)
    }, [primaryPending, companionPending, unit])

    const showPrimary = !unit || unit === 'Primary'
    const showCompanion = unit === 'Companion' || (!unit && item.isBackToBack)

    useImperativeHandle(ref, () => ({
      uploadAllPending: async () => {
        if (unit === 'Companion') {
          return (await companionRef.current?.uploadAllPending()) ?? true
        }
        if (unit === 'Primary') {
          return (await primaryRef.current?.uploadAllPending()) ?? true
        }
        const primaryOk = (await primaryRef.current?.uploadAllPending()) ?? true
        if (!item.isBackToBack) return primaryOk
        const companionOk = (await companionRef.current?.uploadAllPending()) ?? true
        return primaryOk && companionOk
      },
      pendingCount: () => {
        if (unit === 'Companion') return companionRef.current?.pendingCount() ?? 0
        if (unit === 'Primary') return primaryRef.current?.pendingCount() ?? 0
        return (
          (primaryRef.current?.pendingCount() ?? 0) + (companionRef.current?.pendingCount() ?? 0)
        )
      },
    }))

    const primaryUnit = getPreAdviceContainerUnit(item, 'Primary')
    const companionUnit = item.isBackToBack ? getPreAdviceContainerUnit(item, 'Companion') : null

    return (
      <Box>
        {!unit && item.isBackToBack && (
          <Alert
            severity="info"
            icon={false}
            sx={{ mb: 2, borderRadius: 2, '& .MuiAlert-message': { width: '100%' } }}
          >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
              <Chip label="Back-to-Back" size="small" color="secondary" sx={{ fontWeight: 700 }} />
              <Typography variant="body2">
                CRO/eDO was attached when you created the request. Add identity photos for{' '}
                <strong>both</strong> containers below before submit.
              </Typography>
            </Box>
          </Alert>
        )}

        {showPrimary && (
        <ContainerIdentityPhotos
          ref={primaryRef}
          preAdviceId={preAdviceId}
          documents={filterDocsForUnit(documents, 'Primary')}
          loading={loading}
          canManage={canManage}
          deferUpload={deferUpload}
          identityUnit="Primary"
          sectionTitle={identityPhotosSectionTitle(primaryUnit.containerNo)}
          sectionSizeTypeLine={primaryUnit.sizeTypeLine}
          onChange={onChange}
          onDocumentsChange={(unitDocs) => {
            const other = documents.filter((d) => docIdentityUnit(d) !== 'Primary')
            onDocumentsChange?.([...other, ...unitDocs])
          }}
          onPendingCategoriesChange={setPrimaryPending}
          error={error}
          onError={onError}
        />
        )}

        {showCompanion && (
          <Box sx={{ mt: unit ? 0 : 4 }}>
            <ContainerIdentityPhotos
              ref={companionRef}
              preAdviceId={preAdviceId}
              documents={filterDocsForUnit(documents, 'Companion')}
              loading={loading}
              canManage={canManage}
              deferUpload={deferUpload}
              identityUnit="Companion"
              sectionTitle={identityPhotosSectionTitle(companionUnit!.containerNo)}
              sectionSizeTypeLine={companionUnit!.sizeTypeLine}
              onChange={onChange}
              onDocumentsChange={(unitDocs) => {
                const other = documents.filter((d) => docIdentityUnit(d) !== 'Companion')
                onDocumentsChange?.([...other, ...unitDocs])
              }}
              onPendingCategoriesChange={setCompanionPending}
              error={error}
              onError={onError}
            />
          </Box>
        )}
      </Box>
    )
  },
)

export default PreAdvicePhotosWorkspace
