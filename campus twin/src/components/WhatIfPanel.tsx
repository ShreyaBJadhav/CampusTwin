import { CircleHelp, Play, Radio } from 'lucide-react'
import { useState } from 'react'
import type { CampusBuilding, Room, ScheduleEntry, WhatIfResult } from '../types/campus'
import { ResultsView } from './ResultsView'

interface WhatIfPanelProps {
  rooms: Room[]
  buildings: CampusBuilding[]
  schedule: ScheduleEntry[]
  result: WhatIfResult | null
  running: boolean
  error: string | null
  onRun: (selection: { unavailableRoomId?: string; unavailableBuildingId?: string }) => Promise<void>
  onReset: () => void
}

export function WhatIfPanel({ rooms, buildings, schedule, result, running, error, onRun, onReset }: WhatIfPanelProps) {
  const [mode, setMode] = useState<'room' | 'building'>('building')
  const [targetId, setTargetId] = useState('academic-east')
  const availableTargets = mode === 'room' ? rooms : buildings

  const changeMode = (nextMode: 'room' | 'building') => {
    setMode(nextMode)
    setTargetId(nextMode === 'building' ? 'academic-east' : rooms[0]?.id ?? '')
  }

  const reset = () => {
    onReset()
    setMode('building')
    setTargetId('academic-east')
  }

  return (
    <div className="whatif-panel">
      <div className="panel-heading">
        <div><p className="eyebrow">Scenario planning</p><h2>What-if simulator</h2></div>
        <span className="simulation-mark"><Radio size={15} />SIM</span>
      </div>

      <div className="scenario-form">
        <label className="field-label" htmlFor="outage-mode">Outage type</label>
        <select id="outage-mode" value={mode} onChange={(event) => changeMode(event.target.value as 'room' | 'building')}>
          <option value="room">Room outage</option>
          <option value="building">Building outage</option>
        </select>

        <label className="field-label" htmlFor="outage-target">Unavailable {mode}</label>
        <select id="outage-target" value={targetId} onChange={(event) => setTargetId(event.target.value)} disabled={availableTargets.length === 0}>
          {availableTargets.map((item) => <option key={item.id} value={item.id}>{'name' in item ? item.name : item.id}</option>)}
        </select>

        <button className="run-button" type="button" onClick={() => void onRun(mode === 'room' ? { unavailableRoomId: targetId } : { unavailableBuildingId: targetId })} disabled={running || !targetId}>
          {running ? <span className="button-spinner" /> : <Play size={15} fill="currentColor" />}
          {running ? 'Running scenario' : 'Run simulation'}
        </button>
        {error && <div className="sim-error" role="alert">{error}</div>}
      </div>

      <details className="limitations-popover">
        <summary><CircleHelp size={16} /><span>Known limitations</span><span className="summary-chevron">+</span></summary>
        <div className="limitations-content">
          <p>Allocation uses total capacity, not free seats.</p>
          <p>No time slots are modeled, so double-booking protection only applies within one simulation run.</p>
        </div>
      </details>

      {running ? (
        <div className="panel-state panel-state--sim"><span className="loader" />Evaluating available rooms</div>
      ) : (
        <ResultsView result={result} schedule={schedule} onReset={reset} />
      )}
    </div>
  )
}
