from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="No-Code AI Crisis Simulation API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
UNIT_ORDER = ["logistics", "production", "inventory", "finance", "customer_service"]
DEFAULT_DEPENDENCIES = {
    "logistics": ["inventory", "production"],
    "inventory": ["production", "customer_service"],
    "production": ["finance", "customer_service"],
    "finance": ["customer_service"],
    "customer_service": [],
}

EVENT_LIBRARY = {
    "port_strike": {
        "name": "Port Strike",
        "severity": 0.7,
        "unit_impacts": {"logistics": 34, "inventory": 18},
        "delay_hours": 14,
        "cost_factor": 0.22,
    },
    "supplier_failure": {
        "name": "Supplier Failure",
        "severity": 0.8,
        "unit_impacts": {"inventory": 38, "production": 28},
        "delay_hours": 22,
        "cost_factor": 0.3,
    },
    "fuel_spike": {
        "name": "Fuel Price Spike",
        "severity": 0.5,
        "unit_impacts": {"logistics": 20, "finance": 12},
        "delay_hours": 6,
        "cost_factor": 0.24,
    },
    "cyberattack": {
        "name": "Cyberattack",
        "severity": 0.9,
        "unit_impacts": {"production": 20, "finance": 30, "customer_service": 20},
        "delay_hours": 16,
        "cost_factor": 0.26,
    },
    "pandemic_wave": {
        "name": "Pandemic Workforce Absence",
        "severity": 0.6,
        "unit_impacts": {"production": 28, "customer_service": 16},
        "delay_hours": 12,
        "cost_factor": 0.18,
    },
    "climate_flood": {
        "name": "Regional Climate Flood",
        "severity": 0.85,
        "unit_impacts": {"logistics": 24, "production": 16, "inventory": 20},
        "delay_hours": 20,
        "cost_factor": 0.28,
    },
}

MITIGATION_LIBRARY = {
    "alternate_suppliers": {
        "name": "Activate Alternate Suppliers",
        "reduction": 0.2,
        "targets": ["inventory", "production"],
    },
    "increase_inventory": {
        "name": "Increase Safety Inventory",
        "reduction": 0.16,
        "targets": ["inventory", "customer_service"],
    },
    "reroute_logistics": {
        "name": "Reroute Logistics",
        "reduction": 0.22,
        "targets": ["logistics", "inventory"],
    },
    "cost_buffering": {
        "name": "Cost Buffering",
        "reduction": 0.14,
        "targets": ["finance"],
    },
}


class CrisisEvent(BaseModel):
    event_id: str
    intensity: float = Field(default=1.0, ge=0.3, le=2.0)


class UnitLink(BaseModel):
    event_id: str
    unit: str
    weight: float = Field(default=1.0, ge=0.3, le=2.0)


class MitigationAction(BaseModel):
    action_id: str
    strength: float = Field(default=1.0, ge=0.4, le=2.0)


class ScenarioRequest(BaseModel):
    scenario_name: str = "Untitled Scenario"
    events: List[CrisisEvent]
    links: List[UnitLink]
    mitigations: List[MitigationAction] = Field(default_factory=list)


@dataclass
class SimulationResult:
    unit_impacts: Dict[str, float]
    service_degradation_pct: float
    risk_score: float
    estimated_financial_loss: float
    recovery_time_days: float
    total_delay_hours: float
    recommendations: List[str]


def _init_impact() -> Dict[str, float]:
    return {unit: 0.0 for unit in UNIT_ORDER}


def _apply_event_impacts(scenario: ScenarioRequest) -> tuple[Dict[str, float], float, float]:
    impacts = _init_impact()
    delay_hours = 0.0
    cost_ratio = 0.0

    for event in scenario.events:
        template = EVENT_LIBRARY.get(event.event_id)
        if not template:
            continue
        for unit, base in template["unit_impacts"].items():
            impacts[unit] += base * event.intensity

        delay_hours += template["delay_hours"] * event.intensity
        cost_ratio += template["cost_factor"] * event.intensity

    for link in scenario.links:
        template = EVENT_LIBRARY.get(link.event_id)
        if not template or link.unit not in impacts:
            continue
        link_push = sum(template["unit_impacts"].values()) * 0.12 * link.weight
        impacts[link.unit] += link_push

    return impacts, delay_hours, cost_ratio


def _propagate_dependencies(impacts: Dict[str, float], rounds: int = 3) -> Dict[str, float]:
    propagated = impacts.copy()
    for _ in range(rounds):
        delta = {unit: 0.0 for unit in UNIT_ORDER}
        for source, dependents in DEFAULT_DEPENDENCIES.items():
            spread = propagated[source] * 0.18
            for target in dependents:
                delta[target] += spread
        for unit in UNIT_ORDER:
            propagated[unit] += delta[unit]
    return propagated


def _apply_mitigations(impacts: Dict[str, float], mitigations: List[MitigationAction]) -> Dict[str, float]:
    adjusted = impacts.copy()
    for mitigation in mitigations:
        template = MITIGATION_LIBRARY.get(mitigation.action_id)
        if not template:
            continue
        reduction = template["reduction"] * mitigation.strength
        for unit in template["targets"]:
            adjusted[unit] *= max(0.2, 1 - reduction)
    return adjusted


def _clamp_unit_impacts(impacts: Dict[str, float]) -> Dict[str, float]:
    return {unit: round(min(100, value), 2) for unit, value in impacts.items()}


def _recommendations(impacts: Dict[str, float]) -> List[str]:
    tips = []
    if impacts["logistics"] > 45:
        tips.append("Prioritize logistics rerouting and secure alternate carriers.")
    if impacts["inventory"] > 40:
        tips.append("Raise safety stock thresholds for critical SKUs.")
    if impacts["production"] > 38:
        tips.append("Shift production to backup lines and cross-train operators.")
    if impacts["finance"] > 35:
        tips.append("Trigger financial contingency reserve and revise pricing windows.")
    if not tips:
        tips.append("Maintain monitoring cadence and prepare lightweight contingency plans.")
    return tips


def run_simulation(scenario: ScenarioRequest) -> SimulationResult:
    baseline_impacts, delay_hours, cost_ratio = _apply_event_impacts(scenario)
    cascaded = _propagate_dependencies(baseline_impacts)
    mitigated = _apply_mitigations(cascaded, scenario.mitigations)
    final_impacts = _clamp_unit_impacts(mitigated)

    avg_impact = sum(final_impacts.values()) / len(final_impacts)
    service_degradation = min(100.0, avg_impact * 0.82)
    risk_score = min(100.0, avg_impact * 1.15 + delay_hours * 0.38)
    estimated_loss = (avg_impact / 100) * 4_800_000 + cost_ratio * 1_400_000
    recovery_time_days = max(1.0, delay_hours / 8 + avg_impact / 18)

    return SimulationResult(
        unit_impacts=final_impacts,
        service_degradation_pct=round(service_degradation, 2),
        risk_score=round(risk_score, 2),
        estimated_financial_loss=round(estimated_loss, 2),
        recovery_time_days=round(recovery_time_days, 2),
        total_delay_hours=round(delay_hours, 2),
        recommendations=_recommendations(final_impacts),
    )


@app.get("/")
def root() -> dict:
    return {
        "name": "No-Code AI Crisis Simulation API",
        "status": "ok",
        "endpoints": ["/health", "/templates", "/simulate", "/docs"],
    }


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/templates")
def templates() -> dict:
    return {
        "events": EVENT_LIBRARY,
        "mitigations": MITIGATION_LIBRARY,
        "units": UNIT_ORDER,
    }


@app.post("/simulate")
def simulate(payload: ScenarioRequest) -> dict:
    after = run_simulation(payload)
    before_payload = payload.model_copy(update={"mitigations": []})
    before = run_simulation(before_payload)

    improvement = {
        "risk_score_reduction": round(before.risk_score - after.risk_score, 2),
        "financial_loss_reduction": round(before.estimated_financial_loss - after.estimated_financial_loss, 2),
        "recovery_time_reduction_days": round(before.recovery_time_days - after.recovery_time_days, 2),
    }

    return {
        "scenario_name": payload.scenario_name,
        "before": before.__dict__,
        "after": after.__dict__,
        "improvement": improvement,
    }
