import { useEffect, useState } from 'react'
import { Activity, Building2, ChevronDown, Compass, LayoutDashboard, Map, Radio, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { getBuildings, getDashboardSummary, getFloorLayouts, getRooms, getSchedule, getUtilization, runWhatIf, updateRoomOccupancy, USE_MOCK_DATA } from './api/campusApi'
import { CAMPUS_BUILDINGS } from './constants/campus'
import { STATUS_COLORS } from './constants/status'
import { CampusScene } from './components/CampusScene'
import { DashboardPanel } from './components/DashboardPanel'
import { BuildingInfoPanel } from './components/BuildingInfoPanel'
import { FloorNavigationPanel } from './components/FloorNavigationPanel'
import { CampusNavigation } from './components/CampusNavigation'
import { BuildingListPanel } from './components/BuildingListPanel'
import { RoomDetail } from './components/RoomDetail'
import { WhatIfPanel } from './components/WhatIfPanel'
import type { CampusBuilding, DashboardSummary, FloorLayout, Room, RoomStatus, RoomUtilization, ScheduleEntry, WhatIfResult } from './types/campus'
import './App.css'

type PanelTab = 'dashboard' | 'room' | 'simulate'
type WorkspaceSection = 'overview' | 'buildings' | 'utilization' | 'simulation'

function App() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [utilizations, setUtilizations] = useState<Record<string, Pick<RoomUtilization, 'percentage' | 'status' | 'warning'>>>({})
  const [buildings, setBuildings] = useState<CampusBuilding[]>(CAMPUS_BUILDINGS)
  const [floorLayouts, setFloorLayouts] = useState<FloorLayout[]>([])
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([])
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<PanelTab>('dashboard')
  const [activeSection, setActiveSection] = useState<WorkspaceSection>('overview')
  const [viewMode, setViewMode] = useState<'campus' | 'building' | 'floors' | 'floor'>('campus')
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null)
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [simulation, setSimulation] = useState<WhatIfResult | null>(null)
  const [simulationError, setSimulationError] = useState<string | null>(null)
  const [simulationRunning, setSimulationRunning] = useState(false)
  const [cameraResetToken, setCameraResetToken] = useState(0)

  useEffect(() => {
    let active = true
    async function loadCampus() {
      setLoading(true)
      setLoadError(null)
      try {
        const [loadedBuildings, loadedRooms, loadedSchedule] = await Promise.all([getBuildings(), getRooms(), getSchedule()])
        const loadedFloorLayouts = await getFloorLayouts(loadedRooms, loadedBuildings)
        const [loadedSummary, loadedUtilizations] = await Promise.all([
          getDashboardSummary(loadedRooms),
          Promise.all(loadedRooms.map(async (room) => [room.id, await getUtilization(room.id)] as const)),
        ])
        if (!active) return
        setBuildings(loadedBuildings)
        setFloorLayouts(loadedFloorLayouts)
        setRooms(loadedRooms)
        setSchedule(loadedSchedule)
        setUtilizations(Object.fromEntries(loadedUtilizations))
        setSummary(loadedSummary)
      } catch (cause) {
        if (active) setLoadError(cause instanceof Error ? cause.message : 'Unable to load campus data.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadCampus()
    return () => { active = false }
  }, [])

  const utilizationById = Object.fromEntries(rooms.flatMap((room) => {
    const utilization = utilizations[room.id]
    return utilization ? [[room.id, { ...room, ...utilization }]] : []
  })) as Record<string, RoomUtilization>
  const statuses = Object.fromEntries(Object.entries(utilizationById).map(([id, room]) => [id, room.status])) as Record<string, RoomStatus>
  const selectedRoom = selectedRoomId ? utilizationById[selectedRoomId] ?? null : null
  const selectedBuilding = buildings.find((building) => building.id === selectedBuildingId) ?? null
  const unavailableRoomIds = simulation?.unavailable_room_ids ?? []
  const reallocatedRoomIds = simulation?.reallocated.map((allocation) => allocation.new_room_id) ?? []
  const routes = simulation?.reallocated.flatMap((allocation) => {
    const scheduleEntry = schedule.find((entry) => entry.class_id === allocation.class_id)
    return scheduleEntry ? [{ classId: allocation.class_id, fromRoomId: scheduleEntry.room_id, toRoomId: allocation.new_room_id }] : []
  }) ?? []

  const selectBuilding = (buildingId: string) => {
    setActiveSection('buildings')
    setSelectedBuildingId(buildingId)
    setSelectedFloor(null)
    setSelectedRoomId(null)
    setViewMode('building')
    setActiveTab('room')
  }

  const selectRoom = (roomId: string) => {
    setActiveSection('buildings')
    const room = rooms.find((item) => item.id === roomId)
    if (room) {
      const roomBuilding = buildings.find((building) => building.source_building_ids.includes(room.building_id))
      setSelectedBuildingId(roomBuilding?.id ?? null)
      const layout = floorLayouts.find((floor) => floor.room_ids.includes(roomId))
      setSelectedFloor(layout?.floor_number ?? null)
      setViewMode(layout ? 'floor' : 'building')
    }
    setSelectedRoomId(roomId)
    setActiveTab('room')
  }

  const focusRoom = (roomId: string) => selectRoom(roomId)

  const changeRoomOccupancy = async (roomId: string, occupancy: number) => {
    await updateRoomOccupancy(roomId, occupancy)
    const refreshedRooms = await getRooms()
    const [refreshedSummary, refreshedUtilizations] = await Promise.all([
      getDashboardSummary(refreshedRooms),
      Promise.all(refreshedRooms.map(async (room) => [room.id, await getUtilization(room.id)] as const)),
    ])
    setRooms(refreshedRooms)
    setUtilizations(Object.fromEntries(refreshedUtilizations))
    setSummary(refreshedSummary)
  }

  const runSimulation = async (selection: { unavailableRoomId?: string; unavailableBuildingId?: string }) => {
    setSimulationRunning(true)
    setSimulationError(null)
    try {
      setSimulation(await runWhatIf(selection))
      setSelectedBuildingId(null)
      setSelectedFloor(null)
      setSelectedRoomId(null)
      setViewMode('campus')
      setCameraResetToken((value) => value + 1)
    } catch (cause) {
      setSimulationError(cause instanceof Error ? cause.message : 'Unable to run this simulation.')
      setSimulation(null)
    } finally {
      setSimulationRunning(false)
    }
  }

  const resetSimulation = () => {
    setSimulation(null)
    setSimulationError(null)
  }

  const resetView = () => {
    setSelectedBuildingId(null)
    setSelectedFloor(null)
    setSelectedRoomId(null)
    setViewMode('campus')
    setCameraResetToken((value) => value + 1)
  }

  const exploreFloors = () => {
    setSelectedFloor(null)
    setSelectedRoomId(null)
    setViewMode('floors')
  }

  const selectFloor = (floorNumber: number) => {
    setSelectedFloor(floorNumber)
    setSelectedRoomId(null)
    setViewMode('floor')
  }

  const backToBuilding = () => {
    setSelectedFloor(null)
    setSelectedRoomId(null)
    setViewMode('building')
  }

  const backToFloors = () => {
    setSelectedFloor(null)
    setSelectedRoomId(null)
    setViewMode('floors')
  }

  const returnToCampus = () => {
    resetView()
    setActiveSection('overview')
    setActiveTab('dashboard')
  }

  const navigateSection = (section: WorkspaceSection) => {
    setActiveSection(section)
    if (section === 'overview') {
      returnToCampus()
    } else if (section === 'buildings') {
      resetView()
      setActiveSection('buildings')
      setActiveTab('room')
    } else if (section === 'utilization') {
      resetView()
      setActiveSection('utilization')
      setActiveTab('dashboard')
    } else {
      setActiveTab('simulate')
    }
  }

  const tabs: Array<{ id: PanelTab; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'room', label: 'Room', icon: Map },
    { id: 'simulate', label: 'Simulate', icon: SlidersHorizontal },
  ]

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#campus" aria-label="CampusTwin home">
          <span className="brand-mark"><Building2 size={18} strokeWidth={1.8} /></span>
          <span className="brand-name">Digital Twin Campus Resource Management</span>
          <span className="brand-divider" />
          <span className="brand-project">CSE / PBL</span>
        </a>
        <div className="topbar-right">
          <span className="model-state"><i />MODEL ONLINE</span>
          <span className="topbar-divider" />
          <span className="term-label">FALL TERM <ChevronDown size={13} /></span>
          <button type="button" className="icon-button topbar-reset" onClick={() => { resetSimulation(); resetView() }} title="Reset view and simulation" aria-label="Reset view and simulation"><RotateCcw size={15} /></button>
        </div>
      </header>

      <div className="workspace-heading">
        <div className="workspace-title">
          <div className="title-kicker"><Compass size={14} />DIGITAL CAMPUS TWIN <span>/</span> NORTH DISTRICT</div>
          <h1>Campus operations</h1>
        </div>
        <div className="workspace-meta">
          <span className="meta-chip"><Activity size={14} />ROOM UTILIZATION</span>
          <span className="meta-timestamp"><Radio size={12} />{loading ? 'SYNCING DATA' : loadError ? 'DATA UNAVAILABLE' : USE_MOCK_DATA ? 'MOCK DATA · LIVE MODEL' : 'LIVE API · LIVE MODEL'}</span>
        </div>
      </div>

      <section className="main-grid" id="campus">
        <CampusNavigation activeItem={activeSection} onNavigate={navigateSection} />
        <div className="scene-column">
          <div className="scene-frame">
            <div className="scene-topline">
              <div><span className="scene-live-dot" />CAMPUS MODEL <span className="scene-topline-separator">/</span> 3D VIEW</div>
              <div className="scene-tools"><span>ORBIT <b>DRAG</b></span><span>ZOOM <b>SCROLL</b></span><button type="button" onClick={resetView} title="Reset camera" aria-label="Reset camera"><RotateCcw size={13} /></button></div>
            </div>
            <div className="scene-canvas">
              <CampusScene
                cameraResetToken={cameraResetToken}
                viewMode={viewMode}
                buildings={buildings}
                rooms={rooms}
                schedule={schedule}
                floorLayouts={floorLayouts}
                selectedFloor={selectedFloor}
                statuses={statuses}
                selectedBuildingId={selectedBuildingId}
                selectedRoomId={selectedRoomId}
                unavailableRoomIds={unavailableRoomIds}
                reallocatedRoomIds={reallocatedRoomIds}
                routes={routes}
                onSelectBuilding={selectBuilding}
                onSelectFloor={selectFloor}
                onSelectRoom={selectRoom}
              />
              {loading && <div className="scene-message"><span className="loader" />Syncing campus model</div>}
              {!loading && loadError && <div className="scene-message scene-message--error">{loadError}</div>}
              {!loading && !loadError && rooms.length === 0 && <div className="scene-message">No rooms are available for this campus.</div>}
              <div className="scene-overlay scene-overlay--left">
                <div className="scene-coordinates">CAMPUS GRID <span>35.682 / -78.714</span></div>
                <div className="scene-legend">
                  {(Object.entries(STATUS_COLORS) as Array<[RoomStatus, string]>).map(([status, color]) => <span key={status}><i style={{ backgroundColor: color }} />{status}</span>)}
                </div>
              </div>
              <div className="scene-overlay scene-overlay--right">
                <span className="north-indicator">N <b>↑</b></span>
                <span className="scene-scale"><i />200 m</span>
              </div>
              {simulation && simulation.unavailable_room_ids.length > 0 && (
                <div className="outage-toast"><span className="outage-pulse" />OUTAGE LAYER <strong>{simulation.unavailable_room_ids.length} ROOMS</strong></div>
              )}
            </div>
            <div className="scene-footer">
              <div className="scene-selection"><span className="selection-square" />{selectedRoom?.id ?? selectedBuilding?.name ?? 'Entire campus'}<span className="scene-footer-separator">/</span>{selectedRoom ? selectedRoom.building_id : 'NORTH DISTRICT'}</div>
              <div className="scene-footer-right"><span>{rooms.length} ROOMS</span><span>{buildings.length} BUILDINGS</span></div>
            </div>
          </div>
          <div className="scene-caption"><span>INTERACTIVE SITE MODEL</span><span>{viewMode === 'campus' ? 'Click a building to inspect rooms · Drag to orbit' : 'Click a floor or room to inspect · Drag to orbit'}</span></div>
        </div>

        <aside className="side-panel">
          <div className="panel-tabs" role="tablist" aria-label="Campus panels">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} id={`tab-${id}`} type="button" role="tab" aria-selected={activeTab === id} aria-controls="panel-content" className={`panel-tab${activeTab === id ? ' is-active' : ''}`} onClick={() => {
                setActiveTab(id)
                setActiveSection(id === 'dashboard' ? 'overview' : id === 'room' ? 'buildings' : 'simulation')
              }}>
                <Icon size={15} strokeWidth={1.8} /><span>{label}</span>{id === 'simulate' && simulation && <i className="tab-indicator" />}
              </button>
            ))}
          </div>
          <div className="panel-content" id="panel-content" role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
            {activeSection === 'buildings' && viewMode === 'campus' && <BuildingListPanel buildings={buildings} rooms={rooms} onSelectBuilding={selectBuilding} />}
            {(activeSection === 'overview' || activeSection === 'utilization') && activeTab === 'dashboard' && <DashboardPanel summary={summary} rooms={rooms} utilizations={utilizations} statuses={statuses} loading={loading} error={loadError} onFocusRoom={focusRoom} />}
            {activeSection === 'buildings' && activeTab === 'room' && selectedBuilding && viewMode === 'building' && (
              <>
                <BuildingInfoPanel building={selectedBuilding} rooms={rooms} floorLayouts={floorLayouts} onExploreFloors={exploreFloors} />
                {selectedRoom && <RoomDetail building={selectedBuilding} rooms={[selectedRoom]} selectedRoom={selectedRoom} buildingName={selectedBuilding.name} onSelectRoom={selectRoom} onUpdateOccupancy={changeRoomOccupancy} loading={loading} error={loadError} />}
              </>
            )}
            {activeSection === 'buildings' && activeTab === 'room' && selectedBuilding && (viewMode === 'floors' || viewMode === 'floor') && (
              <FloorNavigationPanel
                building={selectedBuilding}
                floors={floorLayouts.filter((floor) => floor.building_id === selectedBuilding.id)}
                rooms={rooms}
                selectedFloor={selectedFloor}
                selectedRoom={selectedRoom}
                viewMode={viewMode}
                loading={loading}
                error={loadError}
                onSelectFloor={selectFloor}
                onSelectRoom={selectRoom}
                onUpdateOccupancy={changeRoomOccupancy}
                onBackToBuilding={backToBuilding}
                onBackToFloors={backToFloors}
                onReturnToCampus={returnToCampus}
              />
            )}
            {activeSection === 'buildings' && activeTab === 'room' && !selectedBuilding && viewMode !== 'campus' && <RoomDetail building={null} rooms={rooms} selectedRoom={null} onSelectRoom={selectRoom} onUpdateOccupancy={changeRoomOccupancy} loading={loading} error={loadError} />}
            {activeSection === 'simulation' && activeTab === 'simulate' && <WhatIfPanel rooms={rooms} buildings={buildings} schedule={schedule} result={simulation} running={simulationRunning} error={simulationError ?? loadError} onRun={runSimulation} onReset={resetSimulation} />}
          </div>
          <footer className="panel-footer"><span>CAMPUSTWIN <b>0.1.0</b></span><span>ROLE A / FRONTEND + 3D</span></footer>
        </aside>
      </section>
      <footer className="app-footer"><span>Digital infrastructure for campus decisions.</span><span>DATA SOURCE <b>{loadError ? 'OFFLINE' : USE_MOCK_DATA ? 'MOCK API' : 'LIVE API'}</b></span></footer>
    </main>
  )
}

export default App
