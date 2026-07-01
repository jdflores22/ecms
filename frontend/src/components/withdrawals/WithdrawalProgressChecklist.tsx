import { Box, Typography } from '@mui/material'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'

export interface WithdrawalProgressItem {
  key: string
  label: string
  done: boolean
}

interface WithdrawalProgressChecklistProps {
  items: WithdrawalProgressItem[]
}

export default function WithdrawalProgressChecklist({ items }: WithdrawalProgressChecklistProps) {
  const doneCount = items.filter((i) => i.done).length

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
        Progress ({doneCount}/{items.length})
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {items.map((item) => (
          <Box key={item.key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {item.done ? (
              <CheckCircleOutlinedIcon sx={{ fontSize: 18, color: 'success.main' }} />
            ) : (
              <RadioButtonUncheckedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
            )}
            <Typography variant="body2" color={item.done ? 'text.primary' : 'text.secondary'}>
              {item.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
