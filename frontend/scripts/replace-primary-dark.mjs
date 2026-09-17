import fs from 'fs'
import path from 'path'

const root = path.join(process.cwd(), 'src')
const files = []

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (/\.(tsx|ts)$/.test(entry.name)) files.push(full)
  }
}

walk(root)

let updated = 0
for (const file of files) {
  let source = fs.readFileSync(file, 'utf8')
  if (!source.includes("const primaryDark = '#0B3D91'")) continue

  const rel = path.relative(root, file).replace(/\\/g, '/')
  const depth = rel.split('/').length - 1
  const themeImport = `${'../'.repeat(depth)}theme/colors`

  source = source.replace(/\r?\nconst primaryDark = '#0B3D91'\r?\n/, '\n')

  if (!/from ['"].*theme\/colors['"]/.test(source)) {
    const firstImport = source.match(/^import .+$/m)
    const importLine = `import { ICS_PRIMARY } from '${themeImport}'`
    source = firstImport
      ? source.replace(firstImport[0], `${firstImport[0]}\n${importLine}`)
      : `${importLine}\n${source}`
  } else if (!/\bICS_PRIMARY\b/.test(source)) {
    source = source.replace(
      /import \{([^}]*)\} from (['"].*theme\/colors['"])/,
      (match, names, from) => `import {${names.trim()}, ICS_PRIMARY } from ${from}`,
    )
  }

  source = source.replace(/\bprimaryDark\b/g, 'ICS_PRIMARY')
  fs.writeFileSync(file, source)
  updated++
  console.log(file)
}

console.log(`updated ${updated} files`)
