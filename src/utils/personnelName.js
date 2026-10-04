/** Ignore empty API fields; keep the backend's resolved name as the primary source. */
export function firstDisplayName(...values) {
  return values.map((value) => String(value ?? '').trim()).find(Boolean) || '—'
}
