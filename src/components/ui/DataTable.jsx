import { useEffect, useState } from 'react'
import { SkeletonTable } from './Skeleton'
import EmptyState from './EmptyState'

/**
 * LuxeWash Enterprise DataTable
 *
 * @param {object} props
 * @param {Array<{key: string, label: string, width?: string, align?: 'left'|'center'|'right', render?: (row, index) => ReactNode, renderActions?: (row) => ReactNode, tdClassName?: string}>} props.columns
 * @param {Array<object>} props.data
 * @param {boolean} props.loading
 * @param {string} props.rowKey - unique key per row (defaults to row.id or row.serviceId, fallback to index)
 * @param {object} props.empty - { icon, title, message, action }
 * @param {object} props.emptyIcon / emptyTitle / emptyMessage — shorthand
 * @param {string} props.className
 * @param {string} props.minWidth — applied via `min-w-[]` style on the inner table (default '900px')
 * @param {boolean} props.stickyHeader
 * @param {Array<object>} props.pendingRemovals — set of row keys currently animating out (parent-controlled)
 * @param {Array<object>} props.pendingAdditions — set of row keys currently animating in (parent-controlled)
 */
export default function DataTable({
  columns,
  data,
  loading = false,
  rowKey,
  empty,
  emptyIcon = 'inbox',
  emptyTitle = 'Chưa có dữ liệu',
  emptyMessage,
  emptyAction,
  className = '',
  minWidth = '900px',
  stickyHeader = true,
}) {
  const [stagger, setStagger] = useState(0)
  useEffect(() => {
    setStagger((s) => s + 1)
  }, [data])

  if (loading) {
    return (
      <SkeletonTable
        rows={6}
        columns={columns.length}
        className={className}
      />
    )
  }

  if (!data || data.length === 0) {
    const emptyProps = empty ?? {}
    return (
      <EmptyState
        icon={emptyProps.icon ?? emptyIcon}
        title={emptyProps.title ?? emptyTitle}
        message={emptyProps.message ?? emptyMessage}
        action={emptyProps.action ?? emptyAction}
        className={className}
      />
    )
  }

  const getKey = (row, idx) => {
    if (rowKey) return typeof rowKey === 'function' ? rowKey(row) : row[rowKey]
    if (row?.id != null) return row.id
    if (row?.serviceId != null) return row.serviceId
    if (row?.userId != null) return row.userId
    if (row?.bookingId != null) return row.bookingId
    if (row?.branchId != null) return row.branchId
    if (row?.voucherId != null) return row.voucherId
    if (row?.campaignId != null) return row.campaignId
    if (row?.tierId != null) return row.tierId
    if (row?.vehicleTypeId != null) return row.vehicleTypeId
    if (row?.laneId != null) return row.laneId
    if (row?.timeSlotId != null) return row.timeSlotId
    if (row?.carModelId != null) return row.carModelId
    if (row?.employeeId != null) return row.employeeId
    if (row?.transactionId != null) return row.transactionId
    if (row?.invoiceId != null) return row.invoiceId
    if (row?.applicationId != null) return row.applicationId
    if (row?.itemId != null) return row.itemId
    return `row-${idx}`
  }

  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }

  return (
    <div className={`lw-table-container overflow-x-auto ${className}`}>
      <table
        className="w-full text-left text-sm"
        style={{ minWidth }}
      >
        <thead>
          <tr className="lw-table-header">
            {columns.map((col) => (
              <th
                key={col.key}
                style={col.width ? { width: col.width } : undefined}
                className={`${alignClass[col.align ?? 'left'] ?? 'text-left'}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const key = getKey(row, idx)
            return (
              <tr
                key={key}
                className="lw-table-row lw-row-enter border-t border-outline-variant/40 last:border-b-0"
                style={{
                  animationDelay: `${Math.min(idx * 40, 400)}ms`,
                  // Force re-trigger animation when stagger increments
                  animationName: 'lw-row-in',
                }}
              >
                {columns.map((col) => {
                  const align = col.align ?? 'left'
                  const baseAlign = alignClass[align] ?? 'text-left'
                  const content =
                    col.renderActions
                      ? col.renderActions(row)
                      : col.render
                        ? col.render(row, idx)
                        : row[col.key] ?? ''
                  return (
                    <td
                      key={col.key}
                      className={`${baseAlign} ${col.tdClassName ?? ''}`}
                    >
                      {content}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}