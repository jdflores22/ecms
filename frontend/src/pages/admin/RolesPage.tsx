import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined'
import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, Navigate } from 'react-router-dom'
import { RolePageAccessList, RolePageAccessSummary } from '../../components/admin/RolePageAccessList'
import { ROLE_CATALOG } from '../../config/roleConfig'
import { getAccessiblePageKeys, type AppPageKey } from '../../config/routeAccess'
import { roleApi, userApi, type RoleCatalog, type UserAdmin } from '../../services/api'
import { useAppSelector } from '../../store/hooks'

const primaryDark = '#0B3D91'
const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } }

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: '#fff',
        boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, color, mt: 0.5 }}>
        {value}
      </Typography>
    </Paper>
  )
}

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
  }
  return fallback
}

function fallbackRoles(): RoleCatalog[] {
  return ROLE_CATALOG.map((role, index) => ({
    id: index + 1,
    name: role.name,
    label: role.label,
    description: role.description,
    capabilities: [...role.capabilities],
    allowedPages: [...getAccessiblePageKeys(role.name)],
  }))
}

export default function RolesPage() {
  const currentUser = useAppSelector((s) => s.auth.user)
  const [roles, setRoles] = useState<RoleCatalog[]>([])
  const [users, setUsers] = useState<UserAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [editOpen, setEditOpen] = useState(false)
  const [selected, setSelected] = useState<RoleCatalog | null>(null)
  const [description, setDescription] = useState('')
  const [capabilities, setCapabilities] = useState<string[]>([])
  const [allowedPages, setAllowedPages] = useState<AppPageKey[]>([])
  const [newCapability, setNewCapability] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    Promise.all([roleApi.list(), userApi.list()])
      .then(([rolesRes, usersRes]) => {
        setRoles(rolesRes.data)
        setUsers(usersRes.data)
      })
      .catch(() => {
        setRoles(fallbackRoles())
        userApi
          .list()
          .then(({ data }) => setUsers(data))
          .catch(() => setError('Failed to load roles.'))
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const countsByRole = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const role of roles) counts[role.name] = 0
    for (const user of users) {
      if (user.status === 'Active') counts[user.role] = (counts[user.role] ?? 0) + 1
    }
    return counts
  }, [users, roles])

  const summary = useMemo(() => {
    const activeUsers = users.filter((u) => u.status === 'Active').length
    const assignedRoles = roles.filter((r) => (countsByRole[r.name] ?? 0) > 0).length
    return {
      roles: roles.length,
      activeUsers,
      assignedRoles,
    }
  }, [users, countsByRole, roles.length])

  const openEdit = (role: RoleCatalog) => {
    setSelected(role)
    setDescription(role.description)
    setCapabilities([...role.capabilities])
    setAllowedPages(
      (role.allowedPages?.length ? role.allowedPages : getAccessiblePageKeys(role.name)) as AppPageKey[],
    )
    setNewCapability('')
    ;(document.activeElement as HTMLElement | null)?.blur()
    setEditOpen(true)
  }

  const addCapability = () => {
    const value = newCapability.trim()
    if (!value) return
    if (capabilities.some((c) => c.toLowerCase() === value.toLowerCase())) {
      setNewCapability('')
      return
    }
    setCapabilities([...capabilities, value])
    setNewCapability('')
  }

  const removeCapability = (index: number) => {
    setCapabilities(capabilities.filter((_, i) => i !== index))
  }

  const updateCapability = (index: number, value: string) => {
    setCapabilities(capabilities.map((cap, i) => (i === index ? value : cap)))
  }

  const handleSave = async () => {
    if (!selected) return
    const trimmed = capabilities.map((c) => c.trim()).filter(Boolean)
    if (trimmed.length === 0) {
      setError('At least one capability is required.')
      return
    }
    if (allowedPages.length === 0) {
      setError('At least one page must be selected.')
      return
    }
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      const { data } = await roleApi.update(selected.name, {
        description: description.trim(),
        capabilities: trimmed,
        allowedPages,
      })
      setRoles((prev) => prev.map((r) => (r.name === data.name ? data : r)))
      setEditOpen(false)
      setSuccess(`Updated ${data.label}. Users with this role must sign in again for page changes to apply.`)
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to update role.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (currentUser?.role !== 'Administrator') {
    return <Navigate to="/" replace />
  }

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
            right: -30,
            top: -30,
            width: 140,
            height: 140,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.06)',
          }}
        />
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
            position: 'relative',
          }}
        >
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.14)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <AdminPanelSettingsOutlinedIcon />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                Role Management
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.82)', mt: 0.5, maxWidth: 560 }}>
                Role names are fixed. Each role can only access its assigned pages — enforced across navigation
                and routing (RBAC).
              </Typography>
            </Box>
          </Box>
          <Button
            component={RouterLink}
            to="/admin/users"
            variant="contained"
            startIcon={<PeopleOutlinedIcon />}
            sx={{
              bgcolor: '#fff',
              color: primaryDark,
              fontWeight: 700,
              flexShrink: 0,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.92)' },
            }}
          >
            Manage users
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        <strong>Role-based access control:</strong> page access is defined per role. For example, a Shipping
        Line Evaluator only sees Dashboard, Evaluations, CY tools, Reports, and Profile — not depot or trucker pages.
        Edit a role to update its description and functional capabilities.
      </Alert>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <SummaryCard label="System roles" value={summary.roles} color={primaryDark} />
        <SummaryCard label="Active users" value={summary.activeUsers} color="#2E7D32" />
        <SummaryCard label="Roles in use" value={summary.assignedRoles} color="#00A3E0" />
      </Box>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: '#fff',
          boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress sx={{ color: primaryDark }} />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    bgcolor: hexToRgba(primaryDark, 0.04),
                    '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary', py: 1.75 },
                  }}
                >
                  <TableCell>Role</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Page access</TableCell>
                  <TableCell>Capabilities</TableCell>
                  <TableCell align="center">Active users</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.name} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                    <TableCell sx={{ fontWeight: 700, color: primaryDark, verticalAlign: 'top' }}>
                      {role.label}
                    </TableCell>
                    <TableCell sx={{ verticalAlign: 'top', maxWidth: 280 }}>
                      <Typography variant="body2" color="text.secondary">
                        {role.description}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ verticalAlign: 'top', maxWidth: 320 }}>
                      <RolePageAccessList roleName={role.name} allowedPages={role.allowedPages} compact />
                    </TableCell>
                    <TableCell sx={{ verticalAlign: 'top', maxWidth: 240 }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {role.capabilities.map((cap) => (
                          <Chip
                            key={cap}
                            label={cap}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 500, borderColor: hexToRgba(primaryDark, 0.2) }}
                          />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ verticalAlign: 'top' }}>
                      <Chip
                        label={countsByRole[role.name] ?? 0}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          bgcolor: hexToRgba(primaryDark, 0.08),
                          color: primaryDark,
                          minWidth: 36,
                        }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ verticalAlign: 'top' }}>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditOutlinedIcon />}
                          onClick={() => openEdit(role)}
                          sx={{ fontWeight: 600, borderRadius: 2 }}
                        >
                          Edit
                        </Button>
                        <Button
                          component={RouterLink}
                          to={`/admin/users?role=${encodeURIComponent(role.name)}`}
                          size="small"
                          variant="outlined"
                          startIcon={<PeopleOutlinedIcon />}
                          sx={{ fontWeight: 600, borderRadius: 2 }}
                        >
                          Users
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        maxWidth="sm"
        fullWidth
        disableRestoreFocus
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Edit role — {selected?.label}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Role name: <strong>{selected?.name}</strong>
          </Typography>

          {selected && (
            <RolePageAccessSummary
              roleName={selected.name}
              allowedPages={allowedPages}
              onChange={setAllowedPages}
            />
          )}

          <TextField
            fullWidth
            label="Description"
            margin="normal"
            multiline
            minRows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            sx={fieldSx}
          />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2, mb: 1 }}>
            Functional capabilities
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            What this role can do within its accessible pages.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {capabilities.map((cap, index) => (
              <Box key={`${index}-${cap}`} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  fullWidth
                  size="small"
                  value={cap}
                  onChange={(e) => updateCapability(index, e.target.value)}
                  sx={fieldSx}
                />
                <IconButton
                  color="error"
                  onClick={() => removeCapability(index)}
                  aria-label="Remove capability"
                  disabled={capabilities.length <= 1}
                >
                  <DeleteOutlineOutlinedIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
          <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Add capability"
              value={newCapability}
              onChange={(e) => setNewCapability(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCapability()
                }
              }}
              sx={fieldSx}
            />
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addCapability}
              sx={{ flexShrink: 0, fontWeight: 600, borderRadius: 2 }}
            >
              Add
            </Button>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={submitting}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            {submitting ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
