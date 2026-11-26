import React from 'react';
import { Sliders, Sun, Sunset, CloudRain, AlertOctagon, RotateCcw } from 'lucide-react';

interface SimulationControlsProps {
  currentScenario: string;
  onSelectScenario: (scenario: string) => void;
  isLoading: boolean;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  currentScenario,
  onSelectScenario,
  isLoading,
}) => {
  const scenarios = [
    {
      id: 'normal',
      name: 'Bình thường',
      desc: 'Lưu thông thông suốt ngoài giờ',
      icon: RotateCcw,
      badgeColor: 'hover:border-emerald-300',
    },
    {
      id: 'morning_rush',
      name: 'Cao điểm Sáng',
      desc: '7h - 9h: Ùn ứ các tuyến vào trung tâm',
      icon: Sun,
      badgeColor: 'hover:border-amber-300',
    },
    {
      id: 'evening_rush',
      name: 'Cao điểm Chiều',
      desc: '17h - 19h: Kẹt xe các cửa ngõ & cảng Cát Lái',
      icon: Sunset,
      badgeColor: 'hover:border-orange-300',
    },
    {
      id: 'accident',
      name: 'Sự cố Va chạm',
      desc: 'Tắc nghẽn tại Phạm Văn Đồng & Võ Nguyên Giáp',
      icon: AlertOctagon,
      badgeColor: 'hover:border-rose-300',
    },
    {
      id: 'rain',
      name: 'Mưa lớn / Ngập',
      desc: 'Tốc độ đô thị giảm đồng loạt 40%',
      icon: CloudRain,
      badgeColor: 'hover:border-blue-300',
    },
  ];

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Bảng Điều Khiển Mô Phỏng (Demo Studio)</h3>
            <p className="text-xs text-slate-500 font-medium">
              Chuyển đổi các kịch bản thực tế để kiểm tra khả năng phản ứng và dự báo của AI
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {scenarios.map((sc) => {
          const Icon = sc.icon;
          const isActive = currentScenario === sc.id;
          return (
            <button
              key={sc.id}
              onClick={() => onSelectScenario(sc.id)}
              disabled={isLoading}
              className={`p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between ${sc.badgeColor} ${
                isActive
                  ? 'border-blue-500 bg-blue-50/50 shadow-xs ring-1 ring-blue-500/20'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-slate-900">{sc.name}</span>
                <Icon
                  className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
                />
              </div>
              <p className="text-[11px] text-slate-500 leading-tight font-medium">{sc.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
