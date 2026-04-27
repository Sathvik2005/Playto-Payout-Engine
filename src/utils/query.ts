export function cleanQueryParams(params: Record<string, string | number | undefined>) {
  return Object.entries(params).reduce<Record<string, string | number>>((acc, [key, value]) => {
    if (value !== undefined && value !== '' && value !== 'all') {
      acc[key] = value
    }
    return acc
  }, {})
}
