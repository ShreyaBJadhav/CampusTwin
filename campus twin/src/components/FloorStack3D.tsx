import { Text } from '@react-three/drei'
import type { CampusBuilding, FloorLayout } from '../types/campus'

interface FloorStack3DProps {
  building: CampusBuilding
  floors: FloorLayout[]
  selectedFloor: number | null
  onSelectFloor: (floorNumber: number) => void
}

export function FloorStack3D({ building, floors, selectedFloor, onSelectFloor }: FloorStack3DProps) {
  const sortedFloors = [...floors].sort((left, right) => left.floor_number - right.floor_number)

  return (
    <group position={building.position}>
      {sortedFloors.map((floor, index) => {
        const y = index * 1.5
        const selected = floor.floor_number === selectedFloor
        return (
          <group
            key={floor.floor_number}
            position={[0, y, 0]}
            onClick={(event) => {
              event.stopPropagation()
              onSelectFloor(floor.floor_number)
            }}
            onPointerOver={() => { document.body.style.cursor = 'pointer' }}
            onPointerOut={() => { document.body.style.cursor = 'auto' }}
          >
            <mesh position={[0, 0, 0]} castShadow>
              <boxGeometry args={[8.4, 0.22, 6.2]} />
              <meshStandardMaterial color={selected ? '#327b91' : '#293c48'} emissive={selected ? '#174a58' : '#101d25'} emissiveIntensity={0.5} roughness={0.68} />
            </mesh>
            <mesh position={[0, 0.13, 0]}>
              <boxGeometry args={[8.55, 0.035, 6.35]} />
              <meshBasicMaterial color={selected ? '#5ae0ef' : '#526977'} wireframe />
            </mesh>
            {Array.from({ length: 8 }, (_, windowIndex) => (
              <mesh key={windowIndex} position={[-3.3 + windowIndex * 0.94, 0.18, 3.12]}>
                <boxGeometry args={[0.45, 0.12, 0.035]} />
                <meshBasicMaterial color={selected ? '#7ae7ed' : '#8da4a8'} />
              </mesh>
            ))}
            <Text position={[0, 0.48, 0]} fontSize={0.42} anchorX="center" anchorY="bottom" color={selected ? '#b7f6f5' : '#d3e0e3'} outlineColor="#10191f" outlineWidth={0.025}>
              Floor {floor.floor_number}
            </Text>
            <Text position={[0, 0.28, -2.5]} fontSize={0.2} anchorX="center" anchorY="middle" color="#9db1b5" outlineColor="#10191f" outlineWidth={0.015}>
              {`${floor.room_ids.length} rooms`}
            </Text>
          </group>
        )
      })}
      <Text position={[0, sortedFloors.length * 1.5 + 0.9, 0]} fontSize={0.28} anchorX="center" anchorY="bottom" color="#e5f2f1" outlineColor="#10191f" outlineWidth={0.02}>
        {building.name} / EXPLODED FLOORS
      </Text>
    </group>
  )
}
