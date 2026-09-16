import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import SearchIcon from '@mui/icons-material/Search'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import PublicSiteLayout, {
  PublicPageHero,
  publicColors,
  publicOutlineButtonSx,
  publicPrimaryButtonSx,
} from '../components/layout/PublicSiteLayout'
import { ICS_LANDING } from '../config/brandCopy'
import { TRUCKER_FAQ_CATEGORIES, type TruckerFaqItem } from '../config/truckerFaq'

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
    <PublicSiteLayout breadcrumb="Trucker FAQ" maxWidth="md">
      <PublicPageHero
        eyebrow="Public · No login required"
        title="Trucker FAQ"
        subtitle="Quick answers on registration, pre-forecast, returns, payments, demurrage, SOA, and withdrawals."
        subtitleTl="Madaling sagot sa registration, pre-forecast, returns, payments, demurrage, SOA, at withdrawals."
      />

      <TextField
        fullWidth
        placeholder="Search FAQ… / Hanapin sa FAQ"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{
          mb: 3,
          '& .MuiOutlinedInput-root': {
            borderRadius: '0.625rem',
            bgcolor: publicColors.white,
            '& fieldset': { borderColor: publicColors.border },
          },
        }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: publicColors.textLight }} />
              </InputAdornment>
            ),
          },
        }}
      />

      {filteredCategories.length === 0 ? (
        <Typography sx={{ py: 6, textAlign: 'center', color: publicColors.textMuted }}>
          No matching questions. Try another keyword.
        </Typography>
      ) : (
        filteredCategories.map((category) => (
          <Box key={category.id} sx={{ mb: 3 }}>
            <Typography
              variant="overline"
              sx={{ fontWeight: 700, color: publicColors.primary, letterSpacing: '0.08em' }}
            >
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
                    borderRadius: '0.75rem !important',
                    border: `1px solid ${publicColors.border}`,
                    bgcolor: publicColors.white,
                    '&:before': { display: 'none' },
                    overflow: 'hidden',
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: publicColors.textMuted }} />}>
                    <Box sx={{ minWidth: 0, pr: 1 }}>
                      <Typography sx={{ fontWeight: 600, color: publicColors.textDark }}>
                        {item.question}
                      </Typography>
                      <Typography variant="body2" sx={{ color: publicColors.textMuted, mt: 0.25 }}>
                        {item.questionTl}
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0, borderTop: `1px solid ${publicColors.border}` }}>
                    <Typography variant="body2" sx={{ color: publicColors.textDark, lineHeight: 1.75, mb: 1.5 }}>
                      {item.answer}
                    </Typography>
                    <Typography variant="body2" sx={{ color: publicColors.textMuted, lineHeight: 1.75 }}>
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
          borderRadius: '1rem',
          bgcolor: publicColors.white,
          border: `1px solid ${publicColors.border}`,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          alignItems: { sm: 'center' },
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
          <LocalShippingOutlinedIcon sx={{ color: publicColors.primary, mt: 0.25 }} />
          <Box>
            <Typography sx={{ fontWeight: 700, color: publicColors.textDark }}>
              Ready to get started?
            </Typography>
            <Typography variant="body2" sx={{ color: publicColors.textMuted, mt: 0.5 }}>
              Create your trucker account or sign in to submit a pre-forecast.
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button component={RouterLink} to="/signup/trucker" sx={publicPrimaryButtonSx}>
            {ICS_LANDING.primaryCta}
          </Button>
          <Button component={RouterLink} to="/login" sx={publicOutlineButtonSx}>
            {ICS_LANDING.secondaryCta}
          </Button>
        </Box>
      </Box>
    </PublicSiteLayout>
  )
}
