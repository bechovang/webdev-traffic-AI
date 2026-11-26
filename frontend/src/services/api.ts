import type {
  DynamicRoutePlanRequest,
  DynamicRoutePlanResult,
  LiveTrafficMetric,
  PlaceSuggestion,
  RouteInfo,
  RoutePrediction,
  SystemSummary,
} from '../types';

const API_BASE =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'http://127.0.0.1:8000';

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

export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  if (!query || query.trim().length < 2) return [];
  try {
    const res = await fetch(`${API_BASE}/api/places/search?query=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<{ address: string; lat: number; lng: number }> {
  try {
    const res = await fetch(`${API_BASE}/api/places/reverse?lat=${lat}&lng=${lng}`);
    if (!res.ok) return { address: `Tọa độ (${lat.toFixed(4)}, ${lng.toFixed(4)})`, lat, lng };
    return res.json();
  } catch {
    return { address: `Tọa độ (${lat.toFixed(4)}, ${lng.toFixed(4)})`, lat, lng };
  }
}

export async function planDynamicRoute(req: DynamicRoutePlanRequest): Promise<DynamicRoutePlanResult> {
  const res = await fetch(`${API_BASE}/api/routes/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Không thể tìm đường');
  }
  return res.json();
}

