import { KNOWN_BUILDING_IDS } from '../constants/campus'
import { UTILIZATION_THRESHOLDS } from '../constants/status'
import type { CampusBuilding, DashboardSummary, FloorLayout, Room, RoomStatus, RoomUtilization, ScheduleEntry, WhatIfResult } from '../types/campus'
import { CAMPUS_BUILDINGS } from '../constants/campus'

export const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK === 'true'
const USE_MOCK = USE_MOCK_DATA
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'
const API_PATHS = {
  buildings: import.meta.env.VITE_API_BUILDINGS_PATH ?? '/buildings',
  rooms: import.meta.env.VITE_API_ROOMS_PATH ?? '/rooms',
  room: import.meta.env.VITE_API_ROOM_PATH ?? '/rooms/{id}',
  schedule: import.meta.env.VITE_API_SCHEDULE_PATH ?? '/schedule',
}

interface BackendBuilding {
  id: string
  name: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!response.ok) {
    let detail = response.status === 404
      ? 'Unknown id'
      : response.status === 400
        ? 'Invalid input'
        : `Campus API request failed (${response.status})`
    try {
      const body: unknown = await response.json()
      if (
        typeof body === 'object'
        && body !== null
        && 'detail' in body
      ) {
        if (typeof body.detail === 'string') {
          detail = body.detail
        } else if (Array.isArray(body.detail)) {
          const validationMessages = body.detail.flatMap((item: unknown) => {
            if (typeof item !== 'object' || item === null || !('msg' in item) || typeof item.msg !== 'string') return []
            const location = 'loc' in item && Array.isArray(item.loc)
              ? item.loc.filter((part): part is string | number => typeof part === 'string' || typeof part === 'number').join('.')
              : ''
            return [location ? `${location}: ${item.msg}` : item.msg]
          })
          if (validationMessages.length > 0) detail = validationMessages.join('; ')
        }
      }
    } catch {
      // Keep the status-based message when the response has no JSON body.
    }
    throw new Error(detail)
  }
  return response.json() as Promise<T>
}

async function requestMockData<T>(filename: string): Promise<T> {
  const response = await fetch(`/data/${filename}`)
  if (!response.ok) throw new Error(`Mock data request failed (${response.status})`)
  return response.json() as Promise<T>
}

export function calculate_utilization(room: Room): Pick<RoomUtilization, 'percentage' | 'status' | 'warning'> {
  const percentage = room.capacity > 0 ? (room.occupancy / room.capacity) * 100 : 0
  let status: RoomStatus
  if (percentage < UTILIZATION_THRESHOLDS.low) status = 'low'
  else if (percentage <= UTILIZATION_THRESHOLDS.normal) status = 'normal'
  else if (percentage <= UTILIZATION_THRESHOLDS.high) status = 'high'
  else status = 'overloaded'

  return {
    percentage,
    status,
    ...(room.occupancy > room.capacity ? { warning: 'occupancy exceeds capacity' as const } : {}),
  }
}

export async function getRooms(): Promise<Room[]> {
  const rooms = USE_MOCK
    ? await requestMockData<Room[]>('mock_rooms.json')
    : await request<Room[]>(API_PATHS.rooms)
  return rooms.map(({ id, building_id, type, capacity, occupancy }) => ({
    id,
    building_id,
    type,
    capacity,
    occupancy,
  }))
}

export async function getSchedule(): Promise<ScheduleEntry[]> {
  const schedule = USE_MOCK
    ? await requestMockData<ScheduleEntry[]>('mock_schedule.json')
    : await request<ScheduleEntry[]>(API_PATHS.schedule)
  return schedule.map(({ class_id, room_id, student_count, type }) => ({
    class_id,
    room_id,
    student_count,
    type,
  }))
}

export async function getFloorLayouts(rooms: Room[], buildings: CampusBuilding[]): Promise<FloorLayout[]> {
  return buildings.flatMap((building) => {
    const buildingRooms = rooms.filter((room) => building.source_building_ids.includes(room.building_id))
    const roomIdsByFloor = Array.from({ length: building.floors }, () => [] as string[])
    buildingRooms.forEach((room, index) => {
      roomIdsByFloor[index % building.floors].push(room.id)
    })
    return roomIdsByFloor.map((room_ids, index) => ({
      building_id: building.id,
      floor_number: index + 1,
      room_ids,
    }))
  })
}

export async function getBuildings(): Promise<CampusBuilding[]> {
  if (USE_MOCK) return CAMPUS_BUILDINGS

  const backendBuildings = await request<BackendBuilding[]>(API_PATHS.buildings)
  return backendBuildings.map((building, index) => {
    const layout = CAMPUS_BUILDINGS.find((candidate) => candidate.id === building.id)
    if (layout) return { ...building, ...layout, id: building.id }

    console.warn(`No local layout metadata for building "${building.id}"; using a fallback layout.`)
    return {
      ...building,
      source_building_ids: [building.id],
      position: [((index % 4) - 1.5) * 5.5, 0, Math.floor(index / 4) * 7 - 3] as [number, number, number],
      size: [4.6, 2.7, 3.5] as [number, number, number],
      tone: '#516d7e',
      floors: 2,
    }
  })
}

export async function getRoomsForBuilding(buildingId: string): Promise<Room[]> {
  if (!USE_MOCK) {
    return request<Room[]>(`${API_PATHS.rooms}?building_id=${encodeURIComponent(buildingId)}`)
  }
  const rooms = await getRooms()
  const building = CAMPUS_BUILDINGS.find((item) => item.id === buildingId)
  return rooms.filter((room) => building?.source_building_ids.includes(room.building_id))
}

export async function getRoom(roomId: string): Promise<Room> {
  if (!USE_MOCK) return request<Room>(API_PATHS.room.replace('{id}', encodeURIComponent(roomId)))
  const rooms = await getRooms()
  const room = rooms.find((item) => item.id === roomId)
  if (!room) throw new Error(`Unknown room: ${roomId}`)
  return room
}

export async function updateRoomOccupancy(roomId: string, occupancy: number): Promise<Room> {
  if (!Number.isFinite(occupancy) || !Number.isInteger(occupancy)) throw new Error('Occupancy must be a whole number.')
  if (USE_MOCK) throw new Error('Occupancy updates require the connected backend; mock mode does not persist writes.')
  return request<Room>(`/rooms/${encodeURIComponent(roomId)}/occupancy`, {
    method: 'PATCH',
    body: JSON.stringify({ current_occupancy: occupancy }),
  })
}

export async function getUtilization(roomId: string): Promise<Pick<RoomUtilization, 'percentage' | 'status' | 'warning'>> {
  if (!USE_MOCK) {
    return request<Pick<RoomUtilization, 'percentage' | 'status' | 'warning'>>(
      `/rooms/${encodeURIComponent(roomId)}/utilization`,
    )
  }

  const rooms = await getRooms()
  const room = rooms.find((item) => item.id === roomId)
  if (!room) throw new Error(`Unknown room: ${roomId}`)
  return calculate_utilization(room)
}

export async function getDashboardSummary(rooms?: Room[]): Promise<DashboardSummary> {
  if (!USE_MOCK) return request<DashboardSummary>('/dashboard/summary')
  if (!rooms) throw new Error('Rooms are required to calculate a mock dashboard summary.')

  const status_counts: Record<RoomStatus, number> = { low: 0, normal: 0, high: 0, overloaded: 0 }
  const overloaded_rooms: RoomUtilization[] = []
  const skipped_rooms: DashboardSummary['skipped_rooms'] = []
  const buildingIds = new Set<string>()

  for (const room of rooms) {
    if (room && typeof room.building_id === 'string' && room.building_id) buildingIds.add(room.building_id)
    if (!room || typeof room.id !== 'string' || !room.id) {
      skipped_rooms.push({ id: null, reason: 'missing room id' })
      continue
    }
    if (!Number.isFinite(room.capacity) || room.capacity <= 0 || !Number.isFinite(room.occupancy)) {
      skipped_rooms.push({ id: room.id, reason: 'invalid capacity or occupancy' })
      continue
    }

    const utilization = calculate_utilization(room)
    status_counts[utilization.status] += 1
    if (utilization.status === 'overloaded') overloaded_rooms.push({ ...room, ...utilization })
  }

  return {
    total_rooms: rooms.length,
    total_buildings: buildingIds.size,
    status_counts,
    overloaded_rooms,
    skipped_rooms,
  }
}

export async function runWhatIf(input: {
  unavailableRoomId?: string
  unavailableBuildingId?: string
}): Promise<WhatIfResult> {
  const { unavailableRoomId, unavailableBuildingId } = input
  if (Boolean(unavailableRoomId) === Boolean(unavailableBuildingId)) {
    throw new Error('Choose exactly one room or building to take offline.')
  }

  if (!USE_MOCK) {
    const body = unavailableRoomId
      ? { unavailable_room_id: unavailableRoomId }
      : { unavailable_building_id: unavailableBuildingId }
    return request<WhatIfResult>('/simulate/what-if', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  const [rooms, schedule] = await Promise.all([getRooms(), getSchedule()])
  let unavailable_room_ids: string[]

  if (unavailableRoomId) {
    if (!rooms.some((room) => room.id === unavailableRoomId)) throw new Error(`Unknown room: ${unavailableRoomId}`)
    unavailable_room_ids = [unavailableRoomId]
  } else {
    if (!KNOWN_BUILDING_IDS.has(unavailableBuildingId!)) throw new Error(`Unknown building: ${unavailableBuildingId}`)
    const building = CAMPUS_BUILDINGS.find((item) => item.id === unavailableBuildingId)
    unavailable_room_ids = rooms.filter((room) => building?.source_building_ids.includes(room.building_id)).map((room) => room.id)
  }

  const unavailableIds = new Set(unavailable_room_ids)
  const affectedClasses = schedule.filter((entry) => unavailableIds.has(entry.room_id))

  if (unavailableRoomId === 'classroom-101') {
    return {
      affected_count: 2,
      unavailable_room_ids,
      reallocated: [
        { class_id: 'class-east-lecture-a', new_room_id: 'classroom-401' },
        { class_id: 'class-east-lecture-b', new_room_id: 'classroom-301' },
      ],
      failed: [],
    }
  }

  if (unavailableBuildingId === 'academic-east') {
    return {
      affected_count: 4,
      unavailable_room_ids,
      reallocated: [{ class_id: 'class-east-lecture-a', new_room_id: 'classroom-201' }],
      failed: [
        { class_id: 'class-east-lab-a', reason: 'no suitable room' },
        { class_id: 'class-east-lecture-b', reason: 'no suitable room' },
        { class_id: 'class-east-lab-b', reason: 'no suitable room' },
      ],
    }
  }

  const usedAlternativeIds = new Set<string>()
  const reallocated: WhatIfResult['reallocated'] = []
  const failed: WhatIfResult['failed'] = []

  for (const entry of affectedClasses) {
    const alternative = rooms
      .map((room, index) => ({ room, index }))
      .filter(({ room }) => !unavailableIds.has(room.id)
        && !usedAlternativeIds.has(room.id)
        && room.id !== entry.room_id
        && room.type === entry.type
        && room.capacity >= entry.student_count)
      .sort((left, right) => left.room.capacity - right.room.capacity || left.index - right.index)[0]?.room

    if (alternative) {
      usedAlternativeIds.add(alternative.id)
      reallocated.push({ class_id: entry.class_id, new_room_id: alternative.id })
    } else {
      failed.push({ class_id: entry.class_id, reason: 'no suitable room' })
    }
  }

  return { affected_count: affectedClasses.length, unavailable_room_ids, reallocated, failed }
}
