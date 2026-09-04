import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined'
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Container,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import IcsLogo from '../components/brand/IcsLogo'
import { ICS_BRAND, ICS_LANDING } from '../config/brandCopy'
import { TRUCKER_FAQ_CATEGORIES, type TruckerFaqItem } from '../config/truckerFaq'

const primaryDark = '#0B3D91'
const primaryLight = '#00A3E0'
const ink = '#0F172A'
const muted = '#64748B'

function matchesSearch(item: TruckerFaqItem, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    item.question.toLowerCase().includes(q)
    || item.questionTl.toLowerCase().includes(q)
    || item.answer.toLowerCase().includes(q)
    || item.answerTl.toLowerCase().includes(q)
  )
}

export default function TruckerFaqPage() {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | false>(false)

  const filteredCategories = useMemo(() => {
    return TRUCKER_FAQ_CATEGORIES.map((category) => ({
      ...category,
      items: category.items.filter((item) => matchesSearch(item, search)),
    })).filter((category) => category.items.length > 0)
  }, [search])

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: '#F8FAFC', color: ink }}>
      <Box
        sx={{
          background: `linear-gradient(145deg, ${primaryDark} 0%, #0A3580 55%, ${primaryLight} 130%)`,
          color: '#fff',
          pb: { xs: 4, md: 5 },
        }}
      >
        <Container maxWidth="md" sx={{ pt: { xs: 2.5, sm: 3 } }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              mb: { xs: 4, md: 5 },
              flexWrap: 'wrap',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
              <IcsLogo height={{ xs: 36, sm: 44 }} maxWidth={{ xs: 120, sm: 150 }} />
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                component={RouterLink}
                to="/trucker/faq"
                size="small"
                sx={{
                  fontWeight: 700,
                  borderRadius: 2,
                  color: '#fff',
                  bgcolor: 'rgba(255,255,255,0.14)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' },
                }}
              >
                Trucker FAQ
              </Button>
              <Button
                component={RouterLink}
                to="/login"
                variant="outlined"
                size="small"
                startIcon={<LoginOutlinedIcon />}
                sx={{
                  fontWeight: 700,
                  borderRadius: 2,
                  color: '#fff',
                  borderColor: 'rgba(255,255,255,0.45)',
                  '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
                }}
              >
                {ICS_LANDING.secondaryCta}
              </Button>
              <Button
                component={RouterLink}
                to="/signup/trucker"
                variant="contained"
                size="small"
                sx={{
                  fontWeight: 700,
                  borderRadius: 2,
                  bgcolor: '#fff',
                  color: primaryDark,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.92)' },
                }}
              >
                Register
              </Button>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: 2.5,
                bgcolor: 'rgba(255,255,255,0.12)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <HelpOutlineOutlinedIcon />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Chip
                label="Public · No login required"
                size="small"
                sx={{
                  mb: 1.5,
                  fontWeight: 700,
                  bgcolor: 'rgba(255,255,255,0.14)',
                  color: '#fff',
                }}
              />
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, fontSize: { xs: '1.6rem', sm: '2rem' } }}>
                Trucker FAQ
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.82)', lineHeight: 1.7, maxWidth: 640 }}>
                Quick answers on registration, pre-forecast, returns, payments, demurrage, SOA, and withdrawals.
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 1, lineHeight: 1.7 }}>
                Madaling sagot sa registration, pre-forecast, returns, payments, demurrage, SOA, at withdrawals.
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 3, sm: 4 } }}>
        <TextField
          fullWidth
          placeholder="Search FAQ… / Hanapin sa FAQ"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': { borderRadius: 2.5, bgcolor: '#fff' },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />

        {filteredCategories.length === 0 ? (
          <Typography sx={{ py: 6, textAlign: 'center', color: muted }}>
            No matching questions. Try another keyword.
          </Typography>
        ) : (
          filteredCategories.map((category) => (
            <Box key={category.id} sx={{ mb: 3 }}>
              <Typography variant="overline" sx={{ fontWeight: 800, color: primaryDark, letterSpacing: 1.2 }}>
                {category.title} · {category.titleTl}
              </Typography>
              <Box sx={{ mt: 1.5, display: 'grid', gap: 1 }}>
                {category.items.map((item) => (
                  <Accordion
                    key={item.id}
                    expanded={expanded === item.id}
                    onChange={(_, isExpanded) => setExpanded(isExpanded ? item.id : false)}
                    elevation={0}
                    sx={{
                      borderRadius: '12px !important',
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: '#fff',
                      '&:before': { display: 'none' },
                      overflow: 'hidden',
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ minWidth: 0, pr: 1 }}>
                        <Typography sx={{ fontWeight: 700, color: ink }}>
                          {item.question}
                        </Typography>
                        <Typography variant="body2" sx={{ color: muted, mt: 0.25 }}>
                          {item.questionTl}
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2" sx={{ color: ink, lineHeight: 1.75, mb: 1.5 }}>
                        {item.answer}
                      </Typography>
                      <Typography variant="body2" sx={{ color: muted, lineHeight: 1.75 }}>
                        {item.answerTl}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            </Box>
          ))
        )}

        <Box
          sx={{
            mt: 4,
            p: { xs: 2.5, sm: 3 },
            borderRadius: 3,
            bgcolor: '#fff',
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            alignItems: { sm: 'center' },
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
            <LocalShippingOutlinedIcon sx={{ color: primaryDark, mt: 0.25 }} />
            <Box>
              <Typography sx={{ fontWeight: 800, color: ink }}>
                Ready to get started?
              </Typography>
              <Typography variant="body2" sx={{ color: muted, mt: 0.5 }}>
                Create your trucker account or sign in to submit a pre-forecast.
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button component={RouterLink} to="/signup/trucker" variant="contained" sx={{ fontWeight: 700, borderRadius: 2 }}>
              Register
            </Button>
            <Button component={RouterLink} to="/login" variant="outlined" sx={{ fontWeight: 700, borderRadius: 2 }}>
              Sign in
            </Button>
          </Box>
        </Box>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button component={RouterLink} to="/" sx={{ fontWeight: 600, color: primaryDark }}>
            Back to home
          </Button>
          <Typography variant="caption" sx={{ display: 'block', color: muted, mt: 2 }}>
            {ICS_BRAND.name} · {ICS_LANDING.footer}
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}
