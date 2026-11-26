import { useEffect, useState, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { KpiCards } from './components/KpiCards';
import { TrafficMap } from './components/TrafficMap';
import { AiPredictionPanel } from './components/AiPredictionPanel';
import { SpeedTrendChart } from './components/SpeedTrendChart';
import { CorridorTable } from './components/CorridorTable';
import { SimulationControls } from './components/SimulationControls';
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

  const selectedRouteObj = metrics.find((m) => m.route_id === selectedRouteId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Sticky Header */}
      <Header
        isWsConnected={isWsConnected}
        onPollNow={handlePollNow}
        isPolling={isPolling}
        currentScenario={currentScenario}
      />

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-5 space-y-5">
        {/* KPI Summary Cards */}
        <KpiCards summary={summary} />

        {/* Top Grid: Interactive Map + AI Prediction Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Map Column (7 cols) */}
          <div className="lg:col-span-7 flex flex-col">
            <TrafficMap
              metrics={metrics}
              selectedRouteId={selectedRouteId}
              onSelectRoute={setSelectedRouteId}
            />
          </div>

          {/* AI Prediction Column (5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <AiPredictionPanel
              prediction={prediction}
              isLoading={isLoadingPrediction}
            />
          </div>
        </div>

        {/* Simulation Controls Studio Bar */}
        <SimulationControls
          currentScenario={currentScenario}
          onSelectScenario={handleSelectScenario}
          isLoading={isPolling}
        />

        {/* Bottom Grid: Speed Trend Chart + Live Detailed Corridor Table */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Historical Speed Trend Chart (5 cols) */}
          <div className="lg:col-span-5">
            <SpeedTrendChart
              historyData={historyData}
              selectedRouteName={selectedRouteObj?.route_name}
            />
          </div>

          {/* Corridor Detailed Table (7 cols) */}
          <div className="lg:col-span-7">
            <CorridorTable
              metrics={metrics}
              selectedRouteId={selectedRouteId}
              onSelectRoute={setSelectedRouteId}
            />
          </div>
        </div>
      </main>

      {/* Civic Tech Footer */}
      <footer className="border-t border-slate-200/80 bg-white/70 py-4 px-4 text-center text-xs text-slate-500 font-medium">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Hệ thống Trực quan hóa Giao thông Đô thị Thông minh — TP. Thủ Đức, TP. Hồ Chí Minh
          </span>
          <span className="text-slate-400">
            Nguồn dữ liệu: TomTom Traffic API &bull; WebDev Competition 2026
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
