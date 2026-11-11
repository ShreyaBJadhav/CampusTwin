import { ArrowUpRight, Building2 } from 'lucide-react'
import type { CampusBuilding, Room } from '../types/campus'

interface BuildingListPanelProps {
  buildings: CampusBuilding[]
  rooms: Room[]
  onSelectBuilding: (buildingId: string) => void
}

export function BuildingListPanel({ buildings, rooms, onSelectBuilding }: BuildingListPanelProps) {
  return (
    <div className="building-list-panel">
      <div className="panel-heading"><div><p className="eyebrow">Campus directory</p><h2>Buildings</h2></div><span className="building-code">{buildings.length} TOTAL</span></div>
      {buildings.length === 0 ? (
        <div className="inline-empty">No buildings are available.</div>
      ) : (
        <div className="building-directory-list">
          {buildings.map((building) => {
            const roomCount = rooms.filter((room) => building.source_building_ids.includes(room.building_id)).length
            return (
              <button type="button" className="building-directory-row" key={building.id} onClick={() => onSelectBuilding(building.id)}>
                <span className="building-directory-row__icon"><Building2 size={17} /></span>
                <span className="building-directory-row__text"><strong>{building.name}</strong><small>{building.floors} floors · {roomCount} rooms</small></span>
                <ArrowUpRight size={15} />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
