import { useEffect, useState, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { TrafficMap } from './components/TrafficMap';
import { FloatingHud } from './components/FloatingHud';
import {
  getLatestMetrics,
  getSystemSummary,
  getRouteHistory,
  getRoutePrediction,
  triggerPollNow,
  setSimulationScenario,
} from './services/api';
import type { LiveTrafficMetric, RoutePrediction, SystemSummary } from './types';

export function App() {
  const [metrics, setMetrics] = useState<LiveTrafficMetric[]>([]);
  const [summary, setSummary] = useState<SystemSummary | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>('route_001');
  const [prediction, setPrediction] = useState<RoutePrediction | null>(null);
  const [historyData, setHistoryData] = useState<LiveTrafficMetric[]>([]);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [currentScenario, setCurrentScenario] = useState<string>('normal');
  const [isLoadingPrediction, setIsLoadingPrediction] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);

  // Load prediction & history for selected route
  const loadRouteDetails = useCallback(async (routeId: string) => {
    setIsLoadingPrediction(true);
    try {
      const [pred, hist] = await Promise.all([
        getRoutePrediction(routeId),
        getRouteHistory(routeId, 30),
      ]);
      setPrediction(pred);
      setHistoryData(hist);
    } catch (err) {
      console.error('Error loading route details:', err);
    } finally {
      setIsLoadingPrediction(false);
    }
  }, []);

  // Fetch initial REST data
  useEffect(() => {
    const initData = async () => {
      try {
        const [m, s] = await Promise.all([getLatestMetrics(), getSystemSummary()]);
        setMetrics(m);
        setSummary(s);
        if (m.length > 0 && !selectedRouteId) {
          setSelectedRouteId(m[0].route_id);
        }
      } catch (err) {
        console.error('Initial data fetch error:', err);
      }
    };
    initData();
  }, [selectedRouteId]);

  // Load details whenever selected route changes
  useEffect(() => {
    if (selectedRouteId) {
      loadRouteDetails(selectedRouteId);
    }
  }, [selectedRouteId, loadRouteDetails]);

  // WebSocket Connection
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
          // Refresh details if currently selected route got updated
          if (selectedRouteId) {
            getRouteHistory(selectedRouteId, 30).then(setHistoryData).catch(() => {});
            getRoutePrediction(selectedRouteId).then(setPrediction).catch(() => {});
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
  }, [selectedRouteId]);

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
      if (selectedRouteId) {
        loadRouteDetails(selectedRouteId);
      }
    } catch (err) {
      console.error('Scenario change error:', err);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-900 select-none">
      {/* Central Full-Bleed Map Viewport */}
      <TrafficMap
        metrics={metrics}
        selectedRouteId={selectedRouteId}
        onSelectRoute={setSelectedRouteId}
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

      {/* Floating HUD Drawer (Left) */}
      <FloatingHud
        metrics={metrics}
        summary={summary}
        selectedRouteId={selectedRouteId}
        onSelectRoute={setSelectedRouteId}
        prediction={prediction}
        isLoadingPrediction={isLoadingPrediction}
        historyData={historyData}
        currentScenario={currentScenario}
        onSelectScenario={handleSelectScenario}
        isScenarioLoading={isPolling}
      />
    </div>
  );
}

export default App;
