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

You can start the API either from the `backend/` folder or from repo root.

#### macOS / Linux

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

#### Windows (PowerShell)

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

#### Windows (Command Prompt / CMD)

```bat
cd backend
py -3 -m venv .venv
.venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

> `source` works only on Unix-like shells (bash/zsh). On Windows, use `Activate.ps1` (PowerShell) or `activate.bat` (CMD).


#### Alternative: run from repository root

```bash
cd /path/to/NoCode
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Alternative: helper script

```bash
cd backend
python run_server.py
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


#### Backend not reachable checklist

If the backend site cannot be reached, verify in order:

1. Server started without errors in terminal (look for `Uvicorn running on http://0.0.0.0:8000`).
2. Open `http://127.0.0.1:8000/health` and confirm it returns `{"status":"ok"}`.
3. Open `http://127.0.0.1:8000/` and confirm it returns API info JSON.
4. Make sure you are using **http** (not https).
5. If running from repo root, use module path `backend.main:app` (not `main:app`).
6. On Windows, allow Python through firewall on Private networks when prompted.

Quick terminal checks:

```bash
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/
```

### 2) Run frontend

```bash
cd frontend
npm install
npm run dev
```

Open: `http://127.0.0.1:5173`

## API endpoints

- `GET /` – API status + available endpoints (helpful to verify the service is running)
- `GET /health` – service health check
- `GET /templates` – crisis events, mitigations, units
- `POST /simulate` – run simulation and mitigation comparison

If you open `http://127.0.0.1:8000/` in a browser, you should now get a JSON status response (instead of `{"detail":"Not Found"}`).

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
