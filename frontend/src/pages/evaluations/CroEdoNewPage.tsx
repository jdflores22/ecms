import { Box, Button, Paper, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom'
import CroEdoEditor from '../../components/evaluations/CroEdoEditor'
import { ICS_PRIMARY, sectionPaperSx } from '../../components/layout/DetailPagePrimitives'
import { PageHero } from '../../components/layout/ListPagePrimitives'
import { listPageRootSx } from '../../components/layout/ListPagePrimitives'
import { useAppSelector } from '../../store/hooks'

const primaryDark = ICS_PRIMARY

const workflowSteps = [
  'Fill consignee, BL, vessel/voyage, registry, and broker details.',
  'Add container lines with hauler, plate, and free demurrage validity.',
  'Set Return Empty To — the eDO empty-return CY or location.',
  'Save draft, then Issue to generate the official CRO/eDO PDF.',
]

export default function CroEdoNewPage() {
  const navigate = useNavigate()
  const user = useAppSelector((s) => s.auth.user)

  if (user?.role !== 'ShippingLineEvaluator') {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <Box sx={listPageRootSx}>
      <Button
        component={RouterLink}
        to="/evaluations/cro-edo"
        startIcon={<ArrowBackIcon />}
        sx={{
          mb: 2,
          color: 'text.secondary',
          fontWeight: 600,
          '&:hover': { color: primaryDark, bgcolor: 'rgba(11, 61, 145, 0.06)' },
        }}
      >
        Back to CRO / eDO
      </Button>

      <PageHero
        icon={<DescriptionOutlinedIcon />}
        title="New CRO / eDO"
        subtitle="Authorize release of import containers to consignee/broker/hauler, with free demurrage time and empty return destination."
      />

      <CroEdoEditor
        mode="create"
        onCancel={() => navigate('/evaluations/cro-edo')}
        onSaved={(item) => navigate(`/evaluations/cro-edo/${item.id}`)}
        aside={
          <Paper elevation={0} sx={{ ...sectionPaperSx, mb: 0, position: { xl: 'sticky' }, top: { xl: 88 } }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              What happens next
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {workflowSteps.map((step, i) => (
                <Box key={step} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                  <Box
                    sx={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      flexShrink: 0,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: 'rgba(11, 61, 145, 0.1)',
                      color: primaryDark,
                      fontWeight: 800,
                      fontSize: 12,
                    }}
                  >
                    {i + 1}
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ pt: 0.25 }}>
                    {step}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        }
      />
    </Box>
  )
}
