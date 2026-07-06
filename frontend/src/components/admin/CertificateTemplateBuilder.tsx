import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined'
import ViewModuleOutlinedIcon from '@mui/icons-material/ViewModuleOutlined'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CertificateLayoutCanvas, { ElementPaletteItem } from './CertificateLayoutCanvas'
import CertificateElementLayoutControls from './CertificateElementLayoutControls'
import CertificateRowElementEditor from './CertificateRowElementEditor'
import CertificateTripleRowElementEditor from './CertificateTripleRowElementEditor'
import { SignatureDigitalSealControls } from './certificateDigitalSeal'
import { certificateTemplateApi, type CertificateTemplate } from '../../services/api'
import { stashCertificatePreview } from '../../utils/certificatePreviewStorage'
import {
  DEFAULT_ATW_LAYOUT,
  documentTypeLabel,
  elementSummary,
  newElement,
  parseLayoutJson,
  serializeLayout,
  type CertificateElementType,
  type CertificateLayoutDefinition,
  type CertificateLayoutElement,
  type CertificateMergeField,
} from '../../utils/certificateLayoutTypes'
import { useAssetUrlState } from '../../hooks/useAssetUrl'

const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } }

const PALETTE_ITEMS: { type: CertificateElementType; label: string; description: string }[] = [
  { type: 'title', label: 'Title', description: 'Large heading text' },
  { type: 'subtitle', label: 'Subtitle', description: 'Secondary heading' },
  { type: 'text', label: 'Static text', description: 'Paragraph or clause' },
  { type: 'field', label: 'Data field', description: 'Label + merge value' },
  { type: 'value', label: 'Value only', description: 'Merge value without label' },
  { type: 'columns', label: 'Two columns', description: 'Side-by-side field pair' },
  { type: 'table', label: 'Container table', description: 'Container lines grid' },
  { type: 'image', label: 'Image', description: 'Logo, stamp, or header art' },
  { type: 'signature', label: 'Signature', description: 'Sign-off block with line' },
  { type: 'stamp', label: 'Stamp badge', description: 'Bordered status label' },
  { type: 'qrcode', label: 'Verification QR', description: 'Scan to verify document' },
  { type: 'row', label: 'Side-by-side row', description: 'Two columns: image, QR, signature, stamp' },
  { type: 'tripleRow', label: 'Three-column row', description: 'Three columns: image, QR, signature, stamp' },
  { type: 'footer', label: 'Footer', description: 'Small print + timestamp' },
  { type: 'spacer', label: 'Spacer', description: 'Vertical whitespace' },
  { type: 'rule', label: 'Horizontal rule', description: 'Divider line' },
]

interface CertificateTemplateBuilderProps {
  template: CertificateTemplate | null
  mergeFields: CertificateMergeField[]
  onSaved: (template: CertificateTemplate) => void
  onActivated: (template: CertificateTemplate) => void
}

export default function CertificateTemplateBuilder({
  template,
  mergeFields,
  onSaved,
  onActivated,
}: CertificateTemplateBuilderProps) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [layout, setLayout] = useState<CertificateLayoutDefinition>(DEFAULT_ATW_LAYOUT)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [editorMode, setEditorMode] = useState<'canvas' | 'list'>('canvas')
  const [addOpen, setAddOpen] = useState(false)
  const [addType, setAddType] = useState<CertificateElementType>('field')
  const [saving, setSaving] = useState(false)
  const [activating, setActivating] = useState(false)
  const [error, setError] = useState('')
  const [savedSnapshot, setSavedSnapshot] = useState({ name: '', layoutJson: '' })

  useEffect(() => {
    if (!template) {
      setName('')
      setLayout(DEFAULT_ATW_LAYOUT)
      setSavedSnapshot({ name: '', layoutJson: '' })
      setSelectedIndex(null)
      return
    }
    setName(template.name)
    setLayout(parseLayoutJson(template.layoutJson, template.documentType))
    setSavedSnapshot({ name: template.name, layoutJson: template.layoutJson })
    setSelectedIndex(null)
  }, [template])

  const selectedElement = selectedIndex !== null ? layout.elements[selectedIndex] : null
  const layoutJson = useMemo(() => serializeLayout(layout), [layout])
  const isDirty =
    name.trim() !== savedSnapshot.name.trim() || layoutJson !== savedSnapshot.layoutJson

  const updateElement = (index: number, next: CertificateLayoutElement) => {
    setLayout((prev) => ({
      ...prev,
      elements: prev.elements.map((el, i) => (i === index ? next : el)),
    }))
  }

  const moveElement = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= layout.elements.length) return
    setLayout((prev) => {
      const elements = [...prev.elements]
      const [item] = elements.splice(index, 1)
      elements.splice(target, 0, item)
      return { ...prev, elements }
    })
    setSelectedIndex(target)
  }

  const reorderElement = (fromIndex: number, toIndex: number) => {
    setLayout((prev) => {
      const elements = [...prev.elements]
      const [item] = elements.splice(fromIndex, 1)
      elements.splice(toIndex, 0, item)
      return { ...prev, elements }
    })
    setSelectedIndex(toIndex)
  }

  const removeElement = (index: number) => {
    setLayout((prev) => ({
      ...prev,
      elements: prev.elements.filter((_, i) => i !== index),
    }))
    setSelectedIndex(null)
  }

  const insertElement = (type: CertificateElementType, atIndex?: number) => {
    const element = newElement(type)
    setLayout((prev) => {
      const elements = [...prev.elements]
      const index = atIndex ?? elements.length
      elements.splice(index, 0, element)
      return { ...prev, elements }
    })
    setSelectedIndex(atIndex ?? layout.elements.length)
    setAddOpen(false)
  }

  const persistTemplate = async () => {
    if (!template) throw new Error('No template selected.')
    const { data } = await certificateTemplateApi.update(template.id, {
      name: name.trim(),
      layoutJson,
    })
    setSavedSnapshot({ name: data.name, layoutJson: data.layoutJson })
    onSaved(data)
    return data
  }

  const handleSave = async () => {
    if (!template) return
    setSaving(true)
    setError('')
    try {
      await persistTemplate()
    } catch {
      setError('Failed to save template.')
    } finally {
      setSaving(false)
    }
  }

  const handlePreview = () => {
    const docType = template?.documentType ?? 'Atw'
    const previewTitle = name.trim() || template?.name || `${documentTypeLabel(docType)} template`
    stashCertificatePreview(layoutJson, previewTitle, docType)
    navigate('/admin/certificate-templates/preview', {
      state: { layoutJson, title: previewTitle, documentType: docType },
    })
  }

  const handleActivate = async () => {
    if (!template) return
    setActivating(true)
    setError('')
    try {
      const saved = await persistTemplate()
      await certificateTemplateApi.activate(template.id)
      onActivated({ ...saved, isActive: true })
    } catch {
      setError('Failed to save and activate template.')
    } finally {
      setActivating(false)
    }
  }

  if (!template) {
    return (
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography color="text.secondary">Select a template to edit, or create one for the chosen shipping line.</Typography>
      </Paper>
    )
  }

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {error && (
        <Alert severity="error" sx={{ borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {isDirty && (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          You have unsaved design changes. Save or use Set active so issued certificates use this layout.
          Preview PDF shows your current editor design, not necessarily what is stored on the server yet.
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 2 }}>
          <TextField
            label="Template name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            size="small"
            sx={{ ...fieldSx, minWidth: 240, flex: 1 }}
          />
          {template.isActive ? (
            <Chip label="Active" color="success" size="small" sx={{ fontWeight: 700 }} />
          ) : (
            <Chip label="Inactive" size="small" variant="outlined" />
          )}
          <ToggleButtonGroup
            size="small"
            exclusive
            value={editorMode}
            onChange={(_, value: 'canvas' | 'list' | null) => value && setEditorMode(value)}
            sx={{ '& .MuiToggleButton-root': { px: 1.5, fontWeight: 600 } }}
          >
            <ToggleButton value="canvas">
              <ViewModuleOutlinedIcon fontSize="small" sx={{ mr: 0.5 }} />
              Canvas
            </ToggleButton>
            <ToggleButton value="list">
              <ViewListOutlinedIcon fontSize="small" sx={{ mr: 0.5 }} />
              List
            </ToggleButton>
          </ToggleButtonGroup>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, ml: { md: 'auto' } }}>
            <Button
              variant="outlined"
              startIcon={<PictureAsPdfOutlinedIcon />}
              onClick={handlePreview}
              sx={{ fontWeight: 600, borderRadius: 2 }}
            >
              Preview PDF
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveOutlinedIcon />}
              onClick={() => void handleSave()}
              disabled={saving || activating || !name.trim() || !isDirty}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
            {!template.isActive && (
              <Button
                variant="outlined"
                color="success"
                onClick={() => void handleActivate()}
                disabled={activating || saving || !name.trim()}
                sx={{ fontWeight: 600, borderRadius: 2 }}
              >
                {activating ? 'Saving & activating…' : isDirty ? 'Save & set active' : 'Set active'}
              </Button>
            )}
          </Box>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns:
              editorMode === 'list'
                ? { xs: '1fr', xl: 'minmax(0, 1fr) 300px' }
                : { xs: '1fr', lg: '180px minmax(0, 1fr) 300px' },
            gap: 2,
            alignItems: 'start',
          }}
        >
          {editorMode === 'canvas' && (
            <>
              <Paper
                variant="outlined"
                sx={{ p: 1.5, borderRadius: 2, display: { xs: 'block', lg: 'none' }, overflowX: 'auto' }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Add elements
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, minWidth: 'max-content' }}>
                  {PALETTE_ITEMS.map((item) => (
                    <Button
                      key={item.type}
                      size="small"
                      variant="outlined"
                      onClick={() => insertElement(item.type)}
                      sx={{ fontWeight: 600, whiteSpace: 'nowrap', borderRadius: 2 }}
                    >
                      {item.label}
                    </Button>
                  ))}
                </Box>
              </Paper>

              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, display: { xs: 'none', lg: 'block' } }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Elements
              </Typography>
              <Box sx={{ display: 'grid', gap: 1 }}>
                {PALETTE_ITEMS.map((item) => (
                  <ElementPaletteItem
                    key={item.type}
                    label={item.label}
                    description={item.description}
                    onClick={() => insertElement(item.type)}
                    onDragStart={(event) => {
                      event.dataTransfer.setData('application/x-cert-element', item.type)
                      event.dataTransfer.effectAllowed = 'copy'
                    }}
                  />
                ))}
              </Box>
              <Button
                fullWidth
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setAddOpen(true)}
                sx={{ mt: 1.5, fontWeight: 600 }}
              >
                More options
              </Button>
            </Paper>
            </>
          )}

          <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
            {editorMode === 'canvas' ? (
              <CertificateLayoutCanvas
                layout={layout}
                selectedIndex={selectedIndex}
                onSelect={setSelectedIndex}
                onReorder={reorderElement}
                onUpdateElement={updateElement}
                onInsertElement={(type, atIndex) => insertElement(type as CertificateElementType, atIndex)}
              />
            ) : (
              <ListEditor
                layout={layout}
                selectedIndex={selectedIndex}
                onSelect={setSelectedIndex}
                onMove={moveElement}
                onRemove={removeElement}
                onAdd={() => setAddOpen(true)}
              />
            )}
          </Box>

          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              minWidth: 0,
              ...(editorMode === 'list'
                ? {
                    position: { xl: 'sticky' },
                    top: { xl: 16 },
                    maxHeight: { xl: 'calc(100vh - 120px)' },
                    overflow: { xl: 'auto' },
                  }
                : {
                    position: { lg: 'sticky' },
                    top: { lg: 16 },
                    maxHeight: { lg: 'calc(100vh - 120px)' },
                    overflow: { lg: 'auto' },
                  }),
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
              Page settings
            </Typography>
            <TextField
              label="Margin (mm)"
              type="number"
              size="small"
              fullWidth
              value={layout.page.marginMm}
              onChange={(e) =>
                setLayout((prev) => ({
                  ...prev,
                  page: { ...prev.page, marginMm: Number(e.target.value) || 0 },
                }))
              }
              sx={{ ...fieldSx, mb: 2 }}
            />

            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
              Element properties
            </Typography>
            {!selectedElement ? (
              <Typography variant="body2" color="text.secondary">
                {editorMode === 'canvas'
                  ? 'Click an element on the canvas to edit its properties.'
                  : 'Select an element from the list to edit.'}
              </Typography>
            ) : (
              <Box>
                {editorMode === 'canvas' && (
                  <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5 }}>
                    <IconButton
                      size="small"
                      onClick={() => selectedIndex !== null && moveElement(selectedIndex, -1)}
                      disabled={selectedIndex === 0}
                    >
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => selectedIndex !== null && moveElement(selectedIndex, 1)}
                      disabled={selectedIndex === null || selectedIndex >= layout.elements.length - 1}
                    >
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => selectedIndex !== null && removeElement(selectedIndex)}
                    >
                      <DeleteOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
                <ElementEditor
                  element={selectedElement}
                  templateId={template.id}
                  mergeFields={mergeFields}
                  onChange={(next) => selectedIndex !== null && updateElement(selectedIndex, next)}
                />
              </Box>
            )}
          </Paper>
        </Box>
      </Paper>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add layout element</DialogTitle>
        <DialogContent>
          <FormControl fullWidth size="small" sx={{ mt: 1, ...fieldSx }}>
            <InputLabel>Element type</InputLabel>
            <Select label="Element type" value={addType} onChange={(e) => setAddType(e.target.value as CertificateElementType)}>
              {PALETTE_ITEMS.map((item) => (
                <MenuItem key={item.type} value={item.type}>
                  {item.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => insertElement(addType)}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

function ListEditor({
  layout,
  selectedIndex,
  onSelect,
  onMove,
  onRemove,
  onAdd,
}: {
  layout: CertificateLayoutDefinition
  selectedIndex: number | null
  onSelect: (index: number) => void
  onMove: (index: number, direction: -1 | 1) => void
  onRemove: (index: number) => void
  onAdd: () => void
}) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Element list
        </Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={onAdd} sx={{ fontWeight: 600, flexShrink: 0 }}>
          Add
        </Button>
      </Box>

      {layout.elements.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          No elements yet. Add one to build the certificate layout.
        </Typography>
      ) : (
        <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(11, 61, 145, 0.04)' }}>
                <TableCell sx={{ fontWeight: 700, width: 40, px: 1 }}>#</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 88, px: 1 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700, px: 1 }}>Content</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, width: 108, px: 0.5 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {layout.elements.map((element, index) => (
                <TableRow
                  key={`${element.type}-${index}`}
                  hover
                  selected={selectedIndex === index}
                  onClick={() => onSelect(index)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell sx={{ px: 1, color: 'text.secondary', fontWeight: 700 }}>{index + 1}</TableCell>
                  <TableCell sx={{ px: 1 }}>
                    <Chip
                      label={element.type}
                      size="small"
                      sx={{ height: 22, fontSize: '0.7rem', textTransform: 'capitalize', maxWidth: '100%' }}
                    />
                  </TableCell>
                  <TableCell
                    sx={{
                      px: 1,
                      maxWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {elementSummary(element)}
                  </TableCell>
                  <TableCell align="right" sx={{ px: 0.5, whiteSpace: 'nowrap' }}>
                    <IconButton
                      size="small"
                      aria-label="Move up"
                      onClick={(e) => {
                        e.stopPropagation()
                        onMove(index, -1)
                      }}
                      disabled={index === 0}
                    >
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      aria-label="Move down"
                      onClick={(e) => {
                        e.stopPropagation()
                        onMove(index, 1)
                      }}
                      disabled={index === layout.elements.length - 1}
                    >
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      aria-label="Remove"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemove(index)
                      }}
                    >
                      <DeleteOutlinedIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  )
}

function ElementEditor({
  element,
  templateId,
  mergeFields,
  onChange,
}: {
  element: CertificateLayoutElement
  templateId: number
  mergeFields: CertificateMergeField[]
  onChange: (next: CertificateLayoutElement) => void
}) {
  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      <ElementSpecificEditor
        element={element}
        templateId={templateId}
        mergeFields={mergeFields}
        onChange={onChange}
      />
      <CertificateElementLayoutControls element={element} onChange={onChange} />
    </Box>
  )
}

function ElementSpecificEditor({
  element,
  templateId,
  mergeFields,
  onChange,
}: {
  element: CertificateLayoutElement
  templateId: number
  mergeFields: CertificateMergeField[]
  onChange: (next: CertificateLayoutElement) => void
}) {
  const fieldBindings = mergeFields.filter((f) => f.kind === 'field')

  const boldToggle =
    element.type === 'title' ||
    element.type === 'subtitle' ||
    element.type === 'text' ||
    element.type === 'field' ||
    element.type === 'value' ? (
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={element.bold}
            onChange={(e) => onChange({ ...element, bold: e.target.checked })}
          />
        }
        label="Bold"
        sx={{ mb: 1 }}
      />
    ) : null

  const alignSelect = (align: string, onAlign: (value: string) => void) => (
    <FormControl size="small" sx={fieldSx}>
      <InputLabel>Align</InputLabel>
      <Select label="Align" value={align} onChange={(e) => onAlign(e.target.value)}>
        <MenuItem value="left">Left</MenuItem>
        <MenuItem value="center">Center</MenuItem>
        <MenuItem value="right">Right</MenuItem>
      </Select>
    </FormControl>
  )

  const bindingSelect = (
    binding: string,
    onBinding: (value: string) => void,
    label = 'Data binding',
    allowEmpty = false,
  ) => (
    <FormControl size="small" sx={fieldSx}>
      <InputLabel>{label}</InputLabel>
      <Select label={label} value={binding} onChange={(e) => onBinding(e.target.value)}>
        {allowEmpty && <MenuItem value="">(blank line)</MenuItem>}
        {fieldBindings.map((field) => (
          <MenuItem key={field.key} value={field.key}>
            {field.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )

  if (element.type === 'title' || element.type === 'subtitle' || element.type === 'text') {
    return (
      <Box sx={{ display: 'grid', gap: 1.5 }}>
        <TextField
          label="Text"
          size="small"
          multiline
          minRows={2}
          value={element.text}
          onChange={(e) => onChange({ ...element, text: e.target.value })}
          sx={fieldSx}
        />
        <TextField
          label="Font size (pt)"
          type="number"
          size="small"
          value={element.fontSize}
          onChange={(e) => onChange({ ...element, fontSize: Number(e.target.value) || 11 })}
          sx={fieldSx}
        />
        <FormControl size="small" sx={fieldSx}>
          <InputLabel>Align</InputLabel>
          <Select label="Align" value={element.align} onChange={(e) => onChange({ ...element, align: e.target.value })}>
            <MenuItem value="left">Left</MenuItem>
            <MenuItem value="center">Center</MenuItem>
            <MenuItem value="right">Right</MenuItem>
          </Select>
        </FormControl>
        {boldToggle}
      </Box>
    )
  }

  if (element.type === 'value') {
    return (
      <Box sx={{ display: 'grid', gap: 1.5 }}>
        {bindingSelect(element.binding, (binding) => onChange({ ...element, binding }))}
        <TextField
          label="Font size (pt)"
          type="number"
          size="small"
          value={element.fontSize}
          onChange={(e) => onChange({ ...element, fontSize: Number(e.target.value) || 11 })}
          sx={fieldSx}
        />
        {alignSelect(element.align, (align) => onChange({ ...element, align }))}
        {boldToggle}
      </Box>
    )
  }

  if (element.type === 'columns') {
    return (
      <Box sx={{ display: 'grid', gap: 1.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          Left column
        </Typography>
        <TextField
          label="Label"
          size="small"
          value={element.leftLabel}
          onChange={(e) => onChange({ ...element, leftLabel: e.target.value })}
          sx={fieldSx}
        />
        {bindingSelect(element.leftBinding, (leftBinding) => onChange({ ...element, leftBinding }), 'Binding')}
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mt: 0.5 }}>
          Right column
        </Typography>
        <TextField
          label="Label"
          size="small"
          value={element.rightLabel}
          onChange={(e) => onChange({ ...element, rightLabel: e.target.value })}
          sx={fieldSx}
        />
        {bindingSelect(element.rightBinding, (rightBinding) => onChange({ ...element, rightBinding }), 'Binding')}
        <TextField
          label="Font size (pt)"
          type="number"
          size="small"
          value={element.fontSize}
          onChange={(e) => onChange({ ...element, fontSize: Number(e.target.value) || 11 })}
          sx={fieldSx}
        />
      </Box>
    )
  }

  if (element.type === 'signature') {
    return (
      <Box sx={{ display: 'grid', gap: 1.5 }}>
        <TextField
          label="Caption"
          size="small"
          value={element.caption}
          onChange={(e) => onChange({ ...element, caption: e.target.value })}
          sx={fieldSx}
        />
        {bindingSelect(
          element.nameBinding,
          (nameBinding) => onChange({ ...element, nameBinding }),
          'Name binding (optional)',
          true,
        )}
        <TextField
          label="Title / role"
          size="small"
          value={element.titleText}
          onChange={(e) => onChange({ ...element, titleText: e.target.value })}
          sx={fieldSx}
          placeholder="e.g. Depot Manager"
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={element.showLine}
              onChange={(e) => onChange({ ...element, showLine: e.target.checked })}
            />
          }
          label="Show signature line"
        />
        <SignatureDigitalSealControls
          showDigitalSeal={element.showDigitalSeal}
          digitalSealColor={element.digitalSealColor}
          onShowDigitalSealChange={(showDigitalSeal) => onChange({ ...element, showDigitalSeal })}
          onDigitalSealColorChange={(digitalSealColor) => onChange({ ...element, digitalSealColor })}
          fieldSx={fieldSx}
        />
        {alignSelect(element.align, (align) => onChange({ ...element, align }))}
        <TextField
          label="Font size (pt)"
          type="number"
          size="small"
          value={element.fontSize}
          onChange={(e) => onChange({ ...element, fontSize: Number(e.target.value) || 10 })}
          sx={fieldSx}
        />
      </Box>
    )
  }

  if (element.type === 'footer') {
    return (
      <Box sx={{ display: 'grid', gap: 1.5 }}>
        <TextField
          label="Prefix text"
          size="small"
          value={element.text}
          onChange={(e) => onChange({ ...element, text: e.target.value })}
          sx={fieldSx}
        />
        {bindingSelect(element.binding, (binding) => onChange({ ...element, binding }), 'Suffix binding')}
        {alignSelect(element.align, (align) => onChange({ ...element, align }))}
        <TextField
          label="Font size (pt)"
          type="number"
          size="small"
          value={element.fontSize}
          onChange={(e) => onChange({ ...element, fontSize: Number(e.target.value) || 8 })}
          sx={fieldSx}
        />
      </Box>
    )
  }

  if (element.type === 'stamp') {
    return (
      <Box sx={{ display: 'grid', gap: 1.5 }}>
        <TextField
          label="Stamp text"
          size="small"
          value={element.text}
          onChange={(e) => onChange({ ...element, text: e.target.value })}
          sx={fieldSx}
        />
        <TextField
          label="Color (hex)"
          size="small"
          value={element.color}
          onChange={(e) => onChange({ ...element, color: e.target.value })}
          sx={fieldSx}
          placeholder="#C62828"
        />
        {alignSelect(element.align, (align) => onChange({ ...element, align }))}
        <TextField
          label="Font size (pt)"
          type="number"
          size="small"
          value={element.fontSize}
          onChange={(e) => onChange({ ...element, fontSize: Number(e.target.value) || 22 })}
          sx={fieldSx}
        />
      </Box>
    )
  }

  if (element.type === 'qrcode') {
    return (
      <Box sx={{ display: 'grid', gap: 1.5 }}>
        <Typography variant="body2" color="text.secondary">
          Encodes a unique verification URL when the certificate is generated. Each PDF gets its own secure token.
        </Typography>
        {alignSelect(element.align, (align) => onChange({ ...element, align }))}
        <TextField
          label="QR size (mm)"
          type="number"
          size="small"
          value={element.widthMm}
          onChange={(e) => onChange({ ...element, widthMm: Number(e.target.value) || 28 })}
          sx={fieldSx}
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={element.showCaption}
              onChange={(e) => onChange({ ...element, showCaption: e.target.checked })}
            />
          }
          label="Show caption"
        />
        {element.showCaption && (
          <>
            <TextField
              label="Caption"
              size="small"
              value={element.caption}
              onChange={(e) => onChange({ ...element, caption: e.target.value })}
              sx={fieldSx}
            />
            <TextField
              label="Caption size (pt)"
              type="number"
              size="small"
              value={element.captionFontSize}
              onChange={(e) => onChange({ ...element, captionFontSize: Number(e.target.value) || 8 })}
              sx={fieldSx}
            />
          </>
        )}
      </Box>
    )
  }

  if (element.type === 'row') {
    return (
      <CertificateRowElementEditor
        element={element}
        templateId={templateId}
        mergeFields={mergeFields}
        onChange={onChange}
      />
    )
  }

  if (element.type === 'tripleRow') {
    return (
      <CertificateTripleRowElementEditor
        element={element}
        templateId={templateId}
        mergeFields={mergeFields}
        onChange={onChange}
      />
    )
  }

  if (element.type === 'field') {
    return (
      <Box sx={{ display: 'grid', gap: 1.5 }}>
        <TextField
          label="Label"
          size="small"
          value={element.label}
          onChange={(e) => onChange({ ...element, label: e.target.value })}
          sx={fieldSx}
        />
        <FormControl size="small" sx={fieldSx}>
          <InputLabel>Data binding</InputLabel>
          <Select
            label="Data binding"
            value={element.binding}
            onChange={(e) => onChange({ ...element, binding: e.target.value })}
          >
            {fieldBindings.map((field) => (
              <MenuItem key={field.key} value={field.key}>
                {field.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Font size (pt)"
          type="number"
          size="small"
          value={element.fontSize}
          onChange={(e) => onChange({ ...element, fontSize: Number(e.target.value) || 11 })}
          sx={fieldSx}
        />
        {boldToggle}
      </Box>
    )
  }

  if (element.type === 'table') {
    return (
      <Box sx={{ display: 'grid', gap: 1.5 }}>
        <Typography variant="body2" color="text.secondary">
          Container lines table (Container, Size, Type)
        </Typography>
        <TextField
          label="Font size (pt)"
          type="number"
          size="small"
          value={element.fontSize}
          onChange={(e) => onChange({ ...element, fontSize: Number(e.target.value) || 10 })}
          sx={fieldSx}
        />
      </Box>
    )
  }

  if (element.type === 'spacer') {
    return (
      <TextField
        label="Height (mm)"
        type="number"
        size="small"
        value={element.heightMm}
        onChange={(e) => onChange({ ...element, heightMm: Number(e.target.value) || 4 })}
        sx={fieldSx}
        helperText="Drag the handle on the canvas to resize visually."
      />
    )
  }

  if (element.type === 'image') {
    return (
      <ImageElementEditor element={element} templateId={templateId} onChange={onChange} />
    )
  }

  return (
    <TextField
      label="Thickness (pt)"
      type="number"
      size="small"
      value={element.thicknessPt}
      onChange={(e) => onChange({ ...element, thicknessPt: Number(e.target.value) || 1 })}
      sx={fieldSx}
    />
  )
}

function ImageElementEditor({
  element,
  templateId,
  onChange,
}: {
  element: Extract<CertificateLayoutElement, { type: 'image' }>
  templateId: number
  onChange: (next: CertificateLayoutElement) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const { url, loading } = useAssetUrlState(element.src || undefined)

  const handleUpload = async (file: File) => {
    setUploading(true)
    setUploadError('')
    try {
      const { data } = await certificateTemplateApi.uploadImage(templateId, file)
      onChange({ ...element, src: data.path, alt: element.alt || data.fileName })
    } catch {
      setUploadError('Failed to upload image.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      <Box
        sx={{
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'rgba(11, 61, 145, 0.03)',
          minHeight: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          p: 1,
        }}
      >
        {!element.src ? (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <ImageOutlinedIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 0.5 }} />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              No image yet
            </Typography>
          </Box>
        ) : loading ? (
          <Typography variant="caption" color="text.secondary">
            Loading preview…
          </Typography>
        ) : url ? (
          <Box
            component="img"
            src={url}
            alt={element.alt || 'Certificate image'}
            sx={{ maxWidth: '100%', maxHeight: 140, objectFit: 'contain' }}
          />
        ) : (
          <Typography variant="caption" color="error">
            Preview unavailable
          </Typography>
        )}
      </Box>

      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept=".jpg,.jpeg,.png,.webp,.gif,image/*"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleUpload(file)
          e.target.value = ''
        }}
      />

      <Button
        variant="outlined"
        startIcon={<CloudUploadOutlinedIcon />}
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        fullWidth
        sx={{ fontWeight: 600, borderRadius: 2 }}
      >
        {uploading ? 'Uploading…' : element.src ? 'Replace image' : 'Upload image'}
      </Button>

      {uploadError && (
        <Typography variant="caption" color="error">
          {uploadError}
        </Typography>
      )}

      <TextField
        label="Alt text"
        size="small"
        value={element.alt ?? ''}
        onChange={(e) => onChange({ ...element, alt: e.target.value })}
        sx={fieldSx}
        helperText="Accessibility label (not shown on certificate)."
      />
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={element.showTitle ?? false}
            onChange={(e) => onChange({ ...element, showTitle: e.target.checked })}
          />
        }
        label="Show title under image"
      />
      {(element.showTitle ?? false) && (
        <>
          <TextField
            label="Title"
            size="small"
            value={element.title ?? ''}
            onChange={(e) => onChange({ ...element, title: e.target.value })}
            sx={fieldSx}
            placeholder="e.g. Intelligent Container Solutions"
          />
          <TextField
            label="Subtitle (optional)"
            size="small"
            value={element.subtitle ?? ''}
            onChange={(e) => onChange({ ...element, subtitle: e.target.value })}
            sx={fieldSx}
            placeholder="e.g. Authorized depot"
          />
          <TextField
            label="Title size (pt)"
            type="number"
            size="small"
            value={element.titleFontSize ?? 10}
            onChange={(e) => onChange({ ...element, titleFontSize: Number(e.target.value) || 10 })}
            sx={fieldSx}
          />
          <TextField
            label="Subtitle size (pt)"
            type="number"
            size="small"
            value={element.subtitleFontSize ?? 8}
            onChange={(e) => onChange({ ...element, subtitleFontSize: Number(e.target.value) || 8 })}
            sx={fieldSx}
          />
        </>
      )}
      <TextField
        label="Width (mm)"
        type="number"
        size="small"
        value={element.widthMm}
        onChange={(e) => onChange({ ...element, widthMm: Number(e.target.value) || 10 })}
        sx={fieldSx}
        helperText="Height scales automatically unless set below."
      />
      <TextField
        label="Height (mm)"
        type="number"
        size="small"
        value={element.heightMm ?? ''}
        onChange={(e) => {
          const raw = e.target.value
          onChange({
            ...element,
            heightMm: raw === '' ? undefined : Number(raw) || undefined,
          })
        }}
        sx={fieldSx}
        placeholder="Auto"
      />
      <FormControl size="small" sx={fieldSx}>
        <InputLabel>Align</InputLabel>
        <Select label="Align" value={element.align} onChange={(e) => onChange({ ...element, align: e.target.value })}>
          <MenuItem value="left">Left</MenuItem>
          <MenuItem value="center">Center</MenuItem>
          <MenuItem value="right">Right</MenuItem>
        </Select>
      </FormControl>
    </Box>
  )
}
