import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CircularProgress,
  Paper,
  Typography,
} from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardConfig, isUserRole } from '../config/dashboardConfig'
import CyAllocationDashboardPanel from '../components/dashboard/CyAllocationDashboardPanel'
import { roleLabel } from '../config/roleConfig'
import { cyAllocationApi, dashboardApi } from '../services/api'
import type { CyAllocation } from '../services/api'
import { useAppSelector } from '../store/hooks'

const primaryDark = '#0B3D91'
const primaryLight = '#00A3E0'

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function DashboardPage() {
  const user = useAppSelector((s) => s.auth.user)
  const navigate = useNavigate()
  const [data, setData] = useState<Record<string, number>>({})
  const [cyAllocations, setCyAllocations] = useState<CyAllocation[]>([])
  const [loading, setLoading] = useState(true)
  const [cyLoading, setCyLoading] = useState(false)
  const [error, setError] = useState('')

  const config = useMemo(() => {
    if (!user || !isUserRole(user.role)) return null
    return dashboardConfig[user.role]
  }, [user])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    setError('')
    dashboardApi
      .get(user.role)
      .then(({ data: payload }) => setData(payload as Record<string, number>))
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Failed to load dashboard data.'
        setError(msg)
      })
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    if (!user || user.role !== 'ShippingLineEvaluator') {
      setCyAllocations([])
      return
    }
    setCyLoading(true)
    cyAllocationApi
      .list()
      .then(({ data: allocations }) => setCyAllocations(allocations))
      .catch(() => setCyAllocations([]))
      .finally(() => setCyLoading(false))
  }, [user])

  if (!user) return null

  if (!config) {
    return (
      <Alert severity="warning">
        No dashboard configured for role: {user.role}
      </Alert>
    )
  }

  const actionable = config.stats.filter(
    (s) => s.highlightWhenPositive && (data[s.key] ?? 0) > 0,
  )

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3 },
          mb: 3,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${primaryDark} 0%, #0A3580 60%, #0C4DA8 100%)`,
          color: '#fff',
          boxShadow: '0 8px 24px rgba(11, 61, 145, 0.22)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            right: -40,
            top: -40,
            width: 180,
            height: 180,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.06)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            right: 60,
            bottom: -50,
            width: 120,
            height: 120,
            borderRadius: '50%',
            bgcolor: 'rgba(0, 163, 224, 0.12)',
          }}
        />
        <Box sx={{ position: 'relative' }}>
          <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.75)', letterSpacing: 1.2 }}>
            {user.role ? roleLabel(user.role) : 'Dashboard'}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            Welcome back, {user.fullName?.split(' ')[0] ?? user.fullName}
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, mb: 0.5 }}>
            {config.title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.78)', maxWidth: 640 }}>
            {config.subtitle}
          </Typography>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {actionable.length > 0 && !loading && user.role !== 'Trucker' && (
        <Alert
          severity="info"
          sx={{
            mb: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'rgba(0, 163, 224, 0.35)',
            bgcolor: 'rgba(0, 163, 224, 0.08)',
          }}
        >
          {actionable.map((s) => (
            <Box key={s.key} component="span" sx={{ display: 'block' }}>
              <strong>{data[s.key]}</strong> {s.label.toLowerCase()} need attention.
            </Box>
          ))}
        </Alert>
      )}

      {loading ? (
        <Paper
          elevation={0}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            py: 10,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: '#fff',
          }}
        >
          <CircularProgress sx={{ color: primaryDark }} />
        </Paper>
      ) : (
        <>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            sm: 'repeat(2, 1fr)',
            lg: 'repeat(auto-fill, minmax(220px, 1fr))',
          },
          gap: { xs: 1.5, sm: 2 },
          mb: 3,
          minWidth: 0,
        }}
      >
            {config.stats.map((stat) => {
              const Icon = stat.icon
              const value = data[stat.key] ?? 0
              const highlighted = stat.highlightWhenPositive && value > 0
              return (
                <Card
                  key={stat.key}
                  elevation={0}
                  sx={{
                    height: '100%',
                    minWidth: 0,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: highlighted ? hexToRgba(stat.color, 0.45) : 'divider',
                    bgcolor: '#fff',
                    boxShadow: highlighted
                      ? `0 8px 20px ${hexToRgba(stat.color, 0.15)}`
                      : '0 2px 12px rgba(15, 23, 42, 0.06)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: `0 10px 24px ${hexToRgba(stat.color, 0.14)}`,
                    },
                    ...(highlighted && {
                      backgroundImage: `linear-gradient(180deg, ${hexToRgba(stat.color, 0.06)} 0%, #fff 100%)`,
                    }),
                  }}
                >
                  <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: { xs: 1.5, sm: 2 } }}>
                      <Box
                        sx={{
                          width: { xs: 40, sm: 44 },
                          height: { xs: 40, sm: 44 },
                          borderRadius: 2,
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: hexToRgba(stat.color, 0.12),
                          color: stat.color,
                        }}
                      >
                        <Icon sx={{ fontSize: 24 }} />
                      </Box>
                      {highlighted && (
                        <Box
                          sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: 99,
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: stat.color,
                            bgcolor: hexToRgba(stat.color, 0.12),
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                          }}
                        >
                          Action
                        </Box>
                      )}
                    </Box>
                    <Typography
                      variant="overline"
                      color="text.secondary"
                      sx={{ lineHeight: 1.2, fontWeight: 600, fontSize: { xs: '0.65rem', sm: '0.75rem' }, wordBreak: 'break-word' }}
                    >
                      {stat.label}
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 800,
                        color: stat.color,
                        my: 0.5,
                        lineHeight: 1.1,
                        fontSize: { xs: '1.75rem', sm: '2.125rem' },
                      }}
                    >
                      {value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {stat.description}
                    </Typography>
                  </Box>
                </Card>
              )
            })}
          </Box>

          {user.role === 'ShippingLineEvaluator' &&
            (cyLoading ? (
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  mb: 3,
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: '#fff',
                  display: 'flex',
                  justifyContent: 'center',
                  py: 4,
                }}
              >
                <CircularProgress size={28} sx={{ color: primaryDark }} />
              </Paper>
            ) : (
              <CyAllocationDashboardPanel items={cyAllocations} />
            ))}

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' },
              gap: 2,
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: '#fff',
                boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1.5,
                    bgcolor: hexToRgba(primaryDark, 0.1),
                    color: primaryDark,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <TipsAndUpdatesIcon fontSize="small" />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Workflow
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {config.workflow.map((step, i) => (
                  <Box key={step} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        flexShrink: 0,
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#fff',
                        bgcolor: i === 0 ? primaryLight : primaryDark,
                        boxShadow: '0 2px 8px rgba(11, 61, 145, 0.2)',
                      }}
                    >
                      {i + 1}
                    </Box>
                    <Box
                      sx={{
                        flex: 1,
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: 'rgba(11, 61, 145, 0.04)',
                        border: '1px solid',
                        borderColor: 'rgba(11, 61, 145, 0.08)',
                      }}
                    >
                      <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                        {step}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: '#fff',
                boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                Quick actions
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: config.actions.length > 3 ? { xs: '1fr', sm: '1fr 1fr' } : '1fr',
                  gap: 1.5,
                }}
              >
                {config.actions.map((action) => {
                  const Icon = action.icon
                  return (
                    <Card
                      key={action.path}
                      elevation={0}
                      sx={{
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        transition: 'border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease',
                        '&:hover': {
                          borderColor: hexToRgba(primaryLight, 0.6),
                          boxShadow: '0 6px 16px rgba(0, 163, 224, 0.12)',
                          transform: 'translateY(-1px)',
                        },
                      }}
                    >
                      <CardActionArea onClick={() => navigate(action.path)} sx={{ p: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: 1.5,
                              bgcolor: hexToRgba(primaryDark, 0.08),
                              color: primaryDark,
                              display: 'grid',
                              placeItems: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Icon fontSize="small" />
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {action.label}
                            </Typography>
                          </Box>
                          <ArrowForwardIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                        </Box>
                      </CardActionArea>
                    </Card>
                  )
                })}
              </Box>
              {config.actions.length === 1 && (
                <Button
                  variant="contained"
                  fullWidth
                  sx={{ mt: 2, py: 1.25, fontWeight: 600 }}
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate(config.actions[0].path)}
                >
                  {config.actions[0].label}
                </Button>
              )}
            </Paper>
          </Box>
        </>
      )}
    </Box>
  )
}
