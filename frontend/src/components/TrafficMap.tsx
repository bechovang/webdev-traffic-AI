import React from 'react';
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

// Recenter Map Helper
function RecenterButton({ center }: { center: [number, number] }) {
  const map = useMap();
  return (
    <button
      onClick={() => map.flyTo(center, 12.5, { duration: 1 })}
      className="hud-glass-solid p-2.5 rounded-xl text-slate-700 hover:text-blue-600 shadow-md cursor-pointer transition-all active:scale-95"
      title="Căn giữa TP. Thủ Đức"
    >
      <Crosshair size={20} weight="bold" />
    </button>
  );
}

export const TrafficMap: React.FC<TrafficMapProps> = ({
  metrics,
  selectedRouteId,
  onSelectRoute,
}) => {
  // Center of Thu Duc City
  const mapCenter: [number, number] = [10.825, 106.758];
  const selectedMetric = metrics.find((m) => m.route_id === selectedRouteId);

  return (
    <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
      <MapContainer
        center={mapCenter}
        zoom={12.5}
        scrollWheelZoom={true}
        zoomControl={false}
        className="w-full h-full"
      >
        {/* CartoDB Voyager: high contrast, ultra-clean civic-tech tile */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        <MapPanController selectedMetric={selectedMetric} />

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
                    opacity: 0.35,
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
            <RecenterButton center={mapCenter} />

            {/* Compact Floating Legend Capsule */}
            <div className="hud-glass px-3.5 py-2.5 rounded-2xl shadow-lg border border-white/80 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1.5">
                <Compass size={14} weight="bold" className="text-blue-600" />
                <span>Cấp độ Thông thoáng (LOS)</span>
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
