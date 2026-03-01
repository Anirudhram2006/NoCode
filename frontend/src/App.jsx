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

const API_CANDIDATES = [
  import.meta.env.VITE_API_BASE,
  'http://127.0.0.1:8000',
  'http://localhost:8000'
].filter(Boolean)

const initialEvents = ['port_strike', 'supplier_failure']
const initialMitigations = ['alternate_suppliers']

function App() {
  const [templates, setTemplates] = useState(null)
  const [selectedEvents, setSelectedEvents] = useState(initialEvents)
  const [selectedMitigations, setSelectedMitigations] = useState(initialMitigations)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [apiBase, setApiBase] = useState(API_CANDIDATES[0])

  useEffect(() => {
    discoverBackend()
  }, [])

  const discoverBackend = async () => {
    setError('')
    for (const candidate of API_CANDIDATES) {
      try {
        const health = await axios.get(`${candidate}/health`, { timeout: 1500 })
        if (health?.data?.status === 'ok') {
          const res = await axios.get(`${candidate}/templates`)
          setApiBase(candidate)
          setTemplates(res.data)
          return
        }
      } catch {
        // try next candidate
      }
    }
    setTemplates(null)
    setError('Backend not reachable. Start FastAPI and verify http://127.0.0.1:8000/health returns {"status":"ok"}.')
  }

  const units = templates?.units || []

  const nodes = useMemo(() => {
    if (!templates) return []
    const eventNodes = selectedEvents.map((eventId, idx) => ({
      id: `event-${eventId}`,
      position: { x: 30, y: 30 + idx * 95 },
      data: { label: templates.events[eventId]?.name || eventId },
      style: {
        background: 'linear-gradient(135deg,#fee2e2,#fecaca)',
        border: '1px solid #f87171',
        color: '#7f1d1d',
        width: 210,
        fontWeight: 600,
        borderRadius: 12,
        padding: 8,
      }
    }))

    const unitNodes = units.map((unit, idx) => ({
      id: `unit-${unit}`,
      position: { x: 390, y: 24 + idx * 95 },
      data: { label: unit.replace('_', ' ').toUpperCase() },
      style: {
        background: 'linear-gradient(135deg,#dbeafe,#bfdbfe)',
        border: '1px solid #60a5fa',
        color: '#1e3a8a',
        width: 230,
        fontWeight: 700,
        borderRadius: 12,
        padding: 8,
      }
    }))

    return [...eventNodes, ...unitNodes]
  }, [templates, selectedEvents, units])

  const edges = useMemo(() => {
    if (!templates) return []
    const allEdges = []
    selectedEvents.forEach((eventId) => {
      const impacts = Object.keys(templates.events[eventId]?.unit_impacts || {})
      impacts.forEach((unit) => {
        allEdges.push({
          id: `${eventId}-${unit}`,
          source: `event-${eventId}`,
          target: `unit-${unit}`,
          animated: true,
          style: { stroke: '#ef4444', strokeWidth: 1.8 }
        })
      })
    })
    return allEdges
  }, [templates, selectedEvents])

  const toggleSelection = (value, list, setter) => {
    if (list.includes(value)) setter(list.filter((item) => item !== value))
    else setter([...list, value])
  }

  const runSimulation = async () => {
    if (!templates) {
      setError('No backend connection. Click “Retry connection” after starting FastAPI.')
      return
    }

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
      const res = await axios.post(`${apiBase}/simulate`, payload)
      setResult(res.data)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Simulation failed. Check backend logs and endpoint availability.')
    } finally {
      setLoading(false)
    }
  }

  const chartData = useMemo(() => {
    if (!result) return []
    return Object.keys(result.after.unit_impacts).map((unit) => ({
      unit: unit.replace('_', ' '),
      before: result.before.unit_impacts[unit],
      after: result.after.unit_impacts[unit]
    }))
  }, [result])

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(circle_at_20%_20%,#1e293b_0,#020617_55%)] p-6 text-slate-100">
      <div className="mx-auto mb-6 max-w-7xl rounded-2xl border border-slate-700 bg-slate-900/70 p-5 shadow-2xl backdrop-blur">
        <h1 className="text-3xl font-bold tracking-tight">No-Code AI Crisis Simulator</h1>
        <p className="mt-2 text-slate-300">Design crisis scenarios, model cascading impacts, and compare mitigation plans in seconds.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
          <span className={`rounded-full px-3 py-1 font-semibold ${templates ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
            {templates ? `Backend connected: ${apiBase}` : 'Backend disconnected'}
          </span>
          <button onClick={discoverBackend} className="rounded-full border border-slate-600 px-3 py-1 font-semibold hover:bg-slate-800">Retry connection</button>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[360px_1fr]">
        <aside className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 shadow-2xl backdrop-blur">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">1) Crisis events</h2>
            <div className="mt-3 space-y-2">
              {templates && Object.entries(templates.events).map(([eventId, event]) => (
                <label key={eventId} className="flex items-center justify-between rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800/80">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(eventId)}
                      onChange={() => toggleSelection(eventId, selectedEvents, setSelectedEvents)}
                    />
                    {event.name}
                  </span>
                  <span className="rounded bg-red-500/15 px-2 py-0.5 text-xs text-red-300">sev {event.severity}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">2) Mitigation actions</h2>
            <div className="mt-3 space-y-2">
              {templates && Object.entries(templates.mitigations).map(([actionId, action]) => (
                <label key={actionId} className="flex items-center justify-between rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800/80">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedMitigations.includes(actionId)}
                      onChange={() => toggleSelection(actionId, selectedMitigations, setSelectedMitigations)}
                    />
                    {action.name}
                  </span>
                  <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">-{Math.round(action.reduction * 100)}%</span>
                </label>
              ))}
            </div>
          </section>

          <button
            onClick={runSimulation}
            className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-base font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-600"
            disabled={loading || selectedEvents.length === 0}
          >
            {loading ? 'Simulating...' : 'Run Simulation'}
          </button>

          {error && <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        </aside>

        <main className="space-y-6">
          <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4 shadow-2xl backdrop-blur">
            <h2 className="mb-2 text-lg font-semibold">Scenario Graph Builder</h2>
            <p className="mb-4 text-xs text-slate-400">Selected crises are auto-linked to impacted units. Add/remove events to explore cascading topology.</p>
            <div className="h-[360px] overflow-hidden rounded-xl border border-slate-700">
              <ReactFlow nodes={nodes} edges={edges} fitView>
                <Background color="#334155" />
                <Controls />
              </ReactFlow>
            </div>
          </section>

          {!result && (
            <section className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center text-slate-400">
              Run a simulation to view risk scores, financial impact, recovery outlook, and mitigation benefits.
            </section>
          )}

          {result && (
            <>
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Metric title="Risk Score" before={result.before.risk_score} after={result.after.risk_score} />
                <Metric title="Service Degradation %" before={result.before.service_degradation_pct} after={result.after.service_degradation_pct} />
                <Metric title="Financial Loss ($)" before={result.before.estimated_financial_loss} after={result.after.estimated_financial_loss} />
                <Metric title="Recovery Time (days)" before={result.before.recovery_time_days} after={result.after.recovery_time_days} />
              </section>

              <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 shadow-2xl backdrop-blur">
                <h2 className="mb-4 text-lg font-semibold">Operational Impact (Before vs After Mitigation)</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="unit" stroke="#cbd5e1" />
                      <YAxis stroke="#cbd5e1" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="before" fill="#f87171" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="after" fill="#34d399" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 shadow-2xl backdrop-blur">
                <h2 className="text-lg font-semibold">Decision Playbook</h2>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-200">
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
  const delta = before - after
  const positive = delta >= 0

  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4 shadow-2xl">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      <p className="mt-2 text-sm text-slate-300">Before: <span className="font-medium text-slate-100">{Number(before).toLocaleString()}</span></p>
      <p className="text-sm text-slate-300">After: <span className="font-medium text-slate-100">{Number(after).toLocaleString()}</span></p>
      <p className={`mt-2 text-sm font-semibold ${positive ? 'text-emerald-300' : 'text-amber-300'}`}>
        Delta: {positive ? '↓' : '↑'} {Math.abs(delta).toFixed(2)}
      </p>
    </article>
  )
}

export default App
