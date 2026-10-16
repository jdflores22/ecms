import { Box, Typography } from '@mui/material'

type PreAdvicePhotoTabLabelProps = {
  containerNo: string
  sizeTypeLine: string
  uploaded: number
  total: number
  needsAction: boolean
}

export default function PreAdvicePhotoTabLabel({
  containerNo,
  sizeTypeLine,
  uploaded,
  total,
  needsAction,
}: PreAdvicePhotoTabLabelProps) {
  const shortNo = containerNo.length > 11 ? `${containerNo.slice(0, 10)}…` : containerNo

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, textAlign: 'left', py: 0.25, minWidth: 0 }}>
      {needsAction && (
        <Box
          aria-label="Action required"
          sx={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            bgcolor: '#c2410c',
            mt: 0.65,
            flexShrink: 0,
          }}
        />
      )}
      <Box sx={{ minWidth: 0 }}>
        <Typography
          component="span"
          variant="body2"
          sx={{
            fontWeight: 600,
            display: 'block',
            lineHeight: 1.25,
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            letterSpacing: 0.2,
          }}
        >
          {shortNo}
        </Typography>
        <Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          {sizeTypeLine} · {uploaded}/{total}
        </Typography>
      </Box>
    </Box>
  )
}
