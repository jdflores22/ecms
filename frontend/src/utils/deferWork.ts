/** Run work after the current event handler / paint to avoid long-task violations. */
export function scheduleNonCritical(work: () => void): () => void {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(work, { timeout: 2000 })
    return () => cancelIdleCallback(id)
  }
  const id = window.setTimeout(work, 0)
  return () => clearTimeout(id)
}
