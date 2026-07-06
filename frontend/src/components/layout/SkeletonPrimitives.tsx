import { Box, Paper, Skeleton, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'
import type { ReactNode } from 'react'
import { ICS_PRIMARY, heroPaperSx, hexToRgba, infoGridSx, sectionPaperSx } from './DetailPagePrimitives'
import { listTablePaperSx } from './ListPagePrimitives'

const wave = { animation: 'wave' as const, variant: 'rounded' as const }

export function Skel({
  width,
  height = 16,
  sx,
}: {
  width?: number | string
  height?: number
  sx?: object
}) {
  return <Skeleton {...wave} width={width} height={height} sx={{ borderRadius: 1.5, ...sx }} />
}

/** Lazy route / auth bootstrap */
export function AppRouteSkeleton() {
  return (
    <Box sx={{ minHeight: '40vh', p: { xs: 2, sm: 3 }, maxWidth: 1200, mx: 'auto' }}>
      <DetailPageSkeleton showBack={false} showTabs={false} infoTiles={4} sections={1} />
    </Box>
  )
}

/** Standard list page table area */
export function ListLoadingState({
  rows = 8,
  columns = 5,
  showMobileCards = true,
}: {
  rows?: number
  columns?: number
  showMobileCards?: boolean
}) {
  return (
    <Paper elevation={0} sx={listTablePaperSx}>
      <ListTableSkeleton rows={rows} columns={columns} />
      {showMobileCards && (
        <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 2, p: 2 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <ListMobileCardSkeleton key={i} />
          ))}
        </Box>
      )}
    </Paper>
  )
}

export function ListTableSkeleton({ rows = 8, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <Box sx={{ display: { xs: 'none', md: 'block' }, p: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {Array.from({ length: columns }).map((_, i) => (
              <TableCell key={i}>
                <Skel width={i === 0 ? 120 : 80} height={14} />
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: rows }).map((_, row) => (
            <TableRow key={row}>
              {Array.from({ length: columns }).map((_, col) => (
                <TableCell key={col}>
                  <Skel width={col === 0 ? '70%' : '50%'} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  )
}

export function ListMobileCardSkeleton() {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: hexToRgba(ICS_PRIMARY, 0.02),
      }}
    >
      <Skel width="55%" height={20} sx={{ mb: 1 }} />
      <Skel width="80%" height={14} sx={{ mb: 1.25 }} />
      <Box sx={{ display: 'flex', gap: 0.75 }}>
        <Skel width={72} height={26} sx={{ borderRadius: 3 }} />
        <Skel width={88} height={26} sx={{ borderRadius: 3 }} />
      </Box>
    </Paper>
  )
}

/** Detail pages — hero + info grid + optional tabs */
export function DetailPageSkeleton({
  showBack = true,
  showTabs = true,
  infoTiles = 6,
  sections = 1,
}: {
  showBack?: boolean
  showTabs?: boolean
  infoTiles?: number
  sections?: number
}) {
  return (
    <Box>
      {showBack && <Skel width={140} height={36} sx={{ mb: 2, borderRadius: 2 }} />}
      <DetailHeroSkeleton />
      <InfoGridSkeleton count={infoTiles} />
      {showTabs && <DetailTabsSkeleton />}
      {Array.from({ length: sections }).map((_, i) => (
        <DetailSectionSkeleton key={i} lines={4} />
      ))}
    </Box>
  )
}

export function DetailHeroSkeleton() {
  return (
    <Paper elevation={0} sx={{ ...heroPaperSx, mb: 3 }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <Skeleton {...wave} width={48} height={48} sx={{ borderRadius: 2, flexShrink: 0, bgcolor: 'rgba(255,255,255,0.2)' }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Skeleton {...wave} width="45%" height={32} sx={{ bgcolor: 'rgba(255,255,255,0.25)', borderRadius: 1.5 }} />
          <Skeleton {...wave} width="65%" height={18} sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.18)', borderRadius: 1.5 }} />
          <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
            <Skeleton {...wave} width={88} height={28} sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)' }} />
            <Skeleton {...wave} width={100} height={28} sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)' }} />
          </Box>
        </Box>
        <Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'right' }}>
          <Skeleton {...wave} width={72} height={14} sx={{ bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 1 }} />
          <Skeleton {...wave} width={96} height={24} sx={{ mt: 0.5, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 1.5 }} />
        </Box>
      </Box>
    </Paper>
  )
}

export function InfoGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <Box sx={{ ...infoGridSx, mb: 3 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Paper
          key={i}
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 2.5,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: hexToRgba(ICS_PRIMARY, 0.02),
          }}
        >
          <Skel width="50%" height={12} />
          <Skel width="75%" height={20} sx={{ mt: 1 }} />
        </Paper>
      ))}
    </Box>
  )
}

export function DetailTabsSkeleton({ tabs = 4 }: { tabs?: number }) {
  return (
    <Box sx={{ mb: 2, display: 'flex', gap: 2, borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
      {Array.from({ length: tabs }).map((_, i) => (
        <Skel key={i} width={i === 0 ? 100 : 80} height={32} />
      ))}
    </Box>
  )
}

export function DetailSectionSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <Paper elevation={0} sx={{ ...sectionPaperSx }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Skel width={24} height={24} />
        <Skel width={160} height={22} />
      </Box>
      {Array.from({ length: lines }).map((_, i) => (
        <Skel key={i} width={i === lines - 1 ? '60%' : '100%'} sx={{ mb: 1.25 }} />
      ))}
    </Paper>
  )
}

/** Dashboard stat cards + panel */
export function DashboardSkeleton({ statCards = 4 }: { statCards?: number }) {
  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3 },
          mb: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: '#fff',
        }}
      >
        <Skel width={220} height={28} sx={{ mb: 1 }} />
        <Skel width="70%" height={16} />
      </Paper>
      <StatCardsSkeleton count={statCards} />
      <Paper elevation={0} sx={{ ...sectionPaperSx, mt: 2 }}>
        <Skel width={180} height={22} sx={{ mb: 2 }} />
        {Array.from({ length: 3 }).map((_, i) => (
          <Box key={i} sx={{ mb: 1.5, p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Skel width="40%" height={18} sx={{ mb: 1 }} />
            <Skel width="100%" height={8} sx={{ borderRadius: 4 }} />
          </Box>
        ))}
      </Paper>
    </Box>
  )
}

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: `repeat(${Math.min(count, 4)}, 1fr)` },
        gap: 2,
        mb: 3,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Paper
          key={i}
          elevation={0}
          sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: '#fff' }}
        >
          <Skel width="60%" height={12} />
          <Skel width="40%" height={32} sx={{ mt: 1 }} />
        </Paper>
      ))}
    </Box>
  )
}

/** CY allocation / card grid pages */
export function CardGridSkeleton({ cards = 2, columns = 2 }: { cards?: number; columns?: number }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: `repeat(${columns}, minmax(0, 1fr))` },
        gap: 2,
      }}
    >
      {Array.from({ length: cards }).map((_, i) => (
        <CardPanelSkeleton key={i} />
      ))}
    </Box>
  )
}

export function CardPanelSkeleton() {
  return (
    <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
      <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Skel width="35%" height={28} />
          <Skel width="55%" height={16} sx={{ mt: 1 }} />
          <Skel width="40%" height={12} sx={{ mt: 0.75 }} />
        </Box>
        <Skel width={48} height={48} sx={{ borderRadius: 2 }} />
      </Box>
      <Box sx={{ px: 2.5, pb: 2.5 }}>
        <Skel width="50%" height={14} sx={{ mb: 1 }} />
        <Skel width="100%" height={10} sx={{ borderRadius: 5, mb: 2 }} />
        <Skel width="45%" height={14} sx={{ mb: 0.75 }} />
        <Skel width="100%" height={8} sx={{ borderRadius: 4, mb: 1.5 }} />
        <Skel width="45%" height={14} sx={{ mb: 0.75 }} />
        <Skel width="100%" height={8} sx={{ borderRadius: 4 }} />
      </Box>
    </Paper>
  )
}

/** Form wizard initial load */
export function FormWizardSkeleton() {
  return (
    <Paper elevation={0} sx={{ ...sectionPaperSx }}>
      <Skel width={200} height={26} sx={{ mb: 3 }} />
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skel key={i} width={80} height={8} sx={{ flex: 1, borderRadius: 4 }} />
        ))}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skel key={i} width="100%" height={56} sx={{ borderRadius: 2 }} />
        ))}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
        <Skel width={100} height={40} sx={{ borderRadius: 2 }} />
        <Skel width={120} height={40} sx={{ borderRadius: 2 }} />
      </Box>
    </Paper>
  )
}

/** Compact inline — dialogs, notification list, document tabs */
export function InlineLoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Box sx={{ py: 2 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: 1.5, alignItems: 'center' }}>
          <Skel width={32} height={32} sx={{ borderRadius: 1.5, flexShrink: 0 }} />
          <Box sx={{ flex: 1 }}>
            <Skel width="70%" height={14} />
            <Skel width="45%" height={12} sx={{ mt: 0.5 }} />
          </Box>
        </Box>
      ))}
    </Box>
  )
}

/** Photo / document grid */
export function MediaGridSkeleton({ items = 6 }: { items?: number }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 1.5,
      }}
    >
      {Array.from({ length: items }).map((_, i) => (
        <Skeleton key={i} {...wave} height={120} sx={{ borderRadius: 2 }} />
      ))}
    </Box>
  )
}

/** QR code preview while image blob loads */
export function QrImageSkeleton({ size = 280, inline = false }: { size?: number; inline?: boolean }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        ...(inline ? { py: 0, mb: 0 } : { py: 4, mb: 2 }),
      }}
    >
      <Skeleton
        {...wave}
        width={size}
        height={size}
        sx={{ borderRadius: 2, maxWidth: '100%' }}
      />
    </Box>
  )
}

/** Capacity / utilization bar placeholder */
export function ProgressBarSkeleton({ height = 8 }: { height?: number }) {
  return <Skel width="100%" height={height} sx={{ borderRadius: height / 2 }} />
}

/** Chip row placeholder (slot picker, filters) */
export function ChipRowSkeleton({ chips = 5 }: { chips?: number }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
      {Array.from({ length: chips }).map((_, i) => (
        <Skel key={i} width={i % 2 === 0 ? 88 : 72} height={32} sx={{ borderRadius: 4 }} />
      ))}
    </Box>
  )
}

/** Circular avatar / thumbnail placeholder */
export function AvatarSkeleton({ size = 96 }: { size?: number }) {
  return (
    <Skeleton
      {...wave}
      variant="circular"
      width={size}
      height={size}
      sx={{ mx: 'auto' }}
    />
  )
}

/** Image / document preview while signed URL resolves */
export function AssetPreviewSkeleton({
  height = 320,
  maxHeight,
}: {
  height?: number
  maxHeight?: number
}) {
  return (
    <Skeleton
      {...wave}
      width="100%"
      height={height}
      sx={{
        borderRadius: 2,
        maxHeight: maxHeight ?? height,
      }}
    />
  )
}

/** Dialog content while a mutation is in progress */
export function DialogBusySkeleton({ message }: { message?: string }) {
  return (
    <Box sx={{ py: 3 }}>
      <InlineLoadingSkeleton rows={2} />
      {message ? (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Skel width="80%" height={14} sx={{ mx: 'auto' }} />
        </Box>
      ) : null}
    </Box>
  )
}

/** Wrap content with skeleton overlay area */
export function SkeletonBlock({ children, loading }: { children: ReactNode; loading: boolean }) {
  if (loading) return <InlineLoadingSkeleton />
  return <>{children}</>
}
