import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const srcRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    if (fs.statSync(p).isDirectory()) walk(p, acc)
    else if (p.endsWith('.tsx')) acc.push(p)
  }
  return acc
}

for (const file of walk(srcRoot)) {
  let content = fs.readFileSync(file, 'utf8')
  const original = content

  // Fix broken nested import from skeleton migration
  content = content.replace(
    /import \{\s*\nimport \{ ([^}]+) \} from '([^']+)'\s*\n/g,
    "import { $1 } from '$2'\nimport {\n",
  )

  // Remove unused CircularProgress from imports when only page-level was removed
  if (!content.match(/<CircularProgress/)) {
    content = content.replace(
      /import \{([^}]*)\} from '@mui\/material'/g,
      (match, imports) => {
        const parts = imports
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s && s !== 'CircularProgress')
        if (parts.length === 0) return ''
        return `import { ${parts.join(', ')} } from '@mui/material'`
      },
    )
    content = content.replace(/\n{3,}/g, '\n\n')
  }

  if (content !== original) {
    fs.writeFileSync(file, content)
    console.log('fixed', path.relative(srcRoot, file))
  }
}

console.log('import fix done')
