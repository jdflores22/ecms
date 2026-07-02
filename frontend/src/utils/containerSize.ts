/** Display container size without a trailing foot mark (e.g. 40' → 40). */
export function formatContainerSizeLabel(label: string): string {
  return label.trim().replace(/'+$/u, '')
}

/** e.g. TEST037E487 (20' GP) */
export function formatContainerSummary(
  containerNo: string,
  containerSize: string,
  containerType: string,
): string {
  const size = formatContainerSizeLabel(containerSize)
  return `${containerNo} (${size}' ${containerType})`
}
