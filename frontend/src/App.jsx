import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import ReactFlow, { Background, Controls } from 'reactflow'
import 'reactflow/dist/style.css'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

const initialEvents = ['port_strike', 'supplier_failure']
const initialMitigations = ['alternate_suppliers']

function App() {
  const [templates, setTemplates] = useState(null)
  const [selectedEvents, setSelectedEvents] = useState(initialEvents)
  const [selectedMitigations, setSelectedMitigations] = useState(initialMitigations)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    axios.get(`${API_BASE}/templates`).then((res) => setTemplates(res.data)).catch(() => {
      setError('Backend not reachable. Start FastAPI on port 8000.')
    })
  }, [])

  const units = templates?.units || []

  const nodes = useMemo(() => {
    if (!templates) return []
    const eventNodes = selectedEvents.map((eventId, idx) => ({
      id: `event-${eventId}`,
      position: { x: 40, y: 40 + idx * 120 },
      data: { label: templates.events[eventId]?.name || eventId },
      style: { background: '#fee2e2', border: '1px solid #dc2626', width: 180 }
    }))

    const unitNodes = units.map((unit, idx) => ({
      id: `unit-${unit}`,
      position: { x: 400, y: 40 + idx * 110 },
      data: { label: unit.replace('_', ' ').toUpperCase() },
      style: { background: '#dbeafe', border: '1px solid #2563eb', width: 220 }
    }))

    return [...eventNodes, ...unitNodes]
  }, [templates, selectedEvents, units])

  const edges = useMemo(() => {
    if (!templates) return []
    const allEdges = []
    selectedEvents.forEach((eventId, eIdx) => {
      const impacts = Object.keys(templates.events[eventId].unit_impacts || {})
      impacts.forEach((unit, uIdx) => {
        allEdges.push({
          id: `${eventId}-${unit}`,
          source: `event-${eventId}`,
          target: `unit-${unit}`,
          animated: true,
          label: `impact ${uIdx + 1}`,
          style: { stroke: '#dc2626' }
        })
      })
      allEdges.push({
        id: `${eventId}-finance-${eIdx}`,
        source: `event-${eventId}`,
        target: 'unit-finance',
        style: { stroke: '#64748b' }
      })
    })
    return allEdges
  }, [templates, selectedEvents])

  const toggleSelection = (value, list, setter) => {
    if (list.includes(value)) setter(list.filter((item) => item !== value))
    else setter([...list, value])
  }

  const runSimulation = async () => {
    if (!templates) return
    setLoading(true)
    setError('')

    const links = selectedEvents.flatMap((eventId) => {
      const event = templates.events[eventId]
      return Object.keys(event.unit_impacts || {}).map((unit) => ({ event_id: eventId, unit, weight: 1 }))
    })

    const payload = {
      scenario_name: 'Operations Crisis Simulation',
      events: selectedEvents.map((event_id) => ({ event_id, intensity: 1 })),
      links,
      mitigations: selectedMitigations.map((action_id) => ({ action_id, strength: 1 }))
    }

    try {
      const res = await axios.post(`${API_BASE}/simulate`, payload)
      setResult(res.data)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Simulation failed. Verify backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const chartData = useMemo(() => {
    if (!result) return []
    return Object.keys(result.after.unit_impacts).map((unit) => ({
      unit,
      before: result.before.unit_impacts[unit],
      after: result.after.unit_impacts[unit]
    }))
  }, [result])

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-800">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[360px_1fr]">
        <aside className="rounded-xl bg-white p-5 shadow">
          <h1 className="text-xl font-bold">No-Code AI Crisis Simulator</h1>
          <p className="mt-2 text-sm text-slate-600">Build multi-crisis operational scenarios and test mitigation plans instantly.</p>

          <section className="mt-6">
            <h2 className="mb-2 font-semibold">1) Crisis Events</h2>
            <div className="space-y-2">
              {templates && Object.entries(templates.events).map(([eventId, event]) => (
                <label key={eventId} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={selectedEvents.includes(eventId)} onChange={() => toggleSelection(eventId, selectedEvents, setSelectedEvents)} />
                  {event.name}
                </label>
              ))}
            </div>
          </section>

          <section className="mt-6">
            <h2 className="mb-2 font-semibold">2) Mitigation Actions</h2>
            <div className="space-y-2">
              {templates && Object.entries(templates.mitigations).map(([actionId, action]) => (
                <label key={actionId} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={selectedMitigations.includes(actionId)} onChange={() => toggleSelection(actionId, selectedMitigations, setSelectedMitigations)} />
                  {action.name}
                </label>
              ))}
            </div>
          </section>

          <button onClick={runSimulation} className="mt-6 w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700" disabled={loading || selectedEvents.length === 0}>
            {loading ? 'Simulating...' : 'Run Simulation'}
          </button>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </aside>

        <main className="space-y-6">
          <section className="rounded-xl bg-white p-4 shadow">
            <h2 className="mb-3 font-semibold">Scenario Graph Builder</h2>
            <div className="h-[320px] rounded border">
              <ReactFlow nodes={nodes} edges={edges} fitView>
                <Background />
                <Controls />
              </ReactFlow>
            </div>
          </section>

          {result && (
            <>
              <section className="grid gap-4 rounded-xl bg-white p-5 shadow md:grid-cols-4">
                <Metric title="Risk Score" before={result.before.risk_score} after={result.after.risk_score} />
                <Metric title="Service Degradation %" before={result.before.service_degradation_pct} after={result.after.service_degradation_pct} />
                <Metric title="Financial Loss ($)" before={result.before.estimated_financial_loss} after={result.after.estimated_financial_loss} />
                <Metric title="Recovery Time (days)" before={result.before.recovery_time_days} after={result.after.recovery_time_days} />
              </section>

              <section className="rounded-xl bg-white p-5 shadow">
                <h2 className="mb-4 font-semibold">Cascading Operational Impact (Before vs After Mitigation)</h2>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="unit" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="before" fill="#ef4444" />
                      <Bar dataKey="after" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="rounded-xl bg-white p-5 shadow">
                <h2 className="font-semibold">Decision Playbook Recommendations</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {result.after.recommendations.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

function Metric({ title, before, after }) {
  const delta = typeof before === 'number' && typeof after === 'number' ? (before - after).toFixed(2) : '0.00'

  return (
    <article className="rounded border border-slate-200 p-3">
      <h3 className="text-xs font-semibold uppercase text-slate-500">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">Before: {Number(before).toLocaleString()}</p>
      <p className="text-sm text-slate-600">After: {Number(after).toLocaleString()}</p>
      <p className="mt-2 text-xs font-semibold text-emerald-600">Improvement: {delta}</p>
    </article>
  )
}

export default App
