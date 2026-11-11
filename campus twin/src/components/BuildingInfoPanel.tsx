import { ArrowRight, Building2, DoorOpen, Layers3, Users } from 'lucide-react'
import { calculate_utilization } from '../api/campusApi'
import type { CampusBuilding, FloorLayout, Room } from '../types/campus'
import { STATUS_COLORS } from '../constants/status'

interface BuildingInfoPanelProps {
  building: CampusBuilding
  rooms: Room[]
  floorLayouts: FloorLayout[]
  onExploreFloors: () => void
}

export function BuildingInfoPanel({ building, rooms, floorLayouts, onExploreFloors }: BuildingInfoPanelProps) {
  const layoutFloors = floorLayouts.filter((floor) => floor.building_id === building.id)
  const buildingRooms = rooms.filter((room) => building.source_building_ids.includes(room.building_id))
  const capacity = buildingRooms.reduce((sum, room) => sum + room.capacity, 0)
  const occupancy = buildingRooms.reduce((sum, room) => sum + room.occupancy, 0)
  const { percentage: utilization, status } = calculate_utilization({ id: building.id, building_id: building.id, type: 'classroom', capacity, occupancy })
  const roomCount = buildingRooms.length
  const canExplore = layoutFloors.length > 0

  return (
    <div className="building-info-panel">
      <div className="panel-heading">
        <div><p className="eyebrow">Building overview</p><h2>{building.name}</h2></div>
        <span className="building-code">{building.id}</span>
      </div>
      <div className="building-profile">
        <span className="building-profile__mark"><Building2 size={23} /></span>
        <span><strong>{building.floors} floors</strong><small>{building.name === 'Academic Block' ? 'Academic teaching spaces' : 'Campus facility'}</small></span>
      </div>
      <div className="building-stat-grid">
        <article><span><Layers3 size={14} />Floors</span><strong>{building.floors}</strong></article>
        <article><span><DoorOpen size={14} />Rooms</span><strong>{roomCount}</strong></article>
        <article><span><Users size={14} />Capacity</span><strong>{capacity}</strong></article>
        <article><span><Users size={14} />Occupancy</span><strong>{occupancy}</strong></article>
      </div>
      <section className="building-utilization">
        <div className="building-utilization__label"><span>Current utilization</span><strong style={{ color: STATUS_COLORS[status] }}>{utilization.toFixed(1)}%</strong></div>
        <div className="utilization-track"><span style={{ width: `${Math.min(utilization, 100)}%`, background: STATUS_COLORS[status] }} /></div>
        <small>{occupancy} occupied of {capacity} total seats</small>
      </section>
      {canExplore ? (
        <button className="run-button explore-button" type="button" onClick={onExploreFloors}>Explore Floors <ArrowRight size={15} /></button>
      ) : (
        <div className="building-note">Building-level overview is available. Detailed floor plans can be added when room-layout data is provided.</div>
      )}
    </div>
  )
}
