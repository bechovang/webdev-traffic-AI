import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Circle,
  ArrowsDownUp,
  X,
  Crosshair,
  Sparkle,
  TrendUp,
  TrendDown,
  Minus,
  NavigationArrow,
  Clock,
  Speedometer,
  ShieldCheck,
  WarningOctagon,
  Buildings,
  GraduationCap,
  FirstAid,
  Storefront,
  Train,
  Tree,
  Trash,
  Compass,
} from '@phosphor-icons/react';
import type { DynamicRoutePlanResult, PlaceSuggestion } from '../types';
import { searchPlaces, planDynamicRoute, reverseGeocode } from '../services/api';
import { getTrafficToken, tokens } from '../tokens';

interface RoutePlannerProps {
  onRouteCalculated: (result: DynamicRoutePlanResult | null) => void;
  isMapPicking: 'origin' | 'dest' | null;
  onSetMapPicking: (mode: 'origin' | 'dest' | null) => void;
  pickedPoint: { mode: 'origin' | 'dest'; place: PlaceSuggestion } | null;
}

// Curated popular hubs in Thu Duc & HCMC for one-click route planning
const POPULAR_PRESETS: PlaceSuggestion[] = [
  {
    name: 'Thu Duc Central Market',
    address: 'Vo Van Ngan St, Linh Tay, Thu Duc City',
    lat: 10.8505,
    lng: 106.7580,
    category: 'shopping',
    distance_km: 1.2,
  },
  {
    name: 'Saigon Hi-Tech Park (SHTP)',
    address: 'Xa Lo Ha Noi, Tan Phu, Thu Duc City',
    lat: 10.8550,
    lng: 106.7850,
    category: 'tech',
    distance_km: 4.8,
  },
  {
    name: 'Vietnam National University (VNU)',
    address: 'VNU Urban Area, Linh Trung, Thu Duc City',
    lat: 10.8700,
    lng: 106.8030,
    category: 'education',
    distance_km: 6.2,
  },
  {
    name: 'GigaMall Pham Van Dong',
    address: '240-242 Pham Van Dong, Hiep Binh Chanh, Thu Duc City',
    lat: 10.8275,
    lng: 106.7210,
    category: 'shopping',
    distance_km: 3.5,
  },
  {
    name: 'New Mien Dong Bus Terminal',
    address: 'National Highway 1A, Long Binh, Thu Duc City',
    lat: 10.8780,
    lng: 106.8150,
    category: 'transit',
    distance_km: 7.9,
  },
  {
    name: 'Thu Duc City Hospital',
    address: '29 Phu Chau, Tam Phu, Thu Duc City',
    lat: 10.8610,
    lng: 106.7480,
    category: 'hospital',
    distance_km: 2.1,
  },
  {
    name: 'Suoi Tien Theme Park',
    address: '120 Ha Noi Highway, Tan Phu, Thu Duc City',
    lat: 10.8660,
    lng: 106.8030,
    category: 'park',
    distance_km: 5.5,
  },
  {
    name: 'Cat Lai Port Logistics Hub',
    address: 'Nguyen Thi Dinh St, Cat Lai, Thu Duc City',
    lat: 10.7600,
    lng: 106.7850,
    category: 'tech',
    distance_km: 8.6,
  },
];

type CategoryFilter = 'all' | 'transit' | 'education' | 'hospital' | 'shopping' | 'tech';

const RECENT_SEARCHES_KEY = 'hcm_traffic_recent_places';

export const RoutePlanner: React.FC<RoutePlannerProps> = ({
  onRouteCalculated,
  isMapPicking,
  onSetMapPicking,
  pickedPoint,
}) => {
  // Input values
  const [originText, setOriginText] = useState('Thu Duc Central Market');
  const [originPlace, setOriginPlace] = useState<PlaceSuggestion | null>(POPULAR_PRESETS[0]);

  const [destText, setDestText] = useState('Saigon Hi-Tech Park (SHTP)');
  const [destPlace, setDestPlace] = useState<PlaceSuggestion | null>(POPULAR_PRESETS[1]);

  // Autocomplete state
  const [activeField, setActiveField] = useState<'origin' | 'dest' | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [recentPlaces, setRecentPlaces] = useState<PlaceSuggestion[]>([]);

  // Route calculation state
  const [isCalculating, setIsCalculating] = useState(false);
  const [routeResult, setRouteResult] = useState<DynamicRoutePlanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const originInputRef = useRef<HTMLInputElement>(null);
  const destInputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentPlaces(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  // Save place to recent searches
  const saveToRecent = (place: PlaceSuggestion) => {
    try {
      const updated = [
        place,
        ...recentPlaces.filter((p) => p.name !== place.name && p.lat !== place.lat),
      ].slice(0, 5);
      setRecentPlaces(updated);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const removeRecentPlace = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    const updated = recentPlaces.filter((p) => p.name !== name);
    setRecentPlaces(updated);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const clearAllRecent = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentPlaces([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // ignore
    }
  };

  // Sync picked points from map clicks
  useEffect(() => {
    if (pickedPoint) {
      if (pickedPoint.mode === 'origin') {
        setOriginText(pickedPoint.place.name);
        setOriginPlace(pickedPoint.place);
        saveToRecent(pickedPoint.place);
      } else {
        setDestText(pickedPoint.place.name);
        setDestPlace(pickedPoint.place);
        saveToRecent(pickedPoint.place);
      }
      onSetMapPicking(null);
    }
  }, [pickedPoint, onSetMapPicking]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !originInputRef.current?.contains(e.target as Node) &&
        !destInputRef.current?.contains(e.target as Node)
      ) {
        setActiveField(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search autocomplete debouncing
  const handleInputChange = (field: 'origin' | 'dest', value: string) => {
    if (field === 'origin') {
      setOriginText(value);
      setOriginPlace(null);
    } else {
      setDestText(value);
      setDestPlace(null);
    }

    setActiveField(field);
    setSelectedIndex(-1);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!value || value.trim().length < 1) {
      setSuggestions([]);
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchPlaces(value);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 280);
  };

  // Select a place
  const handleSelectPlace = (field: 'origin' | 'dest', place: PlaceSuggestion) => {
    if (field === 'origin') {
      setOriginText(place.name);
      setOriginPlace(place);
      // Automatically focus destination if not set yet
      if (!destPlace) {
        setTimeout(() => {
          setActiveField('dest');
          destInputRef.current?.focus();
        }, 100);
      } else {
        setActiveField(null);
      }
    } else {
      setDestText(place.name);
      setDestPlace(place);
      setActiveField(null);
    }
    saveToRecent(place);
    setSuggestions([]);
  };

  // GPS "Use Current Location"
  const handleUseCurrentLocation = async (field: 'origin' | 'dest') => {
    setIsSearching(true);
    if (!navigator.geolocation) {
      const fallback: PlaceSuggestion = {
        name: 'Thu Duc City Hall',
        address: '43 Nguyen Van Ba, Binh Tho, Thu Duc City',
        lat: 10.8490,
        lng: 106.7620,
        category: 'general',
      };
      handleSelectPlace(field, fallback);
      setIsSearching(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const rev = await reverseGeocode(lat, lng);
          const currentPlace: PlaceSuggestion = {
            name: rev.address.split(',')[0] || 'My Current Location',
            address: rev.address,
            lat,
            lng,
            category: 'general',
          };
          handleSelectPlace(field, currentPlace);
        } catch {
          const currentPlace: PlaceSuggestion = {
            name: `My GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
            address: `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            lat,
            lng,
            category: 'general',
          };
          handleSelectPlace(field, currentPlace);
        } finally {
          setIsSearching(false);
        }
      },
      () => {
        // Fallback when denied or unavailable
        const fallback: PlaceSuggestion = {
          name: 'Thu Duc Central Hub',
          address: 'Thu Duc Administrative Center',
          lat: 10.8505,
          lng: 106.7580,
          category: 'general',
        };
        handleSelectPlace(field, fallback);
        setIsSearching(false);
      },
      { timeout: 7000 }
    );
  };

  // Keyboard navigation handler for autocomplete
  const handleKeyDown = (e: React.KeyboardEvent, field: 'origin' | 'dest') => {
    const list = getDisplayedPlaces();
    if (!list || list.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < list.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : list.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < list.length) {
        handleSelectPlace(field, list[selectedIndex]);
      } else if (list.length > 0) {
        handleSelectPlace(field, list[0]);
      }
    } else if (e.key === 'Escape') {
      setActiveField(null);
    }
  };

  // Swap Origin and Destination
  const handleSwap = () => {
    const tempText = originText;
    const tempPlace = originPlace;

    setOriginText(destText);
    setOriginPlace(destPlace);

    setDestText(tempText);
    setDestPlace(tempPlace);
  };

  // Trigger Route Planning
  const handlePlanRoute = async () => {
    if (!originPlace || !destPlace) {
      setErrorMsg('Please select both Origin and Destination from suggestions or the map');
      return;
    }

    setIsCalculating(true);
    setErrorMsg(null);

    try {
      const result = await planDynamicRoute({
        origin_name: originPlace.name,
        origin_lat: originPlace.lat,
        origin_lng: originPlace.lng,
        dest_name: destPlace.name,
        dest_lat: destPlace.lat,
        dest_lng: destPlace.lng,
      });

      setRouteResult(result);
      onRouteCalculated(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to calculate navigation route';
      setErrorMsg(msg);
      setRouteResult(null);
      onRouteCalculated(null);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleClearRoute = () => {
    setRouteResult(null);
    onRouteCalculated(null);
    setErrorMsg(null);
  };

  // Get places filtered by category
  const filterByCategory = (list: PlaceSuggestion[]) => {
    if (activeCategory === 'all') return list;
    return list.filter((p) => p.category === activeCategory);
  };

  const getDisplayedPlaces = () => {
    if (suggestions.length > 0) {
      return filterByCategory(suggestions);
    }
    return filterByCategory(POPULAR_PRESETS);
  };

  // Helper to render Category Icon with bespoke colors
  const renderCategoryIcon = (category?: string) => {
    switch (category) {
      case 'education':
        return (
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <GraduationCap size={15} weight="duotone" />
          </div>
        );
      case 'hospital':
        return (
          <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <FirstAid size={15} weight="duotone" />
          </div>
        );
      case 'shopping':
        return (
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Storefront size={15} weight="duotone" />
          </div>
        );
      case 'transit':
        return (
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Train size={15} weight="duotone" />
          </div>
        );
      case 'tech':
        return (
          <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center shrink-0">
            <Buildings size={15} weight="duotone" />
          </div>
        );
      case 'park':
        return (
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Tree size={15} weight="duotone" />
          </div>
        );
      default:
        return (
          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <MapPin size={15} weight="duotone" />
          </div>
        );
    }
  };

  const token = routeResult ? getTrafficToken(routeResult.los) : null;
  const currentQuery = activeField === 'origin' ? originText : destText;
  const displayedPlaces = getDisplayedPlaces();

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Route Input Hub Card */}
      <div className="bg-slate-50/90 rounded-2xl p-3 border border-slate-200/90 shadow-xs space-y-2 relative">
        
        {/* Origin Field (Point A) */}
        <div className="flex items-center gap-2 relative">
          <div className="w-5 flex items-center justify-center shrink-0">
            <Circle size={13} weight="fill" className="text-emerald-500" />
          </div>
          <div className="relative flex-1">
            <input
              ref={originInputRef}
              type="text"
              value={originText}
              onChange={(e) => handleInputChange('origin', e.target.value)}
              onFocus={() => setActiveField('origin')}
              onKeyDown={(e) => handleKeyDown(e, 'origin')}
              placeholder="Search origin, landmark, or coordinates..."
              className="w-full pl-3 pr-8 py-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
            />
            {originText && (
              <button
                onClick={() => {
                  setOriginText('');
                  setOriginPlace(null);
                  originInputRef.current?.focus();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Clear origin"
              >
                <X size={13} weight="bold" />
              </button>
            )}
          </div>
        </div>

        {/* Swap Button Divider */}
        <div className="flex items-center justify-between px-2 pl-7">
          <div className="h-[1px] flex-1 bg-slate-200/70" />
          <button
            onClick={handleSwap}
            className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-200/60 transition-all mx-2 cursor-pointer active:scale-90"
            title="Swap Origin and Destination"
          >
            <ArrowsDownUp size={14} weight="bold" />
          </button>
          <div className="h-[1px] flex-1 bg-slate-200/70" />
        </div>

        {/* Destination Field (Point B) */}
        <div className="flex items-center gap-2 relative">
          <div className="w-5 flex items-center justify-center shrink-0">
            <MapPin size={16} weight="fill" className="text-rose-600" />
          </div>
          <div className="relative flex-1">
            <input
              ref={destInputRef}
              type="text"
              value={destText}
              onChange={(e) => handleInputChange('dest', e.target.value)}
              onFocus={() => setActiveField('dest')}
              onKeyDown={(e) => handleKeyDown(e, 'dest')}
              placeholder="Search destination or address..."
              className="w-full pl-3 pr-8 py-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
            />
            {destText && (
              <button
                onClick={() => {
                  setDestText('');
                  setDestPlace(null);
                  destInputRef.current?.focus();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Clear destination"
              >
                <X size={13} weight="bold" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Location Shortcuts */}
        <div className="flex items-center justify-between pt-1 text-[11px] font-semibold text-slate-600">
          <button
            onClick={() => onSetMapPicking(isMapPicking === 'origin' ? null : 'origin')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              isMapPicking === 'origin'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'hover:bg-slate-200/60 text-slate-600'
            }`}
          >
            <Crosshair size={13} weight="bold" />
            <span>{isMapPicking === 'origin' ? 'Selecting Origin...' : 'Pick Origin'}</span>
          </button>

          <button
            onClick={() => onSetMapPicking(isMapPicking === 'dest' ? null : 'dest')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              isMapPicking === 'dest'
                ? 'bg-rose-600 text-white font-bold shadow-xs'
                : 'hover:bg-slate-200/60 text-slate-600'
            }`}
          >
            <Crosshair size={13} weight="bold" />
            <span>{isMapPicking === 'dest' ? 'Selecting Dest...' : 'Pick Destination'}</span>
          </button>
        </div>

        {/* Action Button: Find Route */}
        <button
          onClick={handlePlanRoute}
          disabled={isCalculating || !originPlace || !destPlace}
          className="w-full mt-1 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
        >
          <NavigationArrow size={16} weight="fill" className={isCalculating ? 'animate-spin' : ''} />
          <span>{isCalculating ? 'Analyzing Corridors & AI...' : 'Find Fastest Route'}</span>
        </button>
      </div>

      {/* Advanced Autocomplete & POI Discovery Drawer */}
      {activeField && (
        <div
          ref={dropdownRef}
          className="bg-white/95 backdrop-blur-2xl rounded-2xl border border-slate-200/90 shadow-2xl p-2.5 max-h-72 overflow-y-auto custom-scrollbar z-40 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {/* Header Row */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {isSearching
                ? 'Searching Locations...'
                : currentQuery.length >= 1
                ? 'Search Results'
                : 'Places & Hubs'}
            </span>
            <div className="flex items-center gap-2">
              {/* GPS button */}
              <button
                onClick={() => handleUseCurrentLocation(activeField)}
                className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                title="Use Current Device Location"
              >
                <Compass size={12} weight="bold" />
                <span>My Location</span>
              </button>
              <button
                onClick={() => setActiveField(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5 rounded"
              >
                <X size={13} weight="bold" />
              </button>
            </div>
          </div>

          {/* Quick Category Filters */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[10px] font-bold">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'transit', label: 'Transit' },
                { id: 'education', label: 'Colleges' },
                { id: 'hospital', label: 'Hospitals' },
                { id: 'shopping', label: 'Malls' },
                { id: 'tech', label: 'Tech Hubs' },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2 py-0.5 rounded-full transition-all shrink-0 cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200/80 hover:text-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Recent Searches (Shown when user has not typed a query yet) */}
          {currentQuery.trim().length === 0 && recentPlaces.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between px-1 text-[10px] font-bold text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock size={11} weight="bold" />
                  Recent Searches
                </span>
                <button
                  onClick={clearAllRecent}
                  className="text-[9px] text-slate-400 hover:text-rose-600 transition-colors"
                >
                  Clear all
                </button>
              </div>

              <div className="space-y-0.5">
                {recentPlaces.map((p, idx) => (
                  <button
                    key={`recent-${idx}`}
                    onClick={() => handleSelectPlace(activeField, p)}
                    className="w-full px-2 py-1.5 rounded-xl text-left hover:bg-slate-50 transition-colors flex items-center justify-between gap-2 group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock size={14} weight="bold" className="text-slate-400 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-800 block truncate">
                          {p.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium block truncate">
                          {p.address}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => removeRecentPlace(e, p.name)}
                      className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                      title="Remove from history"
                    >
                      <Trash size={12} weight="bold" />
                    </button>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading Shimmer Rows */}
          {isSearching && (
            <div className="space-y-2 py-1 animate-pulse">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center gap-2.5 p-1.5 rounded-xl bg-slate-50">
                  <div className="w-7 h-7 rounded-lg bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-slate-200 rounded-md w-3/4" />
                    <div className="h-2.5 bg-slate-100 rounded-md w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Search Results & Popular Hubs List */}
          {!isSearching && displayedPlaces.length > 0 && (
            <div className="space-y-0.5">
              {displayedPlaces.map((p, idx) => {
                const isFocused = selectedIndex === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectPlace(activeField, p)}
                    className={`w-full px-2.5 py-1.5 rounded-xl text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                      isFocused
                        ? 'bg-blue-50/80 ring-1 ring-blue-500/30'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {renderCategoryIcon(p.category)}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-800 block truncate">
                          {p.name}
                        </span>
                        {p.distance_km !== undefined && (
                          <span className="text-[9px] font-mono font-semibold text-slate-400 shrink-0">
                            {p.distance_km} km
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium block truncate">
                        {p.address}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* No Results Fallback */}
          {!isSearching && displayedPlaces.length === 0 && (
            <div className="py-4 text-center text-xs text-slate-400 font-medium space-y-1">
              <p>No locations found for "{currentQuery}"</p>
              <p className="text-[10px] text-slate-400">
                Tip: Try street name, landmark, or coordinates like <code className="font-mono">10.85, 106.77</code>
              </p>
            </div>
          )}

          {/* Bottom helper info */}
          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Use ↑ ↓ to navigate, Enter to select</span>
            <button
              onClick={() => onSetMapPicking(activeField)}
              className="text-blue-600 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <Crosshair size={11} weight="bold" />
              <span>Tap on map</span>
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
          <WarningOctagon size={16} weight="fill" className="shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Route Plan Result Card (Google Maps ETA & Stats) */}
      {routeResult && (
        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
          {/* Main ETA Card */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                    {Math.round(routeResult.travel_time_minutes)}
                  </span>
                  <span className="text-sm font-bold text-slate-700">mins</span>
                  <span className="text-xs text-slate-400 font-medium">&bull;</span>
                  <span className="text-xs font-bold text-slate-500 font-mono">
                    {routeResult.distance_km} km
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: token?.hex }}
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    {routeResult.traffic_delay_minutes > 0
                      ? `+${Math.round(routeResult.traffic_delay_minutes)} min delay due to congestion`
                      : 'Free flow, no traffic delays'}
                  </span>
                </div>
              </div>

              {/* LOS Badge */}
              <span
                className="px-2.5 py-1 rounded-xl text-xs font-black font-mono shadow-2xs"
                style={{
                  backgroundColor: `${token?.hex}18`,
                  color: token?.hex,
                  border: `1px solid ${token?.hex}35`,
                }}
              >
                LOS {routeResult.los}
              </span>
            </div>

            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="p-2 rounded-xl bg-slate-50 flex items-center gap-2">
                <Speedometer size={16} weight="duotone" className="text-blue-600" />
                <div>
                  <span className="text-[10px] text-slate-400 font-medium block">Actual Speed</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {routeResult.current_speed} km/h
                  </span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-50 flex items-center gap-2">
                <Clock size={16} weight="duotone" className="text-indigo-600" />
                <div>
                  <span className="text-[10px] text-slate-400 font-medium block">Free-flow Speed</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {routeResult.free_flow_speed} km/h
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Traffic Prediction Section */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                style={{
                  background: `linear-gradient(135deg, ${tokens.colors.brand.primary}, ${tokens.colors.brand.accent})`,
                }}
              >
                <Sparkle size={15} weight="fill" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  AI Route Forecast
                </h4>
                <p className="text-[10px] text-slate-500 font-medium">
                  Traffic velocity trend for next 15, 30, 45 mins
                </p>
              </div>
            </div>

            {/* Prediction Horizons Grid */}
            <div className="grid grid-cols-3 gap-2">
              {routeResult.predictions.map((p) => {
                const pToken = getTrafficToken(p.predicted_los);
                return (
                  <div
                    key={p.horizon_minutes}
                    className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 flex flex-col justify-between space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500">
                        +{p.horizon_minutes}m
                      </span>
                      {p.trend === 'improving' ? (
                        <TrendUp size={13} weight="bold" className="text-emerald-600" />
                      ) : p.trend === 'worsening' ? (
                        <TrendDown size={13} weight="bold" className="text-rose-600" />
                      ) : (
                        <Minus size={13} weight="bold" className="text-slate-400" />
                      )}
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-black text-slate-800 font-mono">
                        {p.predicted_speed}
                      </span>
                      <span className="text-[9px] text-slate-400">km/h</span>
                    </div>

                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono text-center block"
                      style={{
                        backgroundColor: pToken.bgSubtle,
                        color: pToken.text,
                      }}
                    >
                      LOS {p.predicted_los}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* AI Recommendation Box */}
            <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200/70 text-xs text-blue-900 font-medium leading-relaxed">
              <span className="font-bold block mb-0.5 text-blue-950 flex items-center gap-1">
                <ShieldCheck size={14} weight="fill" className="text-blue-600" />
                AI Smart Recommendation:
              </span>
              {routeResult.recommendation}
            </div>
          </div>

          {/* Clear Route Button */}
          <button
            onClick={handleClearRoute}
            className="w-full py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Clear this route
          </button>
        </div>
      )}
    </div>
  );
};
