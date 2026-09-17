import { Box, Paper, TablePagination, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { LIST_PAGE_SIZE } from '../../hooks/useClientPagination'
import { hexToRgba, ICS_PRIMARY } from '../../theme/colors'
import { portalColors, portalCardShadow } from '../../theme/portalTheme'
import {
  listHeroOutlineActionSx,
  listHeroPrimaryActionSx,
  pageHeroPaperSx,
  pageHeroSubtitleSx,
  pageHeroTitleSx,
  PageHero,
} from './PageHeroPrimitives'

export {
  PageHero,
  pageHeroPaperSx,
  pageHeroTitleSx,
  pageHeroSubtitleSx,
  listHeroPrimaryActionSx,
  listHeroOutlineActionSx,
  hexToRgba,
}
export const LIST_PRIMARY = ICS_PRIMARY

export const listPageRootSx = {
  minWidth: 0,
  maxWidth: '100%',
}

export const listTablePaperSx = {
  borderRadius: '0.875rem',
  border: `1px solid ${portalColors.border}`,
  bgcolor: portalColors.bgWhite,
  boxShadow: portalCardShadow,
  overflow: 'hidden',
}

export const listMobileStackSx = {
  display: { xs: 'flex', md: 'none' },
  flexDirection: 'column',
  gap: 2,
  p: 2,
}

export const listDesktopTableSx = {
  display: { xs: 'none', md: 'block' },
}

/** @deprecated Use listHeroPrimaryActionSx */
export const listHeroActionSx = listHeroPrimaryActionSx

/** @deprecated Use listHeroOutlineActionSx */
export const listHeroOutlinedActionSx = listHeroOutlineActionSx

export const listMobileActionsSx = {
  display: 'flex',
  flexDirection: { xs: 'column', sm: 'row' },
  gap: 1,
  mt: 1.5,
  '& .MuiButton-root': { width: { xs: '100%', sm: 'auto' } },
}

export function ListMobileOnly({ children }: { children: ReactNode }) {
  return (
    <Box sx={listMobileStackSx}>
      {children}
    </Box>
  )
}

export function ListDesktopOnly({ children }: { children: ReactNode }) {
  return <Box sx={listDesktopTableSx}>{children}</Box>
}

type ListMobileCardProps = {
  onClick?: () => void
  children: ReactNode
}

export function ListMobileCard({ onClick, children }: ListMobileCardProps) {
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: '0.875rem',
        border: `1px solid ${portalColors.border}`,
        bgcolor: portalColors.bgWhite,
        boxShadow: portalCardShadow,
        cursor: onClick ? 'pointer' : 'default',
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      {children}
    </Paper>
  )
}

export function ListMobileTitle({ children }: { children: ReactNode }) {
  return (
    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: LIST_PRIMARY, wordBreak: 'break-all' }}>
      {children}
    </Typography>
  )
}

export function ListMobileMeta({ children }: { children: ReactNode }) {
  return (
    <Typography
      component="div"
      variant="body2"
      color="text.secondary"
      sx={{ mt: 0.5, wordBreak: 'break-word' }}
    >
      {children}
    </Typography>
  )
}

export function ListMobileChipRow({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.25, minWidth: 0 }}>
      {children}
    </Box>
  )
}

type ListTablePaginationProps = {
  count: number
  page: number
  onPageChange: (page: number) => void
}

export function ListTablePagination({ count, page, onPageChange }: ListTablePaginationProps) {
  if (count <= LIST_PAGE_SIZE) return null

  return (
    <TablePagination
      component="div"
      count={count}
      page={page}
      onPageChange={(_, nextPage) => onPageChange(nextPage)}
      rowsPerPage={LIST_PAGE_SIZE}
      rowsPerPageOptions={[LIST_PAGE_SIZE]}
      labelDisplayedRows={({ from, to, count: total }) => `${from}–${to} of ${total}`}
      sx={{
        borderTop: '1px solid',
        borderColor: 'divider',
        '& .MuiTablePagination-selectLabel': { display: 'none' },
        '& .MuiTablePagination-select': { display: 'none' },
        '& .MuiTablePagination-input': { display: 'none' },
      }}
    />
  )
}

export { ListLoadingState, ListTableSkeleton, ListMobileCardSkeleton } from './SkeletonPrimitives'
export {
  StatCardsSkeleton,
  ProgressBarSkeleton,
  ChipRowSkeleton,
  AvatarSkeleton,
  AssetPreviewSkeleton,
  DialogBusySkeleton,
  SkeletonBlock,
} from './SkeletonPrimitives'
