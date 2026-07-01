import { normalizeContainerNo } from './containerNumber'

export interface ParsedBulkContainer {
  containerNo: string
}

export function parseBulkContainerPaste(text: string): ParsedBulkContainer[] {
  const lines = text
    .split(/[\r\n,;]+/)
    .map((line) => normalizeContainerNo(line))
    .filter(Boolean)

  return [...new Set(lines)].map((containerNo) => ({ containerNo }))
}
