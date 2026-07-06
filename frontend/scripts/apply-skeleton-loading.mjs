import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const srcRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')
const layoutDir = path.join(srcRoot, 'components', 'layout')

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    if (fs.statSync(p).isDirectory()) walk(p, acc)
    else if (p.endsWith('.tsx')) acc.push(p)
  }
  return acc
}

function relImport(file, moduleFile) {
  const fromDir = path.dirname(file)
  let rel = path.relative(fromDir, path.join(layoutDir, moduleFile)).replace(/\\/g, '/')
  if (!rel.startsWith('.')) rel = `./${rel}`
  return rel.replace(/\.tsx?$/, '')
}

function addImport(content, file, symbol, moduleFile) {
  if (!content.includes(symbol)) return content
  if (new RegExp(`import\\s*\\{[^}]*\\b${symbol}\\b`).test(content)) return content
  const line = `import { ${symbol} } from '${relImport(file, moduleFile)}'`
  const m = content.match(/^import .+$/m)
  if (!m) return `${line}\n${content}`
  return content.replace(m[0], `${m[0]}\n${line}`)
}

function stripCircularProgressImport(content) {
  if (/CircularProgress/.test(content)) return content
  return content
    .replace(/import\s*\{([^}]+)\}\s*from\s*'@mui\/material'/g, (_, imports) => {
      const parts = imports
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s && s !== 'CircularProgress')
      if (parts.length === 0) return ''
      return `import { ${parts.join(', ')} } from '@mui/material'`
    })
    .replace(/\n{3,}/g, '\n\n')
}

const pageLoadSpinner =
  /<(?:Box|Paper)[^>]*>[\s\S]*?<CircularProgress sx=\{\{ color: primaryDark \}\} \/>[\s\S]*?<\/(?:Box|Paper)>/g

const fileOverrides = new Map([
  ['pages/DashboardPage.tsx', 'DashboardSkeleton'],
  ['pages/evaluations/CyAllocationPage.tsx', 'CyAllocationPageSkeleton'],
  ['pages/trucker/WithdrawalNewPage.tsx', 'FormWizardSkeleton'],
  ['pages/evaluations/AtwNewPage.tsx', 'FormWizardSkeleton'],
  ['pages/preAdvice/PreAdviceNewPage.tsx', 'FormWizardSkeleton'],
  ['pages/evaluations/AtwDetailPage.tsx', 'DetailLoadingState'],
  ['pages/trucker/WithdrawalDetailPage.tsx', 'DetailLoadingState'],
  ['pages/depot/WithdrawalDetailPage.tsx', 'DetailLoadingState'],
  ['pages/depot/ScheduleDetailPage.tsx', 'DetailLoadingState'],
  ['pages/trucker/QrPrintPage.tsx', 'DetailLoadingState'],
  ['components/qr/BookingQrPreviewDialog.tsx', 'InlineLoadingSkeleton'],
  ['components/depot/DepotScheduleTabPanels.tsx', 'MediaGridSkeleton'],
  ['components/preAdvice/ContainerIdentityPhotos.tsx', 'MediaGridSkeleton'],
  ['pages/trucker/ReturnDetailPage.tsx', null], // dialog spinner only after page load
])

function skeletonForFile(relPath, match) {
  if (fileOverrides.has(relPath)) {
    const v = fileOverrides.get(relPath)
    if (v === null) return null
    if (v === 'CyAllocationPageSkeleton') return '<><StatCardsSkeleton count={4} /><CardGridSkeleton cards={2} /></>'
    if (v === 'DetailLoadingState') return '<DetailLoadingState />'
    if (v === 'DashboardSkeleton') return '<DashboardSkeleton />'
    if (v === 'FormWizardSkeleton') return '<FormWizardSkeleton />'
    if (v === 'InlineLoadingSkeleton') return '<InlineLoadingSkeleton rows={4} />'
    if (v === 'MediaGridSkeleton') return '<MediaGridSkeleton />'
    return `<${v} />`
  }
  if (match.includes('<Table') || relPath.includes('Page.tsx')) return '<ListLoadingState />'
  return '<ListLoadingState />'
}

function symbolsForReplacement(replacement) {
  const syms = []
  if (replacement.includes('ListLoadingState')) syms.push(['ListLoadingState', 'ListPagePrimitives.tsx'])
  if (replacement.includes('DetailLoadingState')) syms.push(['DetailLoadingState', 'DetailPagePrimitives.tsx'])
  if (replacement.includes('DashboardSkeleton')) syms.push(['DashboardSkeleton', 'SkeletonPrimitives.tsx'])
  if (replacement.includes('FormWizardSkeleton')) syms.push(['FormWizardSkeleton', 'SkeletonPrimitives.tsx'])
  if (replacement.includes('CardGridSkeleton')) syms.push(['CardGridSkeleton', 'SkeletonPrimitives.tsx'])
  if (replacement.includes('StatCardsSkeleton')) syms.push(['StatCardsSkeleton', 'SkeletonPrimitives.tsx'])
  if (replacement.includes('InlineLoadingSkeleton')) syms.push(['InlineLoadingSkeleton', 'SkeletonPrimitives.tsx'])
  if (replacement.includes('MediaGridSkeleton')) syms.push(['MediaGridSkeleton', 'SkeletonPrimitives.tsx'])
  return syms
}

// App.tsx manual
const appPath = path.join(srcRoot, 'App.tsx')
let app = fs.readFileSync(appPath, 'utf8')
if (!app.includes('AppRouteSkeleton')) {
  app = app.replace(
    "import { Box } from '@mui/material'",
    "import { Box } from '@mui/material'\nimport { AppRouteSkeleton } from './components/layout/SkeletonPrimitives'",
  )
  app = app.replace(
    /function RouteFallback\(\) \{[\s\S]*?\n\}/,
    'function RouteFallback() {\n  return <AppRouteSkeleton />\n}',
  )
  app = app.replace(
    /if \(!authReady\) \{\s*return \(\s*<Box sx=\{\{ display: 'grid', placeItems: 'center', minHeight: '100vh' \}\}>\s*<CircularProgress \/>\s*<\/Box>\s*\)\s*\}/,
    'if (!authReady) {\n    return <AppRouteSkeleton />\n  }',
  )
  fs.writeFileSync(appPath, app)
  console.log('updated App.tsx')
}

for (const file of walk(srcRoot)) {
  const rel = path.relative(srcRoot, file).replace(/\\/g, '/')
  if (rel.includes('SkeletonPrimitives') || rel.includes('DetailPagePrimitives') || rel === 'App.tsx') continue

  let content = fs.readFileSync(file, 'utf8')
  const original = content

  // Only replace page-level loading blocks (preceded by loading ?)
  content = content.replace(
    /(\{loading \?\s*\(\s*)<(?:Box|Paper)[^>]*>[\s\S]*?<CircularProgress sx=\{\{ color: primaryDark \}\} \/>[\s\S]*?<\/(?:Box|Paper)>(\s*\))/g,
    (full, prefix, suffix) => {
      const replacement = skeletonForFile(rel, full)
      if (!replacement) return full
      return `${prefix}${replacement}${suffix}`
    },
  )

  // Section loaders: txLoading, shippingLoading, etc.
  content = content.replace(
    /(\{(?:tx|shipping|depot|capacity|allocations)Loading \?\s*\(\s*)<(?:Box|Paper)[^>]*>[\s\S]*?<CircularProgress sx=\{\{ color: primaryDark \}\} \/>[\s\S]*?<\/(?:Box|Paper)>(\s*\))/g,
    '$1<ListLoadingState rows={6} />$2',
  )

  // documentsLoading in tab panels
  content = content.replace(
    /(\{documentsLoading \?\s*\(\s*)<(?:Box|Paper)[^>]*>[\s\S]*?<CircularProgress sx=\{\{ color: primaryDark \}\} \/>[\s\S]*?<\/(?:Box|Paper)>(\s*\))/g,
    '$1<MediaGridSkeleton items={4} />$2',
  )

  // Qr dialog inline
  content = content.replace(
    /(\{loading \?\s*\(\s*)<Box sx=\{\{ display: 'flex', justifyContent: 'center', py: 4 \}\}>[\s\S]*?<CircularProgress sx=\{\{ color: primaryDark \}\} \/>[\s\S]*?<\/Box>(\s*\))/g,
    '$1<InlineLoadingSkeleton rows={3} />$2',
  )

  if (content === original) continue

  for (const [sym, mod] of symbolsForReplacement(content)) {
    content = addImport(content, file, sym, mod)
  }
  content = stripCircularProgressImport(content)

  // Cy allocation special import
  if (content.includes('StatCardsSkeleton') && content.includes('CardGridSkeleton')) {
    const rel = relImport(file, 'SkeletonPrimitives.tsx')
    content = content.replace(
      /import \{ CardGridSkeleton \} from '[^']+'/,
      `import { CardGridSkeleton, StatCardsSkeleton } from '${rel}'`,
    )
    content = content.replace(/import \{ StatCardsSkeleton \} from '[^']+'\n/, '')
  }

  fs.writeFileSync(file, content)
  console.log('updated', rel)
}

console.log('done')
