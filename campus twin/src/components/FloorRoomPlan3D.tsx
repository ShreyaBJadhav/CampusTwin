import { Text } from '@react-three/drei'
import type { CampusBuilding, FloorLayout, Room, RoomStatus } from '../types/campus'
import { RoomObject3D } from './RoomObject3D'

interface FloorRoomPlan3DProps {
  building: CampusBuilding
  floor: FloorLayout
  rooms: Room[]
  statuses: Record<string, RoomStatus>
  selectedRoomId: string | null
  onSelectRoom: (roomId: string) => void
}

export function FloorRoomPlan3D({ building, floor, rooms, statuses, selectedRoomId, onSelectRoom }: FloorRoomPlan3DProps) {
  const floorRooms = floor.room_ids.flatMap((roomId) => {
    const room = rooms.find((item) => item.id === roomId)
    return room ? [room] : []
  })
  const columns = Math.min(3, floorRooms.length)
  const rows = Math.ceil(floorRooms.length / columns)

  return (
    <group position={[building.position[0], 0, building.position[2]]}>
      <mesh position={[0, -0.08, 0]} receiveShadow>
        <boxGeometry args={[Math.max(columns * 3.1, 6.8), 0.16, Math.max(rows * 2.7, 4.6)]} />
        <meshStandardMaterial color="#1b2a32" roughness={0.9} />
      </mesh>
      <Text position={[0, 1.15, -rows * 1.25 - 0.5]} fontSize={0.35} anchorX="center" anchorY="bottom" color="#d8f0ef" outlineColor="#10191f" outlineWidth={0.02}>
        {`${building.name} / FLOOR ${floor.floor_number}`}
      </Text>
      {floorRooms.map((room, index) => {
        const column = index % columns
        const row = Math.floor(index / columns)
        const x = (column - (columns - 1) / 2) * 3.05
        const z = (row - (rows - 1) / 2) * 2.72
        return (
          <RoomObject3D
            key={room.id}
            room={room}
            status={statuses[room.id] ?? 'low'}
            position={[x, 0, z]}
            selected={selectedRoomId === room.id}
            onSelect={onSelectRoom}
          />
        )
      })}
    </group>
  )
}
