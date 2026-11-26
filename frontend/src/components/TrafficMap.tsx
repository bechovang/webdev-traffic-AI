import React, { useState } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import type { LiveTrafficMetric } from '../types';
import { getTrafficToken, tokens } from '../tokens';
import {
  Speedometer,
  Clock,
  Sparkle,
  ArrowRight,
  Crosshair,
  Compass,
  TrafficSignal,
  WarningCircle,
  Moon,
  Sun,
  Broadcast,
} from '@phosphor-icons/react';

interface TrafficMapProps {
  metrics: LiveTrafficMetric[];
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
}

// Controller component to smoothly pan/zoom when a route is selected
function MapPanController({
  selectedMetric,
}: {
  selectedMetric: LiveTrafficMetric | undefined;
}) {
  const map = useMap();
  React.useEffect(() => {
    if (selectedMetric) {
      const midLat = (selectedMetric.origin_lat + selectedMetric.dest_lat) / 2;
      const midLng = (selectedMetric.origin_lng + selectedMetric.dest_lng) / 2;
      map.flyTo([midLat, midLng], 13.5, { duration: 1.2 });
    }
  }, [selectedMetric, map]);
  return null;
}

export const TrafficMap: React.FC<TrafficMapProps> = ({
  metrics,
  selectedRouteId,
  onSelectRoute,
}) => {
  // Center of Thu Duc City
  const mapCenter: [number, number] = [10.825, 106.758];
  const selectedMetric = metrics.find((m) => m.route_id === selectedRouteId);

  const tomtomApiKey = import.meta.env.VITE_TOMTOM_API_KEY || '';

  // Map display controls
  const [showTomTomFlow, setShowTomTomFlow] = useState<boolean>(Boolean(tomtomApiKey));
  const [showIncidents, setShowIncidents] = useState<boolean>(false);
  const [mapTheme, setMapTheme] = useState<'light' | 'dark'>('light');

  // Base map URL: Priority to TomTom official tiles (no watermark), fallback to OpenStreetMap
  const baseMapUrl =
    mapTheme === 'dark'
      ? tomtomApiKey
        ? `https://api.tomtom.com/map/1/tile/basic/night/{z}/{x}/{y}.png?key=${tomtomApiKey}`
        : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
      : tomtomApiKey
      ? `https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${tomtomApiKey}`
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const baseMapAttribution = tomtomApiKey
    ? '&copy; <a href="https://www.tomtom.com">TomTom Maps</a> contributors'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return (
    <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
      <MapContainer
        center={mapCenter}
        zoom={12.5}
        scrollWheelZoom={true}
        zoomControl={false}
        className="w-full h-full"
      >
        {/* Base Map Layer (Clean, No Watermark) */}
        <TileLayer
          key={`${mapTheme}-${baseMapUrl}`}
          attribution={baseMapAttribution}
          url={baseMapUrl}
          maxZoom={19}
        />

        {/* TomTom Real-Time Traffic Flow Layer */}
        {showTomTomFlow && tomtomApiKey && (
          <TileLayer
            key="tomtom-flow"
            attribution='&copy; <a href="https://www.tomtom.com">TomTom Traffic</a>'
            url={`https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png?key=${tomtomApiKey}`}
            opacity={0.82}
            zIndex={10}
            maxZoom={19}
          />
        )}

        {/* TomTom Real-Time Traffic Incidents Layer */}
        {showIncidents && tomtomApiKey && (
          <TileLayer
            key="tomtom-incidents"
            attribution='&copy; <a href="https://www.tomtom.com">TomTom Incidents</a>'
            url={`https://api.tomtom.com/traffic/map/4/tile/incidents/s0/{z}/{x}/{y}.png?key=${tomtomApiKey}`}
            opacity={0.9}
            zIndex={11}
            maxZoom={19}
          />
        )}

        <MapPanController selectedMetric={selectedMetric} />

        {/* 10 Monitored Corridors Polyline Layer */}
        {metrics.map((m) => {
          const isSelected = selectedRouteId === m.route_id;
          const token = getTrafficToken(m.los);
          const originCoords: [number, number] = [m.origin_lat, m.origin_lng];
          const destCoords: [number, number] = [m.dest_lat, m.dest_lng];

          return (
            <React.Fragment key={m.route_id}>
              {/* Outer halo when selected */}
              {isSelected && (
                <Polyline
                  positions={[originCoords, destCoords]}
                  pathOptions={{
                    color: tokens.colors.brand.primary,
                    weight: 12,
                    opacity: 0.45,
                    lineCap: 'round',
                  }}
                />
              )}

              {/* Main Corridor Polyline */}
              <Polyline
                positions={[originCoords, destCoords]}
                pathOptions={{
                  color: token.hex,
                  weight: isSelected ? 8 : 6,
                  opacity: isSelected ? 1 : 0.88,
                  lineCap: 'round',
                }}
                eventHandlers={{
                  click: () => onSelectRoute(m.route_id),
                }}
              >
                <Popup className="custom-popup">
                  <div className="p-1 min-w-[240px]">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="font-extrabold text-sm text-slate-900">{m.route_name}</span>
                      <span
                        className="px-2 py-0.5 rounded-md text-[11px] font-black text-white"
                        style={{ backgroundColor: token.hex }}
                      >
                        LOS {m.los}
                      </span>
                    </div>

                    <div className="mt-2.5 space-y-2 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                          <Speedometer size={14} weight="bold" className="text-blue-600" />
                          Vận tốc thực tế:
                        </span>
                        <span className="font-extrabold text-slate-900">{m.current_speed} km/h</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                          <Clock size={14} weight="bold" className="text-slate-400" />
                          Thời gian đi:
                        </span>
                        <span className="font-bold text-slate-800">
                          {Math.round(m.travel_time_seconds / 60)} phút
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Tình trạng:</span>
                        <span
                          className="font-bold text-xs px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: token.bgSubtle, color: token.text }}
                        >
                          {m.congestion_level}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectRoute(m.route_id)}
                      className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkle size={14} weight="bold" />
                      <span>Xem Dự báo AI (+15, +30, +45p)</span>
                      <ArrowRight size={13} weight="bold" />
                    </button>
                  </div>
                </Popup>
              </Polyline>

              {/* Origin Point */}
              <CircleMarker
                center={originCoords}
                radius={isSelected ? 6 : 4}
                pathOptions={{
                  fillColor: tokens.colors.brand.primary,
                  fillOpacity: 1,
                  color: '#ffffff',
                  weight: 2,
                }}
              />

              {/* Destination Point */}
              <CircleMarker
                center={destCoords}
                radius={isSelected ? 6 : 4}
                pathOptions={{
                  fillColor: token.hex,
                  fillOpacity: 1,
                  color: '#ffffff',
                  weight: 2,
                }}
              />
            </React.Fragment>
          );
        })}

        {/* Floating Controls Inside Map Container */}
        <div className="leaflet-bottom leaflet-right" style={{ pointerEvents: 'auto', margin: '20px' }}>
          <div className="flex flex-col items-end gap-2.5">
            {/* Quick Map Action Toolbar */}
            <div className="hud-glass p-1.5 rounded-2xl shadow-lg border border-white/80 flex items-center gap-1.5">
              {/* TomTom Traffic Flow Toggle */}
              {tomtomApiKey && (
                <button
                  onClick={() => setShowTomTomFlow(!showTomTomFlow)}
                  className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    showTomTomFlow
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  title={showTomTomFlow ? 'Tắt lớp luồng TomTom' : 'Bật lớp luồng TomTom Live Flow'}
                >
                  <TrafficSignal size={16} weight={showTomTomFlow ? 'fill' : 'bold'} />
                  <span className="hidden sm:inline">TomTom Flow</span>
                  {showTomTomFlow && <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />}
                </button>
              )}

              {/* TomTom Incidents Toggle */}
              {tomtomApiKey && (
                <button
                  onClick={() => setShowIncidents(!showIncidents)}
                  className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    showIncidents
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  title={showIncidents ? 'Tắt sự cố TomTom' : 'Bật sự cố giao thông TomTom'}
                >
                  <WarningCircle size={16} weight={showIncidents ? 'fill' : 'bold'} />
                  <span className="hidden sm:inline">Sự cố</span>
                </button>
              )}

              {/* Theme Switcher: Light / Dark Mode */}
              <button
                onClick={() => setMapTheme(mapTheme === 'light' ? 'dark' : 'light')}
                className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer"
                title={mapTheme === 'light' ? 'Chuyển sang chế độ Đêm (Dark TOC)' : 'Chuyển sang chế độ Sáng (Light)'}
              >
                {mapTheme === 'light' ? <Moon size={16} weight="bold" /> : <Sun size={16} weight="bold" />}
              </button>

              <div className="w-[1px] h-4 bg-slate-200" />

              {/* Recenter Button */}
              <RecenterMapButton center={mapCenter} />
            </div>

            {/* Compact Floating Legend Capsule */}
            <div className="hud-glass px-3.5 py-2.5 rounded-2xl shadow-lg border border-white/80 text-xs">
              <div className="flex items-center justify-between gap-3 font-bold text-slate-800 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Compass size={14} weight="bold" className="text-blue-600" />
                  <span>Cấp độ Thông thoáng (LOS)</span>
                </div>
                {tomtomApiKey && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-full">
                    <Broadcast size={11} weight="fill" className="animate-pulse" />
                    TomTom Live
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: tokens.colors.traffic.losA.hex }} />
                  <span>A (Thông thoáng)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: tokens.colors.traffic.losB.hex }} />
                  <span>B (Khá thoáng)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: tokens.colors.traffic.losC.hex }} />
                  <span>C (Bình thường)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: tokens.colors.traffic.losD.hex }} />
                  <span>D (Chậm)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: tokens.colors.traffic.losE.hex }} />
                  <span>E (Kẹt xe)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: tokens.colors.traffic.losF.hex }} />
                  <span>F (Tắc nghẽn)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MapContainer>
    </div>
  );
};

// Recenter Map Helper
function RecenterMapButton({ center }: { center: [number, number] }) {
  const map = useMap();
  return (
    <button
      onClick={() => map.flyTo(center, 12.5, { duration: 1 })}
      className="p-1.5 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-all cursor-pointer active:scale-95"
      title="Căn giữa TP. Thủ Đức"
    >
      <Crosshair size={16} weight="bold" />
    </button>
  );
}
