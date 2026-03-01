# No-Code AI Crisis Simulation Platform

A functional prototype for operations teams to build crisis scenarios visually, simulate cascading impacts, and test mitigation actions without writing code.

## What this prototype includes

- **No-code scenario creation UI** with selectable crisis events and mitigation actions.
- **Visual scenario graph builder** using React Flow.
- **Simulation engine API** that models cascading impacts across operational units.
- **Before vs after mitigation analysis** with risk, service, financial, and recovery metrics.
- **Decision playbook recommendations** generated from explainable rule-based logic.

## Architecture

```text
frontend (React + Vite + Tailwind + React Flow + Recharts)
   -> REST API calls
backend (FastAPI)
   -> rule-based cascading simulation
   -> weighted risk scoring
   -> recommendation generator
```

## Domain modeled

This prototype targets **supply chain and operations resilience**, with units:

- logistics
- inventory
- production
- finance
- customer_service

## Quick start

### 1) Run backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Windows backend setup (PowerShell / CMD)

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

#### Fix for `Permission denied ... .venv\Scripts\python.exe`

If you see:

```text
Error: [Errno 13] Permission denied: '...\\backend\\.venv\\Scripts\\python.exe'
```

Use this sequence:

1. Delete any partially-created virtual env:

   ```powershell
   rmdir /s /q .venv
   ```

2. Ensure no process is locking `python.exe` (close terminals/IDEs in that folder).
3. Recreate with launcher explicitly:

   ```powershell
   py -3 -m venv .venv
   ```

4. If still blocked, move the repo to a writable folder outside protected sync/security paths (for example from Desktop/OneDrive to `C:\dev\NoCode`) and rerun setup.
5. As a fallback without venv, install user-local packages:

   ```powershell
   py -3 -m pip install --user -r requirements.txt
   py -3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

### 2) Run frontend

```bash
cd frontend
npm install
npm run dev
```

Open: `http://127.0.0.1:5173`

## API endpoints

- `GET /health` – service health check
- `GET /templates` – crisis events, mitigations, units
- `POST /simulate` – run simulation and mitigation comparison

### Example simulation payload

```json
{
  "scenario_name": "Operations Crisis Simulation",
  "events": [
    { "event_id": "port_strike", "intensity": 1.0 },
    { "event_id": "supplier_failure", "intensity": 1.1 }
  ],
  "links": [
    { "event_id": "port_strike", "unit": "logistics", "weight": 1.0 },
    { "event_id": "supplier_failure", "unit": "production", "weight": 1.0 }
  ],
  "mitigations": [
    { "action_id": "alternate_suppliers", "strength": 1.0 }
  ]
}
```

## Explainable scoring model

- Event templates contribute direct impact, delay, and cost pressure.
- Links increase pressure on connected units.
- Dependency propagation spreads impact in rounds across operational dependencies.
- Mitigations reduce impact on targeted units by deterministic reduction factors.
- Score outputs:
  - risk score (0–100)
  - service degradation (%)
  - estimated financial loss ($)
  - recovery time (days)

## Next extensions

- scenario persistence in PostgreSQL
- user auth and role-based workspaces
- Monte Carlo uncertainty mode
- optional ML-enhanced recommendation ranking
