export const CONTAINER_PHOTO_CATEGORIES = [
  { value: 'Flooring', label: 'Flooring' },
  { value: 'RightSideIn', label: 'Right side (in)' },
  { value: 'LeftSideIn', label: 'Left side (in)' },
  { value: 'Back', label: 'Back' },
  { value: 'Front', label: 'Front' },
  { value: 'LeftSideOut', label: 'Left side (out)' },
  { value: 'RightSideOut', label: 'Right side (out)' },
] as const

export const DAMAGE_PHOTO_CATEGORY = { value: 'Damage', label: 'Damage (other)' } as const

export type ContainerPhotoCategoryValue =
  | (typeof CONTAINER_PHOTO_CATEGORIES)[number]['value']
  | typeof DAMAGE_PHOTO_CATEGORY.value

export function containerPhotoLabel(category?: string | null) {
  if (!category) return 'Uncategorized'
  const all = [...CONTAINER_PHOTO_CATEGORIES, DAMAGE_PHOTO_CATEGORY]
  return all.find((c) => c.value === category)?.label ?? category
}

export function isStandardPhotoCategory(category?: string | null) {
  return CONTAINER_PHOTO_CATEGORIES.some((c) => c.value === category)
}
