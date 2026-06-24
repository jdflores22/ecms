/**
 * Regenerates the ECMS Project Tracker canvas from docs/tasks.json.
 * Run after updating task status: node scripts/sync-project-tracker.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const tasksPath = join(root, 'docs', 'tasks.json')
const canvasPath = join(
  process.env.USERPROFILE ?? process.env.HOME ?? '',
  '.cursor',
  'projects',
  'c-xampp-htdocs-ecms',
  'canvases',
  'ecms-project-tracker.canvas.tsx',
)

const data = JSON.parse(readFileSync(tasksPath, 'utf8'))
const mvpTasks = data.tasks.filter((t) => /^S[1-7]$/.test(t.sprint))

const sprintProgress = data.sprints.map((s) => {
  const inSprint = data.tasks.filter((t) => t.sprint === s.id)
  const done = inSprint.filter((t) => t.status === 'done').length
  const computed = inSprint.length ? Math.round((done / inSprint.length) * 100) : 0
  return { ...s, computed, taskDone: done, taskTotal: inSprint.length }
})

const nextUp = mvpTasks
  .filter((t) => t.status === 'todo' && (t.priority === 'P0' || t.priority === 'P1'))
  .slice(0, 6)
  .map((t) => `${t.id} — ${t.title}`)

const tasksLiteral = mvpTasks
  .map(
    (t) =>
      `  { id: '${t.id}', sprint: '${t.sprint}', module: '${t.module}', title: ${JSON.stringify(t.title)}, layer: '${t.layer}', priority: '${t.priority}', status: '${t.status}' },`,
  )
  .join('\n')

const sprintsLiteral = sprintProgress
  .map((s) => `  { id: '${s.id}', name: ${JSON.stringify(s.name)}, progress: ${s.progress}, computed: ${s.computed} },`)
  .join('\n')

const nextUpLiteral = nextUp.map((n) => `  ${JSON.stringify(n)},`).join('\n')

const canvas = `import {
  Card,
  CardBody,
  CardHeader,
  Grid,
  H1,
  H2,
  H3,
  Pill,
  Row,
  Stack,
  Stat,
  Table,
  Text,
  TodoList,
  UsageBar,
  useHostTheme,
} from 'cursor/canvas'

type TaskStatus = 'done' | 'in_progress' | 'todo'

interface Task {
  id: string
  sprint: string
  module: string
  title: string
  layer: string
  priority: string
  status: TaskStatus
}

interface Sprint {
  id: string
  name: string
  progress: number
  computed: number
}

const meta = {
  overallProgress: ${data.meta.overallProgress},
  lastUpdated: '${data.meta.lastUpdated}',
  phase: '${data.meta.phase}',
  activeTrack: '${data.meta.activeTrack ?? ''}',
}

const sprints: Sprint[] = [
${sprintsLiteral}
]

const tasks: Task[] = [
${tasksLiteral}
]

const doneCount = tasks.filter((t) => t.status === 'done').length
const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length
const todoCount = tasks.filter((t) => t.status === 'todo').length
const total = tasks.length
const taskCompletionPct = Math.round((doneCount / total) * 100)

const nextUp: string[] = [
${nextUpLiteral}
]

function statusTone(status: TaskStatus): 'success' | 'warning' | 'neutral' {
  if (status === 'done') return 'success'
  if (status === 'in_progress') return 'warning'
  return 'neutral'
}

function toTodoStatus(status: TaskStatus): 'completed' | 'in_progress' | 'pending' {
  if (status === 'done') return 'completed'
  if (status === 'in_progress') return 'in_progress'
  return 'pending'
}

export default function EcmsProjectTracker() {
  const theme = useHostTheme()

  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress')
  const todoTasks = tasks.filter((t) => t.status === 'todo' && (t.priority === 'P0' || t.priority === 'P1'))
  const doneTasks = tasks.filter((t) => t.status === 'done')

  const sprintRows = sprints.map((s) => ({
    sprint: s.id,
    name: s.name,
    progress: \`\${s.progress}% (tasks \${s.computed}%)\`,
    bar: s.progress,
  }))

  return (
    <Stack style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <H1>ECMS Project Tracker</H1>
      <Text style={{ color: theme.text.secondary }}>
        {meta.phase} · Last synced {meta.lastUpdated} · Active track: {meta.activeTrack || '—'}
      </Text>
      <Text style={{ color: theme.text.secondary, fontSize: 12 }}>
        Snapshot from docs/tasks.json — run node scripts/sync-project-tracker.mjs after status changes
      </Text>
      <div style={{ height: 20 }} />

      <Row style={{ gap: 16, flexWrap: 'wrap' }}>
        <Stat label="MVP progress (plan)" value={\`\${meta.overallProgress}%\`} tone="info" />
        <Stat label="Tasks done (MVP)" value={\`\${taskCompletionPct}%\`} tone="info" />
        <Stat label="Done" value={String(doneCount)} tone="success" />
        <Stat label="In progress" value={String(inProgressCount)} tone="warning" />
        <Stat label="Todo" value={String(todoCount)} />
      </Row>

      <div style={{ height: 24 }} />

      <UsageBar
        total={100}
        topLeftLabel="MVP task completion"
        topRightLabel={\`\${doneCount} / \${total} tasks done\`}
        segments={[
          { id: 'done', value: doneCount, color: 'green' },
          { id: 'in_progress', value: inProgressCount, color: 'yellow' },
          { id: 'todo', value: todoCount, color: 'gray' },
        ]}
      />

      <div style={{ height: 28 }} />
      <H2>Sprint progress</H2>
      <Text style={{ color: theme.text.secondary, fontSize: 12 }}>
        Plan % from tasks.json · parenthetical = done tasks / sprint total
      </Text>
      <div style={{ height: 12 }} />

      <Table
        headers={['Sprint', 'Name', 'Progress']}
        rows={sprintRows.map((s) => [s.sprint, s.name, s.progress])}
      />

      <div style={{ height: 28 }} />
      <H2>Recommended next tasks</H2>
      <div style={{ height: 8 }} />
      <TodoList
        todos={nextUp.map((label, i) => ({
          id: \`next-\${i}\`,
          content: label,
          status: 'pending' as const,
        }))}
      />

      <div style={{ height: 28 }} />
      <Grid columns={2} style={{ gap: 16 }}>
        <Card>
          <CardHeader trailing={<Pill>{String(inProgressCount)}</Pill>}>In progress</CardHeader>
          <CardBody>
            <TodoList
              todos={inProgressTasks.map((t) => ({
                id: t.id,
                content: \`\${t.id} · \${t.title}\`,
                status: toTodoStatus(t.status),
              }))}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader trailing={<Pill>{String(todoTasks.length)}</Pill>}>High-priority backlog</CardHeader>
          <CardBody>
            <TodoList
              todos={todoTasks.slice(0, 8).map((t) => ({
                id: t.id,
                content: \`\${t.id} · \${t.title} (\${t.layer})\`,
                status: toTodoStatus(t.status),
              }))}
            />
          </CardBody>
        </Card>
      </Grid>

      <div style={{ height: 28 }} />
      <H2>Completed (recent)</H2>
      <div style={{ height: 8 }} />
      <Row style={{ gap: 8, flexWrap: 'wrap' }}>
        {doneTasks.slice(-12).map((t) => (
          <span key={t.id}>
            <Pill size="sm" active>
              {t.id}
            </Pill>
          </span>
        ))}
      </Row>

      <div style={{ height: 28 }} />
      <H3>Documentation</H3>
      <Text>docs/PLAN.md — phases, sprints, risks, definition of done</Text>
      <Text>docs/DESIGN.md — architecture, workflows, API, UI design</Text>
      <Text>docs/TASKS.md — full task board with backlog tables</Text>
      <Text>docs/tasks.json — source of truth (update status, then run sync script)</Text>
    </Stack>
  )
}
`

writeFileSync(canvasPath, canvas, 'utf8')
console.log(`Synced ${mvpTasks.length} MVP tasks → ${canvasPath}`)
console.log(`Done: ${mvpTasks.filter((t) => t.status === 'done').length}, in_progress: ${mvpTasks.filter((t) => t.status === 'in_progress').length}`)
