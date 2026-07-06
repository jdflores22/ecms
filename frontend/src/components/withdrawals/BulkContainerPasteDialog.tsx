import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { parseBulkContainerPaste } from '../../utils/bulkContainerPaste'

interface BulkContainerPasteDialogProps {
  open: boolean
  onClose: () => void
  onApply: (containerNos: string[]) => void
}

export default function BulkContainerPasteDialog({ open, onClose, onApply }: BulkContainerPasteDialogProps) {
  const [text, setText] = useState('')

  const handleApply = () => {
    const parsed = parseBulkContainerPaste(text)
    if (parsed.length === 0) return
    onApply(parsed.map((p) => p.containerNo))
    setText('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Bulk add containers</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Paste container numbers separated by commas, semicolons, or new lines. Size and type must be set per row after import.
        </Typography>
        <TextField
          multiline
          minRows={6}
          fullWidth
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'MSCU1234567\nTCLU7654321'}
          slotProps={{ input: { style: { fontFamily: 'monospace' } } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleApply} disabled={!text.trim()}>
          Add to batch
        </Button>
      </DialogActions>
    </Dialog>
  )
}
