import { ArrowRight, CircleAlert, CircleCheck, RotateCcw } from 'lucide-react'
import type { ScheduleEntry, WhatIfResult } from '../types/campus'

interface ResultsViewProps {
  result: WhatIfResult | null
  schedule: ScheduleEntry[]
  onReset: () => void
}

export function ResultsView({ result, schedule, onReset }: ResultsViewProps) {
  if (!result) return <div className="results-placeholder">Simulation results will appear here.</div>

  const partial = result.failed.length > 0
  return (
    <section className="results-view" aria-live="polite">
      <div className={`result-banner${partial ? ' result-banner--partial' : ' result-banner--success'}`}>
        {partial ? <CircleAlert size={18} /> : <CircleCheck size={18} />}
        <div>
          <strong>{partial ? `${result.failed.length} of ${result.affected_count} classes couldn't be moved` : 'All affected classes were reallocated'}</strong>
          <span>{result.affected_count} classes impacted by this outage</span>
        </div>
      </div>

      {result.impact && (
        <div className="result-impact" aria-label="Simulation impact">
          <div><span>Students affected</span><strong>{result.impact.students_affected}</strong></div>
          <div><span>Reallocated</span><strong>{result.impact.students_reallocated}</strong></div>
          <div><span>Unplaced</span><strong>{result.impact.students_unplaced}</strong></div>
          <div><span>Reallocation rate</span><strong>{(result.impact.reallocation_rate * 100).toFixed(1)}%</strong></div>
        </div>
      )}

      <div className="result-section">
        <div className="result-section__heading"><span>Reallocated</span><strong>{result.reallocated.length}</strong></div>
        {result.reallocated.length === 0 ? <p className="result-empty">No classes were reallocated.</p> : result.reallocated.map((item) => {
          const original = schedule.find((entry) => entry.class_id === item.class_id)?.room_id ?? 'unknown room'
          return (
            <div className="result-route" key={item.class_id}>
              <div className="result-route__class"><span className="route-origin" />{item.class_id}</div>
              <div className="result-route__rooms"><span>{original}</span><ArrowRight size={14} /><strong>{item.new_room_id}</strong></div>
            </div>
          )
        })}
      </div>

      <div className="result-section result-section--failed">
        <div className="result-section__heading"><span>Could not move</span><strong>{result.failed.length}</strong></div>
        {result.failed.length === 0 ? <p className="result-empty">No classes need follow-up.</p> : result.failed.map((item) => (
          <div className="failed-row" key={item.class_id}>
            <span className="failed-row__marker" />
            <span><strong>{item.class_id}</strong><small>{item.reason}{item.detail ? ` · ${item.detail}` : ''}</small></span>
          </div>
        ))}
      </div>

      <button type="button" className="reset-button" onClick={onReset}><RotateCcw size={15} />Reset simulation</button>
    </section>
  )
}
