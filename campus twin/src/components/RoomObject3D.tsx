import { Text } from '@react-three/drei'
import type { Room, RoomStatus } from '../types/campus'
import { STATUS_COLORS } from '../constants/status'

interface RoomObject3DProps {
  room: Room
  status: RoomStatus
  position: [number, number, number]
  selected: boolean
  onSelect: (roomId: string) => void
}

export function RoomObject3D({ room, status, position, selected, onSelect }: RoomObject3DProps) {
  const color = STATUS_COLORS[status]
  return (
    <group
      position={position}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(room.id)
      }}
      onPointerOver={() => { document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { document.body.style.cursor = 'auto' }}
    >
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[2.45, 0.4, 1.65]} />
        <meshStandardMaterial color={selected ? '#e2fbfa' : color} emissive={color} emissiveIntensity={selected ? 0.5 : 0.16} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.44, 0]}>
        <boxGeometry args={[2.5, 0.035, 1.7]} />
        <meshBasicMaterial color={selected ? '#ffffff' : color} wireframe />
      </mesh>
      <mesh position={[0, 0.445, 0.835]}>
        <boxGeometry args={[0.32, 0.18, 0.025]} />
        <meshStandardMaterial color="#a9d8e5" emissive="#244c5b" emissiveIntensity={0.45} />
      </mesh>
      <Text position={[0, 0.65, 0]} fontSize={0.23} anchorX="center" anchorY="bottom" color={selected ? '#ffffff' : '#e5f4f1'} outlineColor="#10191f" outlineWidth={0.02}>
        {room.id}
      </Text>
      <Text position={[0, 0.05, 1.02]} fontSize={0.13} anchorX="center" anchorY="top" color="#a9bab8" outlineColor="#10191f" outlineWidth={0.012}>
        {room.type.toUpperCase()}
      </Text>
    </group>
  )
}
