import { Activity, ArrowUpRight, Building2, DoorOpen, TriangleAlert } from 'lucide-react'
import { USE_MOCK_DATA } from '../api/campusApi'
import { STATUS_COLORS, STATUS_LABELS } from '../constants/status'
import type { DashboardSummary, Room, RoomStatus, RoomUtilization } from '../types/campus'

interface DashboardPanelProps {
  summary: DashboardSummary | null
  rooms: Room[]
  utilizations: Record<string, Pick<RoomUtilization, 'percentage' | 'status' | 'warning'>>
  statuses: Record<string, RoomStatus>
  loading: boolean
  error: string | null
  onFocusRoom: (roomId: string) => void
}

const statusOrder: RoomStatus[] = ['low', 'normal', 'high', 'overloaded']

export function DashboardPanel({ summary, rooms, utilizations, statuses, loading, error, onFocusRoom }: DashboardPanelProps) {
  if (loading) return <div className="panel-state"><span className="loader" />Building campus overview</div>
  if (error) return <div className="panel-state panel-state--error">{error}</div>
  if (!summary || rooms.length === 0) return <div className="empty-state"><DoorOpen size={20} /><span>No room data is available yet.</span></div>
  if (rooms.some((room) => !utilizations[room.id] || !Number.isFinite(utilizations[room.id].percentage))) {
    return <div className="panel-state panel-state--error">Room utilization data is unavailable.</div>
  }

  const activeRoomCount = Object.values(summary.status_counts).reduce((total, count) => total + count, 0)
  const averageUtilization = rooms.length
    ? rooms.reduce((total, room) => total + utilizations[room.id].percentage, 0) / rooms.length
    : 0
  let cursor = 0
  const stops = statusOrder.map((status) => {
    const start = cursor
    cursor += activeRoomCount ? (summary.status_counts[status] / activeRoomCount) * 100 : 0
    return `${STATUS_COLORS[status]} ${start}% ${cursor}%`
  }).join(', ')

  return (
    <div className="dashboard-panel">
      <div className="panel-heading">
        <div><p className="eyebrow">Campus snapshot</p><h2>Operations overview</h2></div>
        <span className="live-indicator"><i />{USE_MOCK_DATA ? 'MOCK DATA' : 'LIVE API'}</span>
      </div>

      <div className="stat-grid">
        <article className="stat-card stat-card--rooms">
          <span className="stat-card__icon"><DoorOpen size={17} /></span>
          <span className="stat-card__label">Total rooms</span>
          <strong>{summary.total_rooms}</strong>
          <small>Across campus</small>
        </article>
        <article className="stat-card stat-card--buildings">
          <span className="stat-card__icon"><Building2 size={17} /></span>
          <span className="stat-card__label">Total buildings</span>
          <strong>{summary.total_buildings}</strong>
          <small>Campus facilities</small>
        </article>
        <article className="stat-card stat-card--average">
          <span className="stat-card__icon"><Activity size={17} /></span>
          <span className="stat-card__label">Average utilization</span>
          <strong>{averageUtilization.toFixed(1)}<small>%</small></strong>
          <small>Campus rooms</small>
        </article>
        <article className="stat-card stat-card--overloaded">
          <span className="stat-card__icon"><TriangleAlert size={17} /></span>
          <span className="stat-card__label">Overloaded</span>
          <strong>{summary.overloaded_rooms.length}</strong>
          <small>Needs attention</small>
        </article>
      </div>

      <section className="panel-section utilization-section">
        <div className="section-title"><div><p className="eyebrow">Room status</p><h3>Utilization spread</h3></div><span className="section-count">{activeRoomCount} tracked</span></div>
        <div className="chart-row">
          <div className="donut-chart" style={{ background: `conic-gradient(${activeRoomCount ? stops : '#34413e 0% 100%'})` }} role="img" aria-label="Distribution of room utilization statuses">
            <div className="donut-chart__hole"><strong>{activeRoomCount}</strong><span>rooms</span></div>
          </div>
          <div className="status-legend">
            {statusOrder.map((status) => (
              <div className="status-legend__row" key={status}>
                <span className="status-legend__swatch" style={{ background: STATUS_COLORS[status] }} />
                <span>{STATUS_LABELS[status]}</span>
                <strong>{summary.status_counts[status]}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="status-bar" aria-label="Status distribution">
          {statusOrder.map((status) => <span key={status} style={{ width: `${activeRoomCount ? summary.status_counts[status] / activeRoomCount * 100 : 0}%`, background: STATUS_COLORS[status] }} title={`${STATUS_LABELS[status]} ${summary.status_counts[status]}`} />)}
        </div>
      </section>

      <section className="panel-section overloaded-section">
        <div className="section-title"><div><p className="eyebrow">Attention required</p><h3>Overloaded rooms</h3></div><span className="section-count section-count--alert">{summary.overloaded_rooms.length}</span></div>
        {summary.overloaded_rooms.length === 0 ? (
          <div className="inline-empty">All rooms are within the monitored range.</div>
        ) : (
          <div className="overloaded-list">
            {summary.overloaded_rooms.map((room) => (
              <button className="overloaded-row" key={room.id} type="button" onClick={() => onFocusRoom(room.id)}>
                <span className="overloaded-row__alert" style={{ color: STATUS_COLORS[statuses[room.id] ?? room.status] }}><TriangleAlert size={16} /></span>
                <span className="overloaded-row__details"><strong>{room.id}</strong><small>{room.building_id}</small></span>
                <span className="overloaded-row__value">{room.percentage.toFixed(1)}%<ArrowUpRight size={14} /></span>
              </button>
            ))}
          </div>
        )}
      </section>

      {summary.skipped_rooms.length > 0 && (
        <section className="panel-section skipped-section">
          <div className="section-title"><div><p className="eyebrow">Data quality</p><h3>Skipped rooms</h3></div><span className="section-count">{summary.skipped_rooms.length}</span></div>
          {summary.skipped_rooms.map((room, index) => <div className="skipped-row" key={`${room.id ?? 'unknown'}-${index}`}><strong>{room.id ?? 'Unknown room'}</strong><span>{room.reason}</span></div>)}
        </section>
      )}
    </div>
  )
}
