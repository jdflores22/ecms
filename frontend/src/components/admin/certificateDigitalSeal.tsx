import { Box, FormControlLabel, Switch, TextField, Typography } from '@mui/material'
import { ptToCanvasPx } from '../../utils/certificateLayoutPreview'

export const DEFAULT_DIGITAL_SEAL_COLOR = '#0B3D91'

export function DigitalIssuerSealPreview({
  color = DEFAULT_DIGITAL_SEAL_COLOR,
  scale,
}: {
  color?: string
  scale: number
}) {
  return (
    <Box
      sx={{
        display: 'inline-block',
        width: 'fit-content',
        maxWidth: '100%',
        border: `1.5px solid ${color}`,
        borderRadius: 0.5,
        px: 1.25,
        py: 0.75,
        mb: 0.75,
        textAlign: 'center',
      }}
    >
      <Typography
        sx={{
          fontSize: ptToCanvasPx(7, scale),
          fontWeight: 800,
          color,
          letterSpacing: 1,
          lineHeight: 1.1,
        }}
      >
        ICS
      </Typography>
      <Typography
        sx={{
          fontSize: ptToCanvasPx(8, scale),
          fontWeight: 800,
          color,
          lineHeight: 1.1,
          mt: 0.25,
        }}
      >
        SYSTEM ISSUED
      </Typography>
      <Typography
        sx={{
          fontSize: ptToCanvasPx(5.5, scale),
          color: '#666',
          lineHeight: 1.1,
          mt: 0.25,
        }}
      >
        Intelligent Container Solutions
      </Typography>
    </Box>
  )
}

export function SignatureBlockPreview({
  align,
  caption,
  titleText,
  showLine,
  fontSize,
  showDigitalSeal,
  digitalSealColor,
  scale,
  resolveName,
  textAlignCss,
}: {
  align: string
  caption: string
  titleText: string
  showLine: boolean
  fontSize: number
  showDigitalSeal?: boolean
  digitalSealColor?: string
  scale: number
  resolveName: () => string
  textAlignCss: (align: string) => 'left' | 'center' | 'right'
}) {
  return (
    <Box sx={{ py: 0.5, textAlign: textAlignCss(align) }}>
      {showDigitalSeal !== false && (
        <DigitalIssuerSealPreview color={digitalSealColor || DEFAULT_DIGITAL_SEAL_COLOR} scale={scale} />
      )}
      {caption && (
        <Typography
          sx={{
            fontSize: ptToCanvasPx(fontSize, scale),
            fontStyle: 'italic',
            color: '#555',
            mb: 0.5,
          }}
        >
          {caption}
        </Typography>
      )}
      {showLine && (
        <Box
          sx={{
            width: 100,
            borderBottom: '1px solid #333',
            mx: align === 'center' ? 'auto' : align === 'right' ? '0 0 0 auto' : 0,
            my: 1,
          }}
        />
      )}
      <Typography sx={{ fontSize: ptToCanvasPx(fontSize, scale), fontWeight: 600, color: '#1a1a1a' }}>
        {resolveName() || '\u00A0'}
      </Typography>
      {titleText && (
        <Typography sx={{ fontSize: ptToCanvasPx(fontSize - 1, scale), color: '#444' }}>{titleText}</Typography>
      )}
    </Box>
  )
}

export function SignatureDigitalSealControls({
  showDigitalSeal,
  digitalSealColor,
  onShowDigitalSealChange,
  onDigitalSealColorChange,
  fieldSx,
}: {
  showDigitalSeal?: boolean
  digitalSealColor?: string
  onShowDigitalSealChange: (checked: boolean) => void
  onDigitalSealColorChange: (color: string) => void
  fieldSx: object
}) {
  return (
    <>
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={showDigitalSeal !== false}
            onChange={(e) => onShowDigitalSealChange(e.target.checked)}
          />
        }
        label="Show ICS digital seal (system-issued)"
      />
      {showDigitalSeal !== false && (
        <TextField
          label="Seal color (hex)"
          size="small"
          value={digitalSealColor ?? DEFAULT_DIGITAL_SEAL_COLOR}
          onChange={(e) => onDigitalSealColorChange(e.target.value)}
          sx={fieldSx}
          placeholder="#0B3D91"
        />
      )}
    </>
  )
}
