import { ArrowLeft, ArrowRight, ChevronRight, MapPin } from 'lucide-react'
import type { CampusBuilding, FloorLayout, Room, RoomUtilization } from '../types/campus'
import { RoomDetail } from './RoomDetail'

interface FloorNavigationPanelProps {
  building: CampusBuilding
  floors: FloorLayout[]
  rooms: Room[]
  selectedFloor: number | null
  selectedRoom: RoomUtilization | null
  viewMode: 'floors' | 'floor'
  loading: boolean
  error: string | null
  onSelectFloor: (floorNumber: number) => void
  onSelectRoom: (roomId: string) => void
  onUpdateOccupancy: (roomId: string, occupancy: number) => Promise<void>
  onBackToBuilding: () => void
  onBackToFloors: () => void
  onReturnToCampus: () => void
}

export function FloorNavigationPanel({
  building,
  floors,
  rooms,
  selectedFloor,
  selectedRoom,
  viewMode,
  loading,
  error,
  onSelectFloor,
  onSelectRoom,
  onUpdateOccupancy,
  onBackToBuilding,
  onBackToFloors,
  onReturnToCampus,
}: FloorNavigationPanelProps) {
  const activeLayout = floors.find((floor) => floor.floor_number === selectedFloor)
  const floorRooms = activeLayout ? rooms.filter((room) => activeLayout.room_ids.includes(room.id)) : []

  return (
    <div className="floor-navigation-panel">
      <div className="floor-breadcrumb" aria-label="Breadcrumb">
        <button type="button" onClick={onReturnToCampus}>Campus</button>
        <ChevronRight size={13} />
        <button type="button" onClick={onBackToBuilding}>{building.name}</button>
        {viewMode === 'floor' && selectedFloor != null && <><ChevronRight size={13} /><span>Floor {selectedFloor}</span></>}
      </div>

      <div className="panel-heading floor-heading">
        <div><p className="eyebrow">{viewMode === 'floor' ? 'Floor room plan' : 'Exploded floor view'}</p><h2>{viewMode === 'floor' && selectedFloor != null ? `Floor ${selectedFloor}` : 'Explore floors'}</h2></div>
        <span className="building-code">{building.floors} LEVELS</span>
      </div>

      <div className="floor-action-row">
        {viewMode === 'floors' ? (
          <button type="button" className="back-button" onClick={onBackToBuilding}><ArrowLeft size={14} />Building details</button>
        ) : (
          <button type="button" className="back-button" onClick={onBackToFloors}><ArrowLeft size={14} />All floors</button>
        )}
        <button type="button" className="back-button back-button--campus" onClick={onReturnToCampus}><MapPin size={14} />Full campus</button>
      </div>

      {loading ? <div className="panel-state"><span className="loader" />Loading floor data</div> : error ? <div className="panel-state panel-state--error">{error}</div> : (
        <>
          <div className="floor-choice-list">
            {floors.map((floor) => (
              <button key={floor.floor_number} type="button" className={`floor-choice${selectedFloor === floor.floor_number ? ' is-active' : ''}`} onClick={() => onSelectFloor(floor.floor_number)}>
                <span className="floor-choice__number">{String(floor.floor_number).padStart(2, '0')}</span>
                <span className="floor-choice__label"><strong>Floor {floor.floor_number}</strong><small>{floor.room_ids.length} rooms</small></span>
                <ArrowRight size={15} />
              </button>
            ))}
          </div>

          {viewMode === 'floor' && activeLayout ? (
            <section className="floor-room-section">
              <div className="floor-room-section__heading"><span>Rooms on floor {activeLayout.floor_number}</span><strong>{activeLayout.room_ids.length}</strong></div>
              <RoomDetail
                building={building}
                rooms={floorRooms}
                selectedRoom={selectedRoom}
                buildingName={building.name}
                floorNumber={activeLayout.floor_number}
                onSelectRoom={onSelectRoom}
                onUpdateOccupancy={onUpdateOccupancy}
                loading={false}
                error={null}
              />
            </section>
          ) : (
            <div className="empty-state floor-hint"><MapPin size={18} /><span>Select a floor here or click a level in the 3D exploded view.</span></div>
          )}
        </>
      )}
    </div>
  )
}
