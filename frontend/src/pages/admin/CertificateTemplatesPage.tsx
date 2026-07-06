import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import CertificateTemplateBuilder from '../../components/admin/CertificateTemplateBuilder'
import { ListLoadingState, listPageRootSx, listTablePaperSx } from '../../components/layout/ListPagePrimitives'
import { heroPaperSx } from '../../components/layout/DetailPagePrimitives'
import {
  certificateTemplateApi,
  shippingLineApi,
  type CertificateMergeField,
  type CertificateTemplate,
  type ShippingLine,
} from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import {
  CERTIFICATE_DOCUMENT_TYPES,
  documentTypeLabel,
  getDefaultLayout,
  serializeLayout,
  type CertificateDocumentType,
} from '../../utils/certificateLayoutTypes'
import { formatDateTime } from '../../utils/datetime'

const primaryDark = '#0B3D91'

export default function CertificateTemplatesPage() {
  const user = useAppSelector((s) => s.auth.user)
  const [shippingLines, setShippingLines] = useState<ShippingLine[]>([])
  const [shippingLineId, setShippingLineId] = useState<number | ''>('')
  const [documentType, setDocumentType] = useState<CertificateDocumentType>('Atw')
  const [templates, setTemplates] = useState<CertificateTemplate[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [mergeFields, setMergeFields] = useState<CertificateMergeField[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const selected = templates.find((t) => t.id === selectedId) ?? null
  const docMeta = CERTIFICATE_DOCUMENT_TYPES.find((t) => t.value === documentType)

  const loadTemplates = useCallback(async (lineId: number, docType: CertificateDocumentType) => {
    const { data } = await certificateTemplateApi.list({ shippingLineId: lineId, documentType: docType })
    setTemplates(data)
    setSelectedId((prev) => {
      if (prev && data.some((t) => t.id === prev)) return prev
      return data[0]?.id ?? null
    })
  }, [])

  useEffect(() => {
    shippingLineApi
      .list()
      .then(({ data }) => {
        setShippingLines(data)
        if (data.length > 0) setShippingLineId(data[0].id)
      })
      .catch(() => setError('Failed to load shipping lines.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    certificateTemplateApi
      .fields(documentType)
      .then(({ data }) => setMergeFields(data))
      .catch(() => setMergeFields([]))
  }, [documentType])

  useEffect(() => {
    if (shippingLineId === '') return
    setLoading(true)
    loadTemplates(shippingLineId, documentType)
      .catch(() => setError('Failed to load certificate templates.'))
      .finally(() => setLoading(false))
  }, [shippingLineId, documentType, loadTemplates])

  const handleCreate = async () => {
    if (shippingLineId === '') return
    setCreating(true)
    setError('')
    try {
      const lineName = shippingLines.find((s) => s.id === shippingLineId)?.name ?? 'Shipping line'
      const { data } = await certificateTemplateApi.create({
        shippingLineId,
        documentType,
        name: `${lineName} ${documentTypeLabel(documentType)} template`,
        layoutJson: serializeLayout(getDefaultLayout(documentType)),
      })
      await loadTemplates(shippingLineId, documentType)
      setSelectedId(data.id)
    } catch {
      setError('Failed to create template.')
    } finally {
      setCreating(false)
    }
  }

  if (user?.role !== 'Administrator') {
    return <Navigate to="/" replace />
  }

  return (
    <Box sx={listPageRootSx}>
      <Paper elevation={0} sx={heroPaperSx}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.14)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <DescriptionOutlinedIcon />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
              Certificate templates
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.82)', mt: 0.5, maxWidth: 720 }}>
              Calibrate ATW issue, ATW release, and CY container release certificate layouts per shipping line.
              Active templates are used when evaluators issue ATWs and when depots release containers.
            </Typography>
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper elevation={0} sx={{ ...listTablePaperSx, p: 2, mb: 2 }}>
        <Tabs
          value={documentType}
          onChange={(_, value: CertificateDocumentType) => setDocumentType(value)}
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          {CERTIFICATE_DOCUMENT_TYPES.map((type) => (
            <Tab key={type.value} value={type.value} label={type.label} sx={{ fontWeight: 600, textTransform: 'none' }} />
          ))}
        </Tabs>

        {docMeta && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {docMeta.description}
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 220, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
            <InputLabel>Shipping line</InputLabel>
            <Select
              label="Shipping line"
              value={shippingLineId}
              onChange={(e) => setShippingLineId(e.target.value as number)}
            >
              {shippingLines.map((line) => (
                <MenuItem key={line.id} value={line.id}>
                  {line.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Chip label={`Document: ${documentTypeLabel(documentType)}`} size="small" sx={{ fontWeight: 600 }} />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => void handleCreate()}
            disabled={shippingLineId === '' || creating}
            sx={{ ml: { md: 'auto' }, fontWeight: 700, borderRadius: 2 }}
          >
            {creating ? 'Creating…' : 'New template'}
          </Button>
        </Box>
      </Paper>

      {loading ? (
        <ListLoadingState />
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '360px 1fr' }, gap: 2, alignItems: 'start' }}>
          <Paper elevation={0} sx={{ ...listTablePaperSx, overflow: 'hidden' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, p: 2, pb: 1 }}>
              Templates
            </Typography>
            {templates.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 2 }}>
                No templates yet. Create one to start calibrating the {documentTypeLabel(documentType)} certificate.
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'rgba(11, 61, 145, 0.04)' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow
                        key={template.id}
                        hover
                        selected={template.id === selectedId}
                        onClick={() => setSelectedId(template.id)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Typography sx={{ fontWeight: 600, color: primaryDark }}>{template.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Updated {formatDateTime(template.updatedAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {template.isActive ? (
                            <Chip label="Active" color="success" size="small" sx={{ fontWeight: 700 }} />
                          ) : (
                            <Chip label="Inactive" size="small" variant="outlined" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          <CertificateTemplateBuilder
            template={selected}
            mergeFields={mergeFields}
            onSaved={(template) => {
              setTemplates((prev) => prev.map((t) => (t.id === template.id ? template : t)))
            }}
            onActivated={(template) => {
              setTemplates((prev) =>
                prev.map((t) =>
                  t.shippingLineId === template.shippingLineId && t.documentType === template.documentType
                    ? { ...t, isActive: t.id === template.id }
                    : t,
                ),
              )
            }}
          />
        </Box>
      )}
    </Box>
  )
}
