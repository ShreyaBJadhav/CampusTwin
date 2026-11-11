import { useRef } from 'react'
import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import { STATUS_COLORS } from '../constants/status'
import type { Room, RoomStatus } from '../types/campus'

interface RoomMarkerProps {
  room: Room
  position: [number, number, number]
  status: RoomStatus
  affected: boolean
  receiving?: boolean
  selected: boolean
  onSelect: (roomId: string) => void
}

export function RoomMarker({ room, position, status, affected, receiving = false, selected, onSelect }: RoomMarkerProps) {
  const pulseRef = useRef<Mesh>(null)
  const color = STATUS_COLORS[status]

  useFrame(({ clock }) => {
    if (pulseRef.current && affected) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 4.4) * 0.1
      pulseRef.current.scale.setScalar(pulse)
    }
  })

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
      <mesh ref={pulseRef} position={[0, 0.12, 0]}>
        <torusGeometry args={[0.27, 0.035, 6, 24]} />
        <meshBasicMaterial color={affected ? '#ef6969' : receiving ? '#80d9a4' : selected ? '#f5f0d7' : color} />
      </mesh>
      <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.18, 8]} />
        <meshStandardMaterial color={affected ? '#202829' : receiving ? '#80d9a4' : color} roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <sphereGeometry args={[0.075, 8, 6]} />
        <meshBasicMaterial color={affected ? '#ef6969' : receiving ? '#80d9a4' : color} />
      </mesh>
      {affected && (
        <mesh position={[0, 0.21, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.205, 0.25, 8]} />
          <meshBasicMaterial color="#ef6969" wireframe />
        </mesh>
      )}
      <Text
        position={[0, 0.53, 0]}
        fontSize={0.18}
        anchorX="center"
        anchorY="bottom"
        color={affected ? '#ffc2bd' : '#ecf2ed'}
        outlineColor="#131a1a"
        outlineWidth={0.012}
      >
        {room.id}
      </Text>
    </group>
  )
}
