import { ListLoadingState } from '../../components/layout/ListPagePrimitives'
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Paper, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, Navigate, useSearchParams } from 'react-router-dom'
import { ROLE_CATALOG, roleLabel } from '../../config/roleConfig'
import {
  authApi,
  userApi,
  type AdminLookups,
  type UpdateUserRequest,
  type UserAdmin,
} from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import {
  ListDesktopOnly,
  ListMobileCard,
  ListMobileChipRow,
  ListMobileMeta,
  ListMobileOnly,
  ListMobileTitle,
  listHeroActionSx,
  listMobileActionsSx,
  listPageRootSx,
  listTablePaperSx,
} from '../../components/layout/ListPagePrimitives'

const primaryDark = '#0B3D91'
const ROLES = ROLE_CATALOG.map((r) => r.name)
const STATUSES = ['Active', 'Inactive', 'Suspended']

const statusColor: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  Active: 'success',
  Inactive: 'default',
  Suspended: 'error',
}

const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } }

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
  }
  return fallback
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

const emptyCreate = {
  username: '',
  email: '',
  password: '',
  fullName: '',
  role: 'Trucker',
  shippingLineId: '' as number | '',
  depotId: '' as number | '',
}

export default function UsersPage() {
  const currentUser = useAppSelector((s) => s.auth.user)
  const [searchParams, setSearchParams] = useSearchParams()
  const roleFilter = searchParams.get('role') ?? ''
  const [users, setUsers] = useState<UserAdmin[]>([])
  const [lookups, setLookups] = useState<AdminLookups | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selected, setSelected] = useState<UserAdmin | null>(null)
  const [createForm, setCreateForm] = useState(emptyCreate)
  const [editForm, setEditForm] = useState<UpdateUserRequest>({
    email: '',
    fullName: '',
    role: 'Trucker',
    status: 'Active',
    shippingLineId: null,
    depotId: null,
  })
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    Promise.all([userApi.list(), userApi.lookups()])
      .then(([u, l]) => {
        setUsers(u.data)
        setLookups(l.data)
      })
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const displayedUsers = useMemo(() => {
    if (!roleFilter) return users
    return users.filter((u) => u.role === roleFilter)
  }, [users, roleFilter])

  const summary = useMemo(() => {
    const active = users.filter((u) => u.status === 'Active').length
    const suspended = users.filter((u) => u.status === 'Suspended').length
    return { total: users.length, active, suspended, showing: displayedUsers.length }
  }, [users, displayedUsers.length])

  const openEdit = (user: UserAdmin) => {
    setSelected(user)
    setEditForm({
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      shippingLineId: user.shippingLineId ?? null,
      depotId: user.depotId ?? null,
    })
    setEditOpen(true)
  }

  const handleCreate = async () => {
    setSubmitting(true)
    setError('')
    try {
      await authApi.register({
        username: createForm.username,
        email: createForm.email,
        password: createForm.password,
        fullName: createForm.fullName,
        role: createForm.role,
        shippingLineId:
          createForm.role === 'ShippingLineEvaluator' && createForm.shippingLineId !== ''
            ? Number(createForm.shippingLineId)
            : null,
        depotId:
          createForm.role === 'DepotPersonnel' && createForm.depotId !== ''
            ? Number(createForm.depotId)
            : null,
      })
      setCreateOpen(false)
      setCreateForm(emptyCreate)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to create user.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async () => {
    if (!selected) return
    setSubmitting(true)
    setError('')
    try {
      await userApi.update(selected.id, {
        ...editForm,
        shippingLineId:
          editForm.role === 'ShippingLineEvaluator' ? editForm.shippingLineId ?? null : null,
        depotId: editForm.role === 'DepotPersonnel' ? editForm.depotId ?? null : null,
      })
      setEditOpen(false)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to update user.'))
    } finally {
      setSubmitting(false)
    }
  }

  const renderRoleFields = (
    role: string,
    shippingLineId: number | '' | null | undefined,
    depotId: number | '' | null | undefined,
    onShippingLine: (v: number | '') => void,
    onDepot: (v: number | '') => void,
  ) => (
    <>
      {role === 'ShippingLineEvaluator' && (
        <FormControl fullWidth margin="normal" required sx={fieldSx}>
          <InputLabel>Shipping line</InputLabel>
          <Select
            label="Shipping line"
            value={shippingLineId === null || shippingLineId === undefined ? '' : shippingLineId}
            onChange={(e) => onShippingLine(e.target.value as number | '')}
          >
            {lookups?.shippingLines.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name} ({s.code})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
      {role === 'DepotPersonnel' && (
        <FormControl fullWidth margin="normal" required sx={fieldSx}>
          <InputLabel>Depot</InputLabel>
          <Select
            label="Depot"
            value={depotId === null || depotId === undefined ? '' : depotId}
            onChange={(e) => onDepot(e.target.value as number | '')}
          >
            {lookups?.depots.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    </>
  )

  if (currentUser?.role !== 'Administrator') {
    return <Navigate to="/" replace />
  }

  return (
    <Box sx={listPageRootSx}>
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
              <PeopleOutlinedIcon />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                User Management
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.82)', mt: 0.5, maxWidth: 520 }}>
                {roleFilter
                  ? `Showing users with role: ${roleLabel(roleFilter)}`
                  : 'Create users, assign roles, and link shipping lines or depots.'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ ...listMobileActionsSx, mt: 0, flexShrink: 0 }}>
            {roleFilter && (
              <Button
                variant="outlined"
                onClick={() => setSearchParams({})}
                sx={{
                  color: '#fff',
                  borderColor: 'rgba(255,255,255,0.45)',
                  fontWeight: 600,
                  '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
                }}
              >
                Clear filter
              </Button>
            )}
            <Button
              component={RouterLink}
              to="/admin/roles"
              variant="outlined"
              sx={{
                color: '#fff',
                borderColor: 'rgba(255,255,255,0.45)',
                fontWeight: 600,
                '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              View roles
            </Button>
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={() => setCreateOpen(true)}
              sx={listHeroActionSx}
            >
              New user
            </Button>
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {roleFilter && (
        <Chip
          label={`Role: ${roleLabel(roleFilter)}`}
          onDelete={() => setSearchParams({})}
          sx={{ mb: 2, fontWeight: 600, bgcolor: hexToRgba(primaryDark, 0.08), color: primaryDark }}
        />
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <SummaryCard label="Total users" value={summary.total} color={primaryDark} />
        <SummaryCard label="Active" value={summary.active} color="#2E7D32" />
        <SummaryCard label="Suspended" value={summary.suspended} color="#D32F2F" />
        <SummaryCard
          label={roleFilter ? 'In filter' : 'Listed'}
          value={summary.showing}
          color="#00A3E0"
        />
      </Box>

      <Paper elevation={0} sx={listTablePaperSx}>
        {loading ? (
          <ListLoadingState />
        ) : displayedUsers.length === 0 ? (
          <Typography sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
            No users found.
          </Typography>
        ) : (
          <>
            <ListMobileOnly>
              {displayedUsers.map((user) => (
                <ListMobileCard key={user.id}>
                  <ListMobileChipRow>
                    <ListMobileTitle>{user.username}</ListMobileTitle>
                    <Chip
                      label={user.status}
                      color={statusColor[user.status] ?? 'default'}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </ListMobileChipRow>
                  <ListMobileMeta>{user.fullName}</ListMobileMeta>
                  <ListMobileMeta>{user.email}</ListMobileMeta>
                  <ListMobileChipRow>
                    <Chip label={roleLabel(user.role)} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                    {(user.shippingLineName ?? user.depotName) && (
                      <Chip
                        label={user.shippingLineName ?? user.depotName ?? ''}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </ListMobileChipRow>
                  <Box sx={listMobileActionsSx}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<EditOutlinedIcon />}
                      onClick={() => openEdit(user)}
                      sx={{ fontWeight: 600, borderRadius: 2 }}
                    >
                      Edit
                    </Button>
                  </Box>
                </ListMobileCard>
              ))}
            </ListMobileOnly>

            <ListDesktopOnly>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow
                      sx={{
                        bgcolor: hexToRgba(primaryDark, 0.04),
                        '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary', py: 1.75 },
                      }}
                    >
                      <TableCell>Username</TableCell>
                      <TableCell>Full name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Assignment</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {displayedUsers.map((user) => (
                      <TableRow key={user.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                        <TableCell sx={{ fontWeight: 700, color: primaryDark }}>{user.username}</TableCell>
                        <TableCell>{user.fullName}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {user.email}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={roleLabel(user.role)} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                        </TableCell>
                        <TableCell>{user.shippingLineName ?? user.depotName ?? '—'}</TableCell>
                        <TableCell>
                          <Chip
                            label={user.status}
                            color={statusColor[user.status] ?? 'default'}
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditOutlinedIcon />}
                            onClick={() => openEdit(user)}
                            sx={{ fontWeight: 600, borderRadius: 2 }}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </ListDesktopOnly>
          </>
        )}
      </Paper>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Create user</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Username"
            margin="normal"
            required
            value={createForm.username}
            onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            label="Full name"
            margin="normal"
            required
            value={createForm.fullName}
            onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            margin="normal"
            required
            value={createForm.email}
            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            margin="normal"
            required
            value={createForm.password}
            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
            sx={fieldSx}
          />
          <FormControl fullWidth margin="normal" required sx={fieldSx}>
            <InputLabel>Role</InputLabel>
            <Select
              label="Role"
              value={createForm.role}
              onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
            >
              {ROLES.map((r) => (
                <MenuItem key={r} value={r}>
                  {roleLabel(r)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {renderRoleFields(
            createForm.role,
            createForm.shippingLineId,
            createForm.depotId,
            (v) => setCreateForm({ ...createForm, shippingLineId: v }),
            (v) => setCreateForm({ ...createForm, depotId: v }),
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={submitting}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            {submitting ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit user — {selected?.username}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Full name"
            margin="normal"
            required
            value={editForm.fullName}
            onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            margin="normal"
            required
            value={editForm.email}
            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            sx={fieldSx}
          />
          <FormControl fullWidth margin="normal" required sx={fieldSx}>
            <InputLabel>Role</InputLabel>
            <Select
              label="Role"
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
            >
              {ROLES.map((r) => (
                <MenuItem key={r} value={r}>
                  {roleLabel(r)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal" required sx={fieldSx}>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            >
              {STATUSES.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {renderRoleFields(
            editForm.role,
            editForm.shippingLineId,
            editForm.depotId,
            (v) => setEditForm({ ...editForm, shippingLineId: v === '' ? null : v }),
            (v) => setEditForm({ ...editForm, depotId: v === '' ? null : v }),
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpdate}
            disabled={submitting}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
