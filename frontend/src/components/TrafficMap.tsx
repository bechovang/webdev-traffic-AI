import React from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from 'react-leaflet';
import type { LiveTrafficMetric } from '../types';
import { Navigation, Clock, Gauge, ArrowRight } from 'lucide-react';

interface TrafficMapProps {
  metrics: LiveTrafficMetric[];
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
}

// Map LOS to visual hex color
export function getLosColor(los: string): string {
  switch (los) {
    case 'A':
      return '#059669'; // Emerald-600 (Thông thoáng)
    case 'B':
      return '#10b981'; // Emerald-500
    case 'C':
      return '#f59e0b'; // Amber-500 (Bình thường)
    case 'D':
      return '#f97316'; // Orange-500 (Chậm)
    case 'E':
      return '#e11d48'; // Rose-600 (Kẹt xe)
    case 'F':
      return '#be123c'; // Rose-700 (Tắc nghẽn nặng)
    default:
      return '#64748b'; // Slate-500
  }
}

export const TrafficMap: React.FC<TrafficMapProps> = ({
  metrics,
  selectedRouteId,
  onSelectRoute,
}) => {
  // Center of Thu Duc City
  const mapCenter: [number, number] = [10.825, 106.758];

  return (
    <div className="relative w-full h-[460px] lg:h-[540px] rounded-2xl overflow-hidden border border-slate-200/90 shadow-xs bg-slate-100">
      <MapContainer
        center={mapCenter}
        zoom={12}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        {/* CartoDB Positron: crisp, clean civic-tech light map tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        {metrics.map((m) => {
          const isSelected = selectedRouteId === m.route_id;
          const color = getLosColor(m.los);
          const originCoords: [number, number] = [m.origin_lat, m.origin_lng];
          const destCoords: [number, number] = [m.dest_lat, m.dest_lng];

          return (
            <React.Fragment key={m.route_id}>
              {/* Corridor Route Line */}
              <Polyline
                positions={[originCoords, destCoords]}
                pathOptions={{
                  color: isSelected ? '#1d4ed8' : color,
                  weight: isSelected ? 8 : 6,
                  opacity: isSelected ? 1 : 0.85,
                  dashArray: isSelected ? undefined : undefined,
                }}
                eventHandlers={{
                  click: () => onSelectRoute(m.route_id),
                }}
              >
                <Popup className="custom-popup">
                  <div className="p-1 min-w-[220px]">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="font-bold text-sm text-slate-900">{m.route_name}</span>
                      <span
                        className="px-2 py-0.5 rounded text-[11px] font-bold text-white"
                        style={{ backgroundColor: color }}
                      >
                        LOS {m.los}
                      </span>
                    </div>

                    <div className="mt-2 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-slate-500">
                          <Gauge className="w-3.5 h-3.5" /> Vận tốc hiện tại:
                        </span>
                        <span className="font-bold text-slate-900">{m.current_speed} km/h</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3.5 h-3.5" /> Thời gian di chuyển:
                        </span>
                        <span className="font-semibold text-slate-800">
                          {Math.round(m.travel_time_seconds / 60)} phút
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Mức độ ùn tắc:</span>
                        <span className="font-semibold text-slate-800">{m.congestion_level}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectRoute(m.route_id)}
                      className="mt-3 w-full py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>Xem Dự báo AI</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Popup>
              </Polyline>

              {/* Origin Marker */}
              <CircleMarker
                center={originCoords}
                radius={isSelected ? 6 : 4}
                pathOptions={{
                  fillColor: '#2563eb',
                  fillOpacity: 0.9,
                  color: '#ffffff',
                  weight: 2,
                }}
              />

              {/* Destination Marker */}
              <CircleMarker
                center={destCoords}
                radius={isSelected ? 6 : 4}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: 0.9,
                  color: '#ffffff',
                  weight: 2,
                }}
              />
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Floating Legend Overlay */}
      <div className="absolute bottom-4 right-4 z-10 bg-white/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-200/90 shadow-md text-xs">
        <div className="font-bold text-slate-800 mb-1.5 flex items-center gap-1">
          <Navigation className="w-3 h-3 text-blue-600" />
          <span>Cấp độ Thông thoáng (LOS)</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-medium text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
            <span>A: Rất thông thoáng</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>B: Thông thoáng</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span>C: Bình thường</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
            <span>D: Bắt đầu chậm</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" />
            <span>E: Kẹt xe</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-800 inline-block" />
            <span>F: Ùn tắc nghiêm trọng</span>
          </div>
        </div>
      </div>
    </div>
  );
};
