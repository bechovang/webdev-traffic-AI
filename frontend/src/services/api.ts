import type { LiveTrafficMetric, RouteInfo, RoutePrediction, SystemSummary } from '../types';

const API_BASE = 'http://127.0.0.1:8000';

export async function getRoutes(): Promise<RouteInfo[]> {
  const res = await fetch(`${API_BASE}/api/routes`);
  if (!res.ok) throw new Error('Failed to fetch routes');
  return res.json();
}

export async function getLatestMetrics(): Promise<LiveTrafficMetric[]> {
  const res = await fetch(`${API_BASE}/api/metrics/latest`);
  if (!res.ok) throw new Error('Failed to fetch latest metrics');
  return res.json();
}

export async function getSystemSummary(): Promise<SystemSummary> {
  const res = await fetch(`${API_BASE}/api/metrics/summary`);
  if (!res.ok) throw new Error('Failed to fetch system summary');
  return res.json();
}

export async function getRouteHistory(routeId: string, limit: number = 30): Promise<LiveTrafficMetric[]> {
  const res = await fetch(`${API_BASE}/api/metrics/history/${routeId}?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch history for ${routeId}`);
  return res.json();
}

export async function getRoutePrediction(routeId: string): Promise<RoutePrediction> {
  const res = await fetch(`${API_BASE}/api/predict/${routeId}`);
  if (!res.ok) throw new Error(`Failed to fetch prediction for ${routeId}`);
  return res.json();
}

export async function setSimulationScenario(scenario: string, affectedRoutes?: string[]): Promise<void> {
  const res = await fetch(`${API_BASE}/api/simulation/scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario, affected_routes: affectedRoutes }),
  });
  if (!res.ok) throw new Error('Failed to set scenario');
}

export async function triggerPollNow(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/simulation/poll-now`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to trigger poll');
}
