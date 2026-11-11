import type { RoomStatus } from '../types/campus'

export const STATUS_COLORS: Record<RoomStatus, string> = {
  low: '#65c995',
  normal: '#59a9e8',
  high: '#f0b849',
  overloaded: '#ef6969',
}

export const UTILIZATION_THRESHOLDS = {
  low: 40,
  normal: 75,
  high: 90,
} as const

export const STATUS_LABELS: Record<RoomStatus, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  overloaded: 'Overloaded',
}
