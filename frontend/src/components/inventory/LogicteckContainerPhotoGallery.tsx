import { Box, Tooltip, Typography } from '@mui/material'
import type { LogicteckContainerPhoto } from '../../services/api'

export default function LogicteckContainerPhotoGallery({ photos }: { photos: LogicteckContainerPhoto[] }) {
  if (photos.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No LOGICTECK container photos returned for this unit yet. When the yard exposes{' '}
        <code style={{ fontSize: '0.85em' }}>/api/ics/inventory/&#123;id&#125;/photos</code>, they will appear here.
      </Typography>
    )
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 1.5,
      }}
    >
      {photos.map((photo, index) => {
        const label = photo.label?.trim() || photo.category?.trim() || `Photo ${index + 1}`
        return (
          <Tooltip key={`${photo.url}-${index}`} title={label} enterDelay={400}>
            <Box
              sx={{
                borderRadius: 1.5,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'grey.50',
              }}
            >
              <Box
                component="img"
                src={photo.url}
                alt={label}
                loading="lazy"
                sx={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }}
              />
              <Typography variant="caption" sx={{ display: 'block', px: 1, py: 0.5, fontWeight: 600 }} noWrap>
                {label}
              </Typography>
            </Box>
          </Tooltip>
        )
      })}
    </Box>
  )
}
