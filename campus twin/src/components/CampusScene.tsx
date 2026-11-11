import { Suspense, useEffect, useRef } from 'react'
import { Line, OrbitControls, Text } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { ScheduleEntry, CampusBuilding, FloorLayout, Room, RoomStatus } from '../types/campus'
import { Building } from './Building'
import { FloorRoomPlan3D } from './FloorRoomPlan3D'
import { FloorStack3D } from './FloorStack3D'
import { RoomMarker } from './RoomMarker'

export interface SceneRoute {
  classId: string
  fromRoomId: string
  toRoomId: string
}

interface CampusSceneProps {
  cameraResetToken: number
  viewMode: 'campus' | 'building' | 'floors' | 'floor'
  buildings: CampusBuilding[]
  rooms: Room[]
  schedule: ScheduleEntry[]
  floorLayouts: FloorLayout[]
  selectedFloor: number | null
  statuses: Record<string, RoomStatus>
  selectedBuildingId: string | null
  selectedRoomId: string | null
  unavailableRoomIds: string[]
  reallocatedRoomIds: string[]
  routes: SceneRoute[]
  onSelectBuilding: (buildingId: string) => void
  onSelectFloor: (floorNumber: number) => void
  onSelectRoom: (roomId: string) => void
}

function markerPosition(room: Room, rooms: Room[], buildings: CampusBuilding[]): [number, number, number] {
  const building = buildings.find((item) => item.source_building_ids.includes(room.building_id))
  if (!building) return [0, 0.3, 0]
  const peers = rooms.filter((item) => buildings.find((candidate) => candidate.source_building_ids.includes(item.building_id))?.id === building.id)
  const index = peers.findIndex((item) => item.id === room.id)
  const x = (index - (peers.length - 1) / 2) * 0.82
  return [building.position[0] + x, 0.3, building.position[2] + building.size[2] / 2 + 0.95]
}

function CameraRig({ target, controlsRef, overview, resetToken }: {
  target: [number, number, number]
  controlsRef: React.RefObject<OrbitControlsImpl | null>
  overview: boolean
  resetToken: number
}) {
  const { camera, size } = useThree()
  const moving = useRef(true)
  const [targetX, targetY, targetZ] = target
  const framing = overview ? (size.width / size.height < 0.85 ? 2.2 : size.width / size.height < 1.35 ? 1.65 : 1.25) : 1

  useEffect(() => {
    moving.current = true
  }, [framing, resetToken, targetX, targetY, targetZ])

  useFrame((_, delta) => {
    if (!moving.current) return
    const ease = 1 - Math.exp(-delta * 2.2)
    const x = targetX
    const y = targetY
    const z = targetZ
    const destination = { x: x + 8.5 * framing, y: y + 8.2 * framing, z: z + 10 * framing }
    camera.position.lerp(destination, ease)
    if (controlsRef.current) {
      controlsRef.current.target.lerp({ x, y, z }, ease)
      controlsRef.current.update()
      if (camera.position.distanceTo(destination) < 0.035 && controlsRef.current.target.distanceTo({ x, y, z }) < 0.035) {
        moving.current = false
      }
    }
  })
  return null
}

function CampusContents(props: CampusSceneProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const selectedBuilding = props.buildings.find((building) => building.id === props.selectedBuildingId)
  const selectedRoom = props.rooms.find((room) => room.id === props.selectedRoomId)
  const selectedBuildingFloors = props.floorLayouts.filter((floor) => floor.building_id === selectedBuilding?.id)
  const selectedFloorLayout = selectedBuildingFloors.find((floor) => floor.floor_number === props.selectedFloor)
  const focusedRoomPosition = selectedRoom ? markerPosition(selectedRoom, props.rooms, props.buildings) : null
  const selectedFloorRoomIndex = selectedFloorLayout?.room_ids.indexOf(selectedRoom?.id ?? '') ?? -1
  const floorColumns = selectedFloorLayout ? Math.min(3, selectedFloorLayout.room_ids.length) : 1
  const floorRows = selectedFloorLayout ? Math.ceil(selectedFloorLayout.room_ids.length / floorColumns) : 1
  const selectedRoomPlanPosition: [number, number, number] | null = selectedBuilding && selectedFloorLayout && selectedFloorRoomIndex >= 0
    ? [
      selectedBuilding.position[0] + (selectedFloorRoomIndex % floorColumns - (floorColumns - 1) / 2) * 3.05,
      0.35,
      selectedBuilding.position[2] + (Math.floor(selectedFloorRoomIndex / floorColumns) - (floorRows - 1) / 2) * 2.72,
    ]
    : null
  const overview = props.viewMode === 'campus'
  const focusTarget: [number, number, number] = props.viewMode === 'floor' && selectedRoomPlanPosition
    ? selectedRoomPlanPosition
    : focusedRoomPosition && props.viewMode === 'campus'
      ? [focusedRoomPosition[0], 0, focusedRoomPosition[2]]
    : selectedBuilding
      ? [selectedBuilding.position[0], props.viewMode === 'floors' ? (selectedBuildingFloors.length - 1) * 0.75 : 0, selectedBuilding.position[2]]
      : [0, 0, 0]
  const routeRoomIds = new Set(props.routes.flatMap((route) => [route.fromRoomId, route.toRoomId]))

  return (
    <>
      <color attach="background" args={['#121a1a']} />
      <fog attach="fog" args={['#121a1a', 25, 48]} />
      <ambientLight intensity={1.3} />
      <directionalLight position={[10, 15, 9]} intensity={2.1} />
      <hemisphereLight args={['#d1dfd2', '#44524b', 0.75]} />
      <CameraRig target={focusTarget} controlsRef={controlsRef} overview={overview} resetToken={props.cameraResetToken} />
      <OrbitControls ref={controlsRef} makeDefault enableDamping dampingFactor={0.08} minDistance={9} maxDistance={42} maxPolarAngle={Math.PI / 2.05} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[42, 32]} />
        <meshStandardMaterial color="#1a2422" roughness={0.95} />
      </mesh>
      {props.viewMode === 'campus' && (
        <>
          <gridHelper args={[40, 40, '#31403b', '#26332f']} position={[0, 0.005, 0]} />
          <mesh position={[0, 0.015, 0]}><boxGeometry args={[1.8, 0.025, 18]} /><meshStandardMaterial color="#72756b" roughness={1} /></mesh>
          <mesh position={[0, 0.02, 0]}><boxGeometry args={[18, 0.025, 1.5]} /><meshStandardMaterial color="#72756b" roughness={1} /></mesh>
          <mesh position={[0, 0.025, -0.2]}><boxGeometry args={[18, 0.025, 1.15]} /><meshStandardMaterial color="#838477" roughness={1} /></mesh>
          {props.buildings.map((building) => (
            <Building
              key={building.id}
              building={building}
              selected={building.id === props.selectedBuildingId}
              affected={props.rooms.some((room) => building.source_building_ids.includes(room.building_id) && props.unavailableRoomIds.includes(room.id))}
              onSelect={props.onSelectBuilding}
            />
          ))}
          {props.rooms.map((room) => {
            const visible = props.buildings.find((building) => building.id === props.selectedBuildingId)?.source_building_ids.includes(room.building_id)
              || props.unavailableRoomIds.includes(room.id)
              || routeRoomIds.has(room.id)
              || room.id === props.selectedRoomId
            if (!visible) return null
            return (
              <RoomMarker
                key={room.id}
                room={room}
                position={markerPosition(room, props.rooms, props.buildings)}
                status={props.statuses[room.id] ?? 'low'}
                affected={props.unavailableRoomIds.includes(room.id)}
                receiving={props.reallocatedRoomIds.includes(room.id)}
                selected={room.id === props.selectedRoomId}
                onSelect={props.onSelectRoom}
              />
            )
          })}
          {props.routes.map((route) => {
            const fromRoom = props.rooms.find((room) => room.id === route.fromRoomId)
            const toRoom = props.rooms.find((room) => room.id === route.toRoomId)
            if (!fromRoom || !toRoom) return null
            const from = markerPosition(fromRoom, props.rooms, props.buildings)
            const to = markerPosition(toRoom, props.rooms, props.buildings)
            return <group key={route.classId}><Line points={[[from[0], 0.2, from[2]], [to[0], 0.2, to[2]]]} color="#80d9a4" lineWidth={2} dashed dashSize={0.22} gapSize={0.12} /><mesh position={[to[0], 0.23, to[2]]}><coneGeometry args={[0.13, 0.24, 5]} /><meshBasicMaterial color="#80d9a4" /></mesh></group>
          })}
          <Text position={[-10.4, 0.1, -6.4]} fontSize={0.16} anchorX="left" anchorY="middle" color="#b6c3b8" outlineColor="#131a1a" outlineWidth={0.012}>CAMPUS / NORTH</Text>
        </>
      )}
      {props.viewMode === 'building' && selectedBuilding && (
        <>
          <Building
            building={selectedBuilding}
            selected
            affected={props.rooms.some((room) => selectedBuilding.source_building_ids.includes(room.building_id) && props.unavailableRoomIds.includes(room.id))}
            onSelect={props.onSelectBuilding}
          />
          {props.rooms.filter((room) => selectedBuilding.source_building_ids.includes(room.building_id)).map((room) => (
            <RoomMarker
              key={room.id}
              room={room}
              position={markerPosition(room, props.rooms, props.buildings)}
              status={props.statuses[room.id] ?? 'low'}
              affected={props.unavailableRoomIds.includes(room.id)}
              selected={room.id === props.selectedRoomId}
              onSelect={props.onSelectRoom}
            />
          ))}
        </>
      )}
      {props.viewMode === 'floors' && selectedBuilding && selectedBuildingFloors.length > 0 && (
        <FloorStack3D building={selectedBuilding} floors={selectedBuildingFloors} selectedFloor={props.selectedFloor} onSelectFloor={props.onSelectFloor} />
      )}
      {props.viewMode === 'floor' && selectedBuilding && selectedFloorLayout && (
        <FloorRoomPlan3D building={selectedBuilding} floor={selectedFloorLayout} rooms={props.rooms} statuses={props.statuses} selectedRoomId={props.selectedRoomId} onSelectRoom={props.onSelectRoom} />
      )}
    </>
  )
}

export function CampusScene(props: CampusSceneProps) {
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [10, 12, 15], fov: 42 }}>
      <Suspense fallback={null}>
        <CampusContents {...props} />
      </Suspense>
    </Canvas>
  )
}
