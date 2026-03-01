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
      position: { x: 40, y: 40 + idx * 90 },
      data: { label: templates.events[eventId]?.name || eventId },
      style: {
        background: 'linear-gradient(120deg,#fff7ed,#ffedd5)',
        border: '1px solid #fdba74',
        color: '#9a3412',
        width: 220,
        fontWeight: 600,
        borderRadius: 14,
        padding: 10,
        boxShadow: '0 8px 24px rgba(249,115,22,.12)'
      }
    }))

    const unitNodes = units.map((unit, idx) => ({
      id: `unit-${unit}`,
      position: { x: 390, y: 32 + idx * 90 },
      data: { label: unit.replace('_', ' ').toUpperCase() },
      style: {
        background: 'linear-gradient(120deg,#eff6ff,#dbeafe)',
        border: '1px solid #93c5fd',
        color: '#1e3a8a',
        width: 245,
        fontWeight: 700,
        borderRadius: 14,
        padding: 10,
        boxShadow: '0 8px 24px rgba(59,130,246,.12)'
      }
    }))

    return [...eventNodes, ...unitNodes]
  }, [templates, selectedEvents, units])

  const edges = useMemo(() => {
    if (!templates) return []
    return selectedEvents.flatMap((eventId) => {
      const impacts = Object.keys(templates.events[eventId]?.unit_impacts || {})
      return impacts.map((unit) => ({
        id: `${eventId}-${unit}`,
        source: `event-${eventId}`,
        target: `unit-${unit}`,
        animated: true,
        style: { stroke: '#f97316', strokeWidth: 1.9 }
      }))
    })
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
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">No-Code AI Crisis Simulator</h1>
            <p className="mt-1 text-sm text-slate-600">Enterprise crisis planning with instant cascading-impact analysis.</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className={`rounded-full px-3 py-1 font-semibold ${templates ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {templates ? `Connected: ${apiBase}` : 'Backend disconnected'}
            </span>
            <button onClick={discoverBackend} className="rounded-full border border-slate-300 bg-white px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50">Retry</button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[360px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Crisis events</h2>
            <div className="mt-3 space-y-2">
              {templates && Object.entries(templates.events).map(([eventId, event]) => (
                <label key={eventId} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-sm hover:border-orange-300 hover:bg-orange-50/40">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-orange-500"
                      checked={selectedEvents.includes(eventId)}
                      onChange={() => toggleSelection(eventId, selectedEvents, setSelectedEvents)}
                    />
                    {event.name}
                  </span>
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700">sev {event.severity}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="mt-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Mitigation actions</h2>
            <div className="mt-3 space-y-2">
              {templates && Object.entries(templates.mitigations).map(([actionId, action]) => (
                <label key={actionId} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-sm hover:border-emerald-300 hover:bg-emerald-50/40">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-emerald-500"
                      checked={selectedMitigations.includes(actionId)}
                      onChange={() => toggleSelection(actionId, selectedMitigations, setSelectedMitigations)}
                    />
                    {action.name}
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">-{Math.round(action.reduction * 100)}%</span>
                </label>
              ))}
            </div>
          </section>

          <button
            onClick={runSimulation}
            className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-base font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={loading || selectedEvents.length === 0}
          >
            {loading ? 'Simulating...' : 'Run Simulation'}
          </button>

          {error && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </aside>

        <main className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Scenario Graph Builder</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Live topology</span>
            </div>
            <p className="mb-4 text-sm text-slate-600">Selected crises are automatically connected to impacted operational units.</p>
            <div className="h-[390px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <ReactFlow nodes={nodes} edges={edges} fitView>
                <Background color="#cbd5e1" gap={16} />
                <Controls />
              </ReactFlow>
            </div>
          </section>

          {!result && (
            <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 shadow-sm">
              Run a simulation to view KPI shifts, cascading impacts, and recommended playbook actions.
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

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Operational Impact: Before vs After Mitigation</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                      <XAxis dataKey="unit" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="before" fill="#fb7185" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="after" fill="#34d399" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Decision Playbook</h2>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
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
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">Before: <span className="font-semibold text-slate-900">{Number(before).toLocaleString()}</span></p>
      <p className="text-sm text-slate-600">After: <span className="font-semibold text-slate-900">{Number(after).toLocaleString()}</span></p>
      <p className={`mt-2 text-sm font-semibold ${positive ? 'text-emerald-600' : 'text-amber-600'}`}>
        Delta: {positive ? '↓' : '↑'} {Math.abs(delta).toFixed(2)}
      </p>
    </article>
  )
}

export default App
