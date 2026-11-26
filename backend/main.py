"""FastAPI Application Main Entry Point with WebSocket and REST endpoints."""

import asyncio
import json
from contextlib import asynccontextmanager
from typing import List, Set

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from backend.core.models import (
    LiveTrafficMetric,
    RouteInfo,
    RoutePrediction,
    SimulationScenarioRequest,
    SystemSummary,
)
from backend.services.ai_engine import ai_engine
from backend.services.traffic_service import traffic_service


class ConnectionManager:
    """Manages active WebSocket connections to broadcast live traffic updates."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self.active_connections.discard(websocket)

    async def broadcast_json(self, data: dict) -> None:
        dead_sockets = []
        for connection in list(self.active_connections):
            try:
                await connection.send_text(json.dumps(data, ensure_ascii=False))
            except Exception:
                dead_sockets.append(connection)
        for dead in dead_sockets:
            self.disconnect(dead)


manager = ConnectionManager()


async def background_telemetry_broadcaster():
    """Background task pushing live telemetry to WebSocket subscribers every 8 seconds."""
    while True:
        try:
            await asyncio.sleep(8)
            if manager.active_connections:
                traffic_service.generate_simulated_snapshot()
                metrics = [m.model_dump() for m in traffic_service.get_latest_metrics()]
                summary = traffic_service.get_system_summary().model_dump()
                await manager.broadcast_json({
                    "event": "telemetry_update",
                    "metrics": metrics,
                    "summary": summary,
                })
        except asyncio.CancelledError:
            break
        except Exception:
            await asyncio.sleep(2)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(background_telemetry_broadcaster())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="HCM City Traffic Intelligence API",
    description="Real-time traffic telemetry, GIS corridor monitoring and AI predictions for Thu Duc, Ho Chi Minh City.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "service": "HCM Traffic AI Backend",
        "status": "online",
        "docs": "/docs",
        "monitored_city": "TP. Thủ Đức, TP. Hồ Chí Minh",
    }


@app.get("/api/routes", response_model=List[RouteInfo])
def get_routes():
    """Returns metadata for all 10 monitored corridors."""
    return traffic_service.get_routes()


@app.get("/api/metrics/latest", response_model=List[LiveTrafficMetric])
def get_latest_metrics():
    """Returns current live traffic metrics for all corridors."""
    return traffic_service.get_latest_metrics()


@app.get("/api/metrics/summary", response_model=SystemSummary)
def get_system_summary():
    """Returns overall city traffic KPI summary."""
    return traffic_service.get_system_summary()


@app.get("/api/metrics/history/{route_id}", response_model=List[LiveTrafficMetric])
def get_route_history(route_id: str, limit: int = 40):
    """Returns recent time-series data points for a specific route."""
    if route_id not in traffic_service.routes_dict:
        raise HTTPException(status_code=404, detail=f"Route {route_id} not found")
    return traffic_service.get_route_history(route_id, limit=limit)


@app.get("/api/predict/{route_id}", response_model=RoutePrediction)
def predict_route(route_id: str):
    """Generates AI speed & congestion forecasts for +15, +30, and +45 minutes."""
    if route_id not in traffic_service.live_telemetry:
        raise HTTPException(status_code=404, detail=f"Route {route_id} not found")

    metric = traffic_service.live_telemetry[route_id]
    history = traffic_service.get_route_history(route_id)
    return ai_engine.predict_route(metric, history)


@app.get("/api/predict/all", response_model=List[RoutePrediction])
def predict_all_routes():
    """Generates AI predictions for all 10 monitored corridors."""
    predictions = []
    for route_id, metric in traffic_service.live_telemetry.items():
        history = traffic_service.get_route_history(route_id)
        pred = ai_engine.predict_route(metric, history)
        predictions.append(pred)
    return predictions


@app.post("/api/simulation/scenario")
async def trigger_simulation_scenario(req: SimulationScenarioRequest):
    """Applies a simulation scenario (morning_rush, evening_rush, accident, rain, normal)."""
    traffic_service.set_scenario(req.scenario, req.affected_routes)
    metrics = [m.model_dump() for m in traffic_service.get_latest_metrics()]
    summary = traffic_service.get_system_summary().model_dump()
    await manager.broadcast_json({
        "event": "scenario_changed",
        "scenario": req.scenario,
        "metrics": metrics,
        "summary": summary,
    })
    return {"status": "ok", "scenario": req.scenario, "summary": summary}


@app.post("/api/simulation/poll-now")
async def trigger_poll_now():
    """Forces an immediate telemetry refresh and broadcasts to connected clients."""
    traffic_service.generate_simulated_snapshot()
    metrics = [m.model_dump() for m in traffic_service.get_latest_metrics()]
    summary = traffic_service.get_system_summary().model_dump()
    await manager.broadcast_json({
        "event": "telemetry_update",
        "metrics": metrics,
        "summary": summary,
    })
    return {"status": "ok", "refreshed_routes": len(metrics)}


@app.websocket("/ws/traffic")
async def websocket_traffic_endpoint(websocket: WebSocket):
    """WebSocket connection streaming real-time traffic updates."""
    await manager.connect(websocket)
    try:
        metrics = [m.model_dump() for m in traffic_service.get_latest_metrics()]
        summary = traffic_service.get_system_summary().model_dump()
        await websocket.send_text(json.dumps({
            "event": "initial_state",
            "metrics": metrics,
            "summary": summary,
        }, ensure_ascii=False))

        while True:
            data = await websocket.receive_text()
            try:
                cmd = json.loads(data)
                if cmd.get("action") == "poll_now":
                    traffic_service.generate_simulated_snapshot()
                    await manager.broadcast_json({
                        "event": "telemetry_update",
                        "metrics": [m.model_dump() for m in traffic_service.get_latest_metrics()],
                        "summary": traffic_service.get_system_summary().model_dump(),
                    })
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
