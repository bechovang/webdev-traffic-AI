import React, { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import type { DynamicRoutePlanResult } from '../types';
import { getTrafficToken, tokens } from '../tokens';
import {
  Crosshair,
  Compass,
  TrafficSignal,
  WarningCircle,
  Moon,
  Sun,
  Broadcast,
  X,
  Clock,
  Speedometer,
} from '@phosphor-icons/react';

interface TrafficMapProps {
  activeRoutePlan: DynamicRoutePlanResult | null;
  isMapPicking: 'origin' | 'dest' | null;
  onMapClickPick: (lat: number, lng: number) => void;
  onCancelMapPick: () => void;
}

// Controller to smoothly fit bounds when a route is planned
function RouteFitBoundsController({
  activeRoutePlan,
}: {
  activeRoutePlan: DynamicRoutePlanResult | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (activeRoutePlan && activeRoutePlan.geometry.length > 0) {
      const bounds = L.latLngBounds(activeRoutePlan.geometry.map(([lat, lng]) => [lat, lng]));
      map.fitBounds(bounds, {
        padding: [100, 100],
        maxZoom: 15,
        animate: true,
        duration: 1.2,
      });
    }
  }, [activeRoutePlan, map]);
  return null;
}

// Map event listener for interactive map clicks
function MapEventsHandler({
  isMapPicking,
  onMapClickPick,
}: {
  isMapPicking: 'origin' | 'dest' | null;
  onMapClickPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (isMapPicking) {
        onMapClickPick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Recenter Map Helper Button
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

export const TrafficMap: React.FC<TrafficMapProps> = ({
  activeRoutePlan,
  isMapPicking,
  onMapClickPick,
  onCancelMapPick,
}) => {
  // Center of Thu Duc City
  const mapCenter: [number, number] = [10.825, 106.758];

  const tomtomApiKey = import.meta.env.VITE_TOMTOM_API_KEY || '';

  // Map display controls
  const [showTomTomFlow, setShowTomTomFlow] = useState<boolean>(Boolean(tomtomApiKey));
  const [showIncidents, setShowIncidents] = useState<boolean>(false);
  const [mapTheme, setMapTheme] = useState<'light' | 'dark'>('light');

  // Base map URL: Priority to TomTom official tiles (clean, zero watermark), fallback to OpenStreetMap
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

  const routeToken = activeRoutePlan ? getTrafficToken(activeRoutePlan.los) : null;

  return (
    <div
      className={`absolute inset-0 w-full h-full z-0 overflow-hidden ${
        isMapPicking ? 'cursor-crosshair' : ''
      }`}
    >
      {/* Map Picking Banner Mode Alert */}
      {isMapPicking && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto bg-slate-900/95 text-white px-5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-3 border border-emerald-500/40 animate-pulse">
          <Crosshair size={18} weight="bold" className="text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">
            {isMapPicking === 'origin'
              ? 'Nhấp vào bất kỳ điểm nào trên bản đồ để chọn Điểm xuất phát (A)'
              : 'Nhấp vào bất kỳ điểm nào trên bản đồ để chọn Điểm đến (B)'}
          </span>
          <button
            onClick={onCancelMapPick}
            className="ml-2 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            title="Hủy chọn trên bản đồ"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      )}

      <MapContainer
        center={mapCenter}
        zoom={12.5}
        scrollWheelZoom={true}
        zoomControl={false}
        className="w-full h-full"
      >
        {/* Base Map Layer */}
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

        {/* Map Listeners and Controllers */}
        <MapEventsHandler isMapPicking={isMapPicking} onMapClickPick={onMapClickPick} />
        <RouteFitBoundsController activeRoutePlan={activeRoutePlan} />

        {/* Dynamic Planned Route (Google Maps Navigation Style) */}
        {activeRoutePlan && activeRoutePlan.geometry.length > 0 && (
          <React.Fragment>
            {/* Outer Navigation Glow */}
            <Polyline
              positions={activeRoutePlan.geometry}
              pathOptions={{
                color: tokens.colors.brand.primary,
                weight: 12,
                opacity: 0.35,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />

            {/* Main Navigation Curved Road Polyline */}
            <Polyline
              positions={activeRoutePlan.geometry}
              pathOptions={{
                color: routeToken ? routeToken.hex : '#2563eb',
                weight: 7,
                opacity: 1,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            >
              <Popup className="custom-popup">
                <div className="p-1 min-w-[240px]">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-extrabold text-sm text-slate-900">Lộ trình được đề xuất</span>
                    {routeToken && (
                      <span
                        className="px-2 py-0.5 rounded-md text-[11px] font-black text-white"
                        style={{ backgroundColor: routeToken.hex }}
                      >
                        LOS {activeRoutePlan.los}
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                        <Clock size={14} weight="bold" className="text-blue-600" />
                        Thời gian ước tính:
                      </span>
                      <span className="font-extrabold text-slate-900">
                        {Math.round(activeRoutePlan.travel_time_minutes)} phút
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                        <Speedometer size={14} weight="bold" className="text-slate-400" />
                        Quãng đường:
                      </span>
                      <span className="font-bold text-slate-800">
                        {activeRoutePlan.distance_km} km
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Tình trạng:</span>
                      <span className="font-bold text-xs text-slate-800">
                        {activeRoutePlan.congestion_level}
                      </span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Polyline>

            {/* Origin Marker (Point A - Green Pin) */}
            <CircleMarker
              center={[activeRoutePlan.origin.lat, activeRoutePlan.origin.lng]}
              radius={8}
              pathOptions={{
                fillColor: '#10b981',
                fillOpacity: 1,
                color: '#ffffff',
                weight: 3,
              }}
            >
              <Popup>
                <div className="p-1 font-bold text-xs text-slate-800">
                  🟢 Điểm xuất phát: {activeRoutePlan.origin.name}
                </div>
              </Popup>
            </CircleMarker>

            {/* Destination Marker (Point B - Red Pin) */}
            <CircleMarker
              center={[activeRoutePlan.destination.lat, activeRoutePlan.destination.lng]}
              radius={8}
              pathOptions={{
                fillColor: '#ef4444',
                fillOpacity: 1,
                color: '#ffffff',
                weight: 3,
              }}
            >
              <Popup>
                <div className="p-1 font-bold text-xs text-slate-800">
                  📍 Điểm đến: {activeRoutePlan.destination.name}
                </div>
              </Popup>
            </CircleMarker>
          </React.Fragment>
        )}

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
