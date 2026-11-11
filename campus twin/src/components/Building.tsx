import { Text } from '@react-three/drei'
import type { CampusBuilding as CampusBuildingData } from '../types/campus'

interface BuildingProps {
  building: CampusBuildingData
  selected: boolean
  affected: boolean
  onSelect: (buildingId: string) => void
}

export function Building({ building, selected, affected, onSelect }: BuildingProps) {
  const [width, height, depth] = building.size
  const windowRows = Math.max(2, building.floors)
  const windowColumns = 4

  return (
    <group
      position={building.position}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(building.id)
      }}
      onPointerOver={() => { document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { document.body.style.cursor = 'auto' }}
    >
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[width + 0.42, 0.2, depth + 0.42]} />
        <meshStandardMaterial color={selected ? '#99bca7' : '#3b4845'} roughness={0.88} />
      </mesh>
      <mesh position={[0, height / 2 + 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={affected ? '#293333' : building.tone} roughness={0.82} />
      </mesh>
      <mesh position={[0, height + 0.24, 0]} castShadow>
        <boxGeometry args={[width + 0.12, 0.18, depth + 0.12]} />
        <meshStandardMaterial color={affected ? '#414746' : '#9a9c83'} roughness={0.9} />
      </mesh>
      {Array.from({ length: windowRows * windowColumns }, (_, index) => {
        const row = Math.floor(index / windowColumns)
        const column = index % windowColumns
        const x = -width * 0.36 + column * (width * 0.24)
        const y = 0.42 + row * ((height - 0.45) / windowRows)
        return (
          <mesh key={index} position={[x, y, depth / 2 + 0.012]}>
            <boxGeometry args={[0.28, 0.16, 0.025]} />
            <meshStandardMaterial color={selected ? '#d9c98c' : '#93b0a7'} emissive={selected ? '#79672f' : '#334c47'} emissiveIntensity={0.35} />
          </mesh>
        )
      })}
      <mesh position={[0, height + 0.34, 0]}>
        <boxGeometry args={[width * 0.62, 0.12, depth * 0.58]} />
        <meshStandardMaterial color={affected ? '#e16c66' : selected ? '#d6bd72' : '#566561'} />
      </mesh>
      {(selected || affected) && (
        <mesh position={[0, 0.22, 0]}>
          <boxGeometry args={[width + 0.54, 0.025, depth + 0.54]} />
          <meshBasicMaterial color={affected ? '#ef6969' : '#d5c27b'} wireframe />
        </mesh>
      )}
      <Text
        position={[0, height + 0.72, 0]}
        fontSize={0.24}
        anchorX="center"
        anchorY="bottom"
        color={affected ? '#ffb8af' : selected ? '#f0e4b5' : '#c8d3c9'}
        outlineColor="#131a1a"
        outlineWidth={0.018}
      >
        {building.name}
      </Text>
    </group>
  )
}
