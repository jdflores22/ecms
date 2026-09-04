import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import {
  Box,
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  ListDesktopOnly,
  ListLoadingState,
  ListMobileCard,
  ListMobileChipRow,
  ListMobileMeta,
  ListMobileOnly,
  ListMobileTitle,
  LIST_PRIMARY,
  listMobileActionsSx,
  listPageRootSx,
  listTablePaperSx,
} from '../../components/layout/ListPagePrimitives'
import { statementOfAccountApi, type StatementOfAccount } from '../../services/api'
import { formatPeso } from '../../utils/datetime'

const primaryDark = LIST_PRIMARY

function normalizeStatus(status: StatementOfAccount['status']) {
  if (typeof status === 'string') return status
  return ['Draft', 'Issued', 'ForVerification', 'Paid', 'Cancelled'][status] ?? 'Draft'
}

export default function TruckerStatementOfAccountsPage() {
  const [items, setItems] = useState<StatementOfAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await statementOfAccountApi.list()
      setItems(data)
    } catch {
      setError('Failed to load statements of account.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openItems = items.filter((i) => {
    const s = normalizeStatus(i.status)
    return s === 'Issued' || s === 'ForVerification'
  })

  return (
    <Box sx={listPageRootSx}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 3 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            bgcolor: 'rgba(11, 61, 145, 0.08)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <DescriptionOutlinedIcon sx={{ color: primaryDark }} />
        </Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: primaryDark }}>
            Statements of account
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Collated demurrage billings from your shipping line. Pay the amount due on each open SOA.
          </Typography>
        </Box>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Paper elevation={0} sx={{ ...listTablePaperSx, mb: 2 }}>
        {loading ? (
          <ListLoadingState />
        ) : items.length === 0 ? (
          <Typography sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
            No statements of account yet.
          </Typography>
        ) : (
          <>
            <ListDesktopOnly>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>SOA ref</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Shipping line</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Total</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Amount due</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item) => {
                      const status = normalizeStatus(item.status)
                      return (
                        <TableRow key={item.id} hover>
                          <TableCell>{item.referenceNo}</TableCell>
                          <TableCell>{item.shippingLineName}</TableCell>
                          <TableCell align="right">{formatPeso(item.totalAmount)}</TableCell>
                          <TableCell align="right">{formatPeso(item.amountDue)}</TableCell>
                          <TableCell>
                            <Chip size="small" label={status} color={status === 'Paid' ? 'success' : status === 'Issued' ? 'warning' : 'default'} />
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              component={RouterLink}
                              to={`/trucker/statement-of-accounts/${item.id}`}
                              endIcon={<OpenInNewIcon />}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </ListDesktopOnly>

            <ListMobileOnly>
              {items.map((item) => {
                const status = normalizeStatus(item.status)
                return (
                  <ListMobileCard key={item.id}>
                    <ListMobileTitle>{item.referenceNo}</ListMobileTitle>
                    <ListMobileMeta>{item.shippingLineName}</ListMobileMeta>
                    <ListMobileChipRow>
                      <Chip size="small" label={`Due ${formatPeso(item.amountDue)}`} />
                      <Chip size="small" label={status} />
                    </ListMobileChipRow>
                    <Box sx={listMobileActionsSx}>
                      <Button size="small" variant="outlined" component={RouterLink} to={`/trucker/statement-of-accounts/${item.id}`}>
                        View
                      </Button>
                    </Box>
                  </ListMobileCard>
                )
              })}
            </ListMobileOnly>
          </>
        )}
      </Paper>

      {!loading && openItems.length > 0 && (
        <Typography variant="body2" color="text.secondary">
          {openItems.length} open statement{openItems.length === 1 ? '' : 's'} requiring attention.
        </Typography>
      )}
    </Box>
  )
}
