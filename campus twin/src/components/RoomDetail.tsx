import { Flag, MapPin, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { STATUS_COLORS } from '../constants/status'
import type { CampusBuilding, Room, RoomUtilization } from '../types/campus'
import { StatusBadge } from './StatusBadge'

interface RoomDetailProps {
  building: CampusBuilding | null
  rooms: Room[]
  selectedRoom: RoomUtilization | null
  buildingName?: string
  floorNumber?: number | null
  onSelectRoom: (roomId: string) => void
  onUpdateOccupancy: (roomId: string, occupancy: number) => Promise<void>
  loading: boolean
  error: string | null
}

export function RoomDetail({ building, rooms, selectedRoom, buildingName, floorNumber, onSelectRoom, onUpdateOccupancy, loading, error }: RoomDetailProps) {
  const [occupancyInput, setOccupancyInput] = useState('')
  const [occupancyError, setOccupancyError] = useState<string | null>(null)
  const [updatingOccupancy, setUpdatingOccupancy] = useState(false)

  useEffect(() => {
    setOccupancyInput(selectedRoom ? String(selectedRoom.occupancy) : '')
    setOccupancyError(null)
  }, [selectedRoom?.id, selectedRoom?.occupancy])

  if (loading) return <div className="panel-state"><span className="loader" />Loading room data</div>
  if (error) return <div className="panel-state panel-state--error">{error}</div>

  const buildingRooms = building ? rooms.filter((room) => building.source_building_ids.includes(room.building_id)) : []

  const saveOccupancy = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedRoom || occupancyInput.trim() === '') {
      setOccupancyError('Enter an occupancy value.')
      return
    }

    const occupancy = Number(occupancyInput)
    if (!Number.isInteger(occupancy)) {
      setOccupancyError('Occupancy must be a whole number.')
      return
    }

    setUpdatingOccupancy(true)
    setOccupancyError(null)
    try {
      await onUpdateOccupancy(selectedRoom.id, occupancy)
    } catch (cause) {
      setOccupancyError(cause instanceof Error ? cause.message : 'Unable to update room occupancy.')
    } finally {
      setUpdatingOccupancy(false)
    }
  }

  return (
    <div className="room-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Selected building</p>
          <h2>{building?.name ?? 'Choose a building'}</h2>
        </div>
        {building && <span className="building-code">{building.id}</span>}
      </div>

      {buildingRooms.length === 0 ? (
        <div className="empty-state"><MapPin size={20} /><span>Select a campus building to inspect its rooms.</span></div>
      ) : (
        <>
          <div className="room-list" aria-label={`Rooms in ${building?.name}`}>
            {buildingRooms.map((room) => {
              const active = selectedRoom?.id === room.id
              const status = active ? selectedRoom.status : undefined
              return (
                <button key={room.id} type="button" className={`room-list-row${active ? ' is-active' : ''}`} onClick={() => onSelectRoom(room.id)}>
                  <span className="room-list-row__marker" style={{ backgroundColor: status ? STATUS_COLORS[status] : '#687975' }} />
                  <span className="room-list-row__name"><strong>{room.id}</strong><small>{room.type}</small></span>
                  <span className="room-list-row__occupancy">{room.occupancy}<i>/</i>{room.capacity}</span>
                </button>
              )
            })}
          </div>

          {selectedRoom ? (
            <section className="room-inspector" aria-label="Room details">
              <div className="room-inspector__top">
                <div><p className="eyebrow">Room detail</p><h3>{selectedRoom.id}</h3></div>
                <StatusBadge status={selectedRoom.status} />
              </div>
              <dl className="room-metrics">
                <div><dt>Type</dt><dd>{selectedRoom.type}</dd></div>
                <div><dt>Building</dt><dd>{buildingName ?? building?.name ?? selectedRoom.building_id}</dd></div>
                {floorNumber != null && <div><dt>Floor</dt><dd>{floorNumber}</dd></div>}
                <div><dt>Capacity</dt><dd>{selectedRoom.capacity} <small>seats</small></dd></div>
                <div><dt>Occupancy</dt><dd><Users size={14} />{selectedRoom.occupancy}</dd></div>
                <div><dt>Available</dt><dd>{Math.max(0, selectedRoom.capacity - selectedRoom.occupancy)}<small>seats</small></dd></div>
                <div><dt>Utilization</dt><dd>{selectedRoom.percentage.toFixed(1)}<small>%</small></dd></div>
              </dl>
              <form className="occupancy-update" onSubmit={(event) => void saveOccupancy(event)}>
                <label htmlFor="room-occupancy">Update occupancy</label>
                <div>
                  <input id="room-occupancy" type="number" step="1" value={occupancyInput} onChange={(event) => setOccupancyInput(event.target.value)} disabled={updatingOccupancy} />
                  <button type="submit" disabled={updatingOccupancy}>{updatingOccupancy ? 'Saving…' : 'Save'}</button>
                </div>
                {occupancyError && <p role="alert">{occupancyError}</p>}
              </form>
              {selectedRoom.warning && (
                <div className="capacity-warning"><Flag size={15} fill="currentColor" /><span>{selectedRoom.warning}</span></div>
              )}
            </section>
          ) : (
            <div className="empty-state empty-state--compact">Select a room above to view its live detail.</div>
          )}
        </>
      )}
    </div>
  )
}
