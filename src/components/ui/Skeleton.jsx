/**
 * LuxeWash Enterprise Skeleton
 *
 * variants:
 *   text   — single line shimmer bar
 *   circle — round (avatars)
 *   rect   — box
 *
 * Helpers:
 *   <Skeleton.Table rows={5} columns={6} />
 */
export function Skeleton({ variant = 'text', width, height, className = '' }) {
  const style = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  const variantClass =
    variant === 'circle'
      ? 'rounded-full'
      : variant === 'rect'
        ? 'rounded-lg'
        : 'rounded h-3 w-full'

  return <div className={`lw-skeleton ${variantClass} ${className}`} style={style} />
}

export function SkeletonTable({ rows = 5, columns = 6, className = '' }) {
  return (
    <div className={`lw-table-container overflow-hidden ${className}`}>
      <div className="lw-table-header">
        <div
          className="grid gap-0 px-0 py-0"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="px-4 py-3">
              <Skeleton width="60%" height="10px" />
            </div>
          ))}
        </div>
      </div>
      <div>
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="border-b border-outline-variant/40 last:border-b-0"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: columns }).map((_, colIdx) => (
              <div key={colIdx} className="px-4 py-4">
                <Skeleton width={colIdx === 0 ? '40%' : '70%'} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}