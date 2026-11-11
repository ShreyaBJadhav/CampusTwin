import type { CampusBuilding } from '../types/campus'

export const CAMPUS_BUILDINGS: CampusBuilding[] = [
  { id: 'academic-east', name: 'Academic Block', source_building_ids: ['academic-east'], position: [-6, 0, -3.1], size: [4.6, 2.7, 3.5], tone: '#43677b', floors: 3 },
  { id: 'academic-west', name: 'Academic West', source_building_ids: ['academic-west'], position: [-11, 0, -3.1], size: [4.6, 2.7, 3.5], tone: '#43677b', floors: 3 },
  { id: 'library-building', name: 'Library', source_building_ids: ['library-building'], position: [0, 0, -4.1], size: [4.8, 2.9, 3.8], tone: '#476c79', floors: 3 },
  { id: 'science-east', name: 'Laboratory Block', source_building_ids: ['science-east'], position: [6, 0, -3.1], size: [4.6, 2.8, 3.6], tone: '#516d7e', floors: 4 },
  { id: 'science-west', name: 'Science West', source_building_ids: ['science-west'], position: [11, 0, -3.1], size: [4.6, 2.8, 3.6], tone: '#516d7e', floors: 4 },
  { id: 'administration', name: 'Administration Block', source_building_ids: ['administration'], position: [-3, 0, 4], size: [4.3, 2.4, 3.3], tone: '#5e6977', floors: 2 },
  { id: 'cafeteria', name: 'Cafeteria', source_building_ids: ['cafeteria'], position: [4, 0, 4], size: [4.8, 2.3, 3.5], tone: '#69736a', floors: 1 },
]

export const KNOWN_BUILDING_IDS = new Set(CAMPUS_BUILDINGS.map((building) => building.id))
