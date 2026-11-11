export type RoomType = 'classroom' | 'lab' | 'library' | 'admin'
export type RoomStatus = 'low' | 'normal' | 'high' | 'overloaded'

export interface Room {
  id: string
  building_id: string
  type: RoomType
  capacity: number
  occupancy: number
}

export interface ScheduleEntry {
  class_id: string
  room_id: string
  student_count: number
  type: RoomType
}

export interface RoomUtilization extends Room {
  percentage: number
  status: RoomStatus
  warning?: 'occupancy exceeds capacity'
}

export interface SkippedRoom {
  id: string | null
  reason: string
}

export interface DashboardSummary {
  total_rooms: number
  total_buildings: number
  status_counts: Record<RoomStatus, number>
  overloaded_rooms: RoomUtilization[]
  skipped_rooms: SkippedRoom[]
}

export interface WhatIfResult {
  affected_count: number
  unavailable_room_ids: string[]
  reallocated: Array<{ class_id: string; new_room_id: string }>
  failed: Array<{ class_id: string; reason: 'no suitable room'; detail?: string }>
  impact?: {
    students_affected: number
    students_reallocated: number
    students_unplaced: number
    reallocation_rate: number
  }
}

export interface CampusBuilding {
  id: string
  name: string
  source_building_ids: string[]
  position: [number, number, number]
  size: [number, number, number]
  tone: string
  floors: number
}

export interface FloorLayout {
  building_id: string
  floor_number: number
  room_ids: string[]
}
