/** Display container size without a trailing foot mark (e.g. 40' → 40). */
export function formatContainerSizeLabel(label: string): string {
  return label.trim().replace(/'+$/u, '')
}
