import { useEffect, useState, useRef } from 'react';
import { Header } from './components/Header';
import { TrafficMap } from './components/TrafficMap';
import { FloatingHud } from './components/FloatingHud';
import {
  getLatestMetrics,
  getSystemSummary,
  getRouteHistory,
  triggerPollNow,
  setSimulationScenario,
  reverseGeocode,
} from './services/api';
import type {
  DynamicRoutePlanResult,
  LiveTrafficMetric,
  PlaceSuggestion,
  SystemSummary,
} from './types';

export function App() {
  const [metrics, setMetrics] = useState<LiveTrafficMetric[]>([]);
  const [summary, setSummary] = useState<SystemSummary | null>(null);
  const [historyData, setHistoryData] = useState<LiveTrafficMetric[]>([]);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [currentScenario, setCurrentScenario] = useState<string>('normal');

  // Dynamic Google Maps Route Planning States
  const [activeRoutePlan, setActiveRoutePlan] = useState<DynamicRoutePlanResult | null>(null);
  const [isMapPicking, setIsMapPicking] = useState<'origin' | 'dest' | null>(null);
  const [pickedPoint, setPickedPoint] = useState<{ mode: 'origin' | 'dest'; place: PlaceSuggestion } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // Fetch initial telemetry
  useEffect(() => {
    const initData = async () => {
      try {
        const [m, s] = await Promise.all([getLatestMetrics(), getSystemSummary()]);
        setMetrics(m);
        setSummary(s);
        if (m.length > 0) {
          getRouteHistory(m[0].route_id, 30).then(setHistoryData).catch(() => {});
        }
      } catch (err) {
        console.error('Initial data fetch error:', err);
      }
    };
    initData();
  }, []);

  // WebSocket Connection for background traffic & scenario changes
  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connectWs = () => {
      const host = window.location.hostname || '127.0.0.1';
      const wsUrl = `ws://${host}:8000/ws/traffic`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.metrics) {
            setMetrics(data.metrics);
          }
          if (data.summary) {
            setSummary(data.summary);
          }
          if (data.scenario) {
            setCurrentScenario(data.scenario);
          }
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      ws.onclose = () => {
        setIsWsConnected(false);
        reconnectTimer = setTimeout(connectWs, 3000);
      };

      ws.onerror = () => {
        setIsWsConnected(false);
        ws.close();
      };
    };

    connectWs();

    return () => {
      clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Handler: Poll Now
  const handlePollNow = async () => {
    setIsPolling(true);
    try {
      await triggerPollNow();
    } catch (err) {
      console.error('Trigger poll error:', err);
    } finally {
      setTimeout(() => setIsPolling(false), 600);
    }
  };

  // Handler: Change Scenario
  const handleSelectScenario = async (scenario: string) => {
    setCurrentScenario(scenario);
    try {
      await setSimulationScenario(scenario);
    } catch (err) {
      console.error('Scenario change error:', err);
    }
  };

  // Handler: Click anywhere on map when picking origin/destination
  const handleMapClickPick = async (lat: number, lng: number) => {
    if (!isMapPicking) return;
    try {
      const geo = await reverseGeocode(lat, lng);
      setPickedPoint({
        mode: isMapPicking,
        place: {
          name: geo.address,
          address: geo.address,
          lat,
          lng,
        },
      });
    } catch {
      setPickedPoint({
        mode: isMapPicking,
        place: {
          name: `Tọa độ (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          address: `Tọa độ (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          lat,
          lng,
        },
      });
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-900 select-none">
      {/* Central Full-Bleed Map Viewport (Interactive Google Maps Navigation) */}
      <TrafficMap
        activeRoutePlan={activeRoutePlan}
        isMapPicking={isMapPicking}
        onMapClickPick={handleMapClickPick}
        onCancelMapPick={() => setIsMapPicking(null)}
      />

      {/* Floating Header Island (Top) */}
      <Header
        summary={summary}
        isWsConnected={isWsConnected}
        onPollNow={handlePollNow}
        isPolling={isPolling}
        currentScenario={currentScenario}
        onSelectScenario={handleSelectScenario}
      />

      {/* Floating Google Maps Navigation & Planning HUD (Left) */}
      <FloatingHud
        metrics={metrics}
        summary={summary}
        historyData={historyData}
        currentScenario={currentScenario}
        onSelectScenario={handleSelectScenario}
        isScenarioLoading={isPolling}
        onRouteCalculated={setActiveRoutePlan}
        activeRoutePlan={activeRoutePlan}
        isMapPicking={isMapPicking}
        onSetMapPicking={setIsMapPicking}
        pickedPoint={pickedPoint}
      />
    </div>
  );
}

export default App;
