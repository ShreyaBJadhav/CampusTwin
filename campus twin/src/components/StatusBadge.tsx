import { STATUS_COLORS, STATUS_LABELS } from '../constants/status'
import type { RoomStatus } from '../types/campus'

export function StatusBadge({ status }: { status: RoomStatus }) {
  return (
    <span className={`status-badge status-badge--${status}`} style={{ '--status-color': STATUS_COLORS[status] } as React.CSSProperties}>
      <span className="status-badge__dot" />
      {STATUS_LABELS[status]}
    </span>
  )
}
