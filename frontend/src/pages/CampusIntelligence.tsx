import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Clock, 
  ShieldCheck, 
  PieChart as PieIcon, 
  Layers, 
  CheckCircle2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { api } from '../services/api';
import { StatCard, Badge } from '../components/ui/Primitives';

export default function CampusIntelligence() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBuilding, setSelectedBuilding] = useState<any>(null);

  useEffect(() => {
    api.getAnalytics().then(data => {
      setAnalytics(data);
      if (data.hotspots?.length > 0) {
        setSelectedBuilding(data.hotspots[0]);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-[450px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 dark:border-sky-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono text-blue-600 dark:text-sky-400">LOADING CAMPUS SPATIAL TELEMETRY...</span>
        </div>
      </div>
    );
  }

  const { summary, hotspots, hourlyTrends, categoryDistribution = [] } = analytics;

  return (
    <div className="space-y-6 w-full pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-[#26262e] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="blue" className="font-mono">
              CAMPUS TELEMETRY
            </Badge>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">SPATIAL-TEMPORAL INTELLIGENCE</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white mt-1">Campus Loss Hotspot Map</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Automated cluster detection, high-density incident heatmaps, and recovery turnaround analytics.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 p-2 rounded-xl bg-zinc-50 dark:bg-[#141418] border border-zinc-200 dark:border-[#26262e] text-xs font-mono">
          <span className="flex items-center gap-1 text-rose-600 dark:text-[#fb7185]"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> High Zone</span>
          <span className="flex items-center gap-1 text-amber-600 dark:text-[#fde047]"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Medium Zone</span>
          <span className="flex items-center gap-1 text-emerald-600 dark:text-[#4ade80]"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Low Zone</span>
        </div>
      </div>

      {/* Summary KPI Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="MOST LOST CATEGORY" value={summary.mostLostCategory} icon={<Layers className="w-5 h-5" />} color="indigo" />
        <StatCard title="COMMON HOTSPOT" value={summary.mostCommonLocation} icon={<MapPin className="w-5 h-5" />} color="blue" />
        <StatCard title="PEAK LOSS WINDOW" value={summary.peakLossWindow} icon={<Clock className="w-5 h-5" />} color="amber" />
        <StatCard title="RECOVERY RATE" value={summary.recoveryRate} icon={<CheckCircle2 className="w-5 h-5" />} color="emerald" subtitle="Campus Benchmark" />
      </div>

      {/* Interactive Map & Building Telemetry Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Custom Campus SVG Hotspot Map */}
        <div className="lg:col-span-8 p-5 rounded-2xl bg-white dark:bg-[#141418] border border-zinc-200/90 dark:border-[#26262e] shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-[#26262e] pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white font-mono flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-blue-600 dark:text-sky-400" /> Interactive Campus Zones
            </span>
            <span className="text-[11px] text-zinc-400">Click building zone to inspect telemetry</span>
          </div>

          {/* SVG Map Canvas */}
          <div className="relative aspect-[16/9] w-full bg-zinc-50 dark:bg-[#0b0b0e] rounded-xl overflow-hidden border border-zinc-200 dark:border-[#26262e] p-2">
            <svg className="w-full h-full" viewBox="0 0 550 480">
              
              {/* Campus Roads and Walkways */}
              <g stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth="8" fill="none">
                <path d="M 50 150 L 300 150 L 300 360 L 450 360" />
                <path d="M 120 50 L 120 440 L 450 440" />
                <path d="M 180 150 L 180 320 L 420 320 L 420 110" />
              </g>

              {/* Campus Greenery Zones */}
              <rect x="220" y="80" width="60" height="50" rx="8" fill="rgba(16, 185, 129, 0.08)" stroke="rgba(16, 185, 129, 0.2)" />
              <rect x="220" y="380" width="80" height="40" rx="8" fill="rgba(16, 185, 129, 0.08)" stroke="rgba(16, 185, 129, 0.2)" />

              {/* Hotspot Buildings */}
              {hotspots.map((b: any) => {
                const isSelected = selectedBuilding?.building === b.building;
                const isHigh = b.zoneLevel === 'HIGH';

                return (
                  <g 
                    key={b.building} 
                    className="cursor-pointer transition-all duration-300"
                    onClick={() => setSelectedBuilding(b)}
                  >
                    {/* Pulsing Hotspot Aura */}
                    <circle
                      cx={b.coordinates.x}
                      cy={b.coordinates.y}
                      r={b.coordinates.radius}
                      fill={b.color}
                      opacity={isSelected ? 0.3 : 0.15}
                      className={isHigh ? 'animate-pulse' : ''}
                    />

                    {/* Building Pin Base */}
                    <rect
                      x={b.coordinates.x - 35}
                      y={b.coordinates.y - 25}
                      width="70"
                      height="50"
                      rx="10"
                      className="fill-white dark:fill-[#141418]"
                      stroke={isSelected ? '#3b82f6' : b.color}
                      strokeWidth={isSelected ? '2.5' : '1.5'}
                    />

                    {/* Zone Badge Dot */}
                    <circle
                      cx={b.coordinates.x}
                      cy={b.coordinates.y - 8}
                      r="6"
                      fill={b.color}
                    />

                    {/* Building Label */}
                    <text
                      x={b.coordinates.x}
                      y={b.coordinates.y + 14}
                      className="fill-zinc-900 dark:fill-white font-bold"
                      fontSize="9"
                      fontFamily="system-ui, sans-serif"
                      textAnchor="middle"
                    >
                      {b.building}
                    </text>

                    <text
                      x={b.coordinates.x}
                      y={b.coordinates.y + 36}
                      fill={b.color}
                      fontSize="8"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {b.reportedLosses} LOSSES
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right: Selected Building Details */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-white dark:bg-[#141418] border border-zinc-200/90 dark:border-[#26262e] shadow-xs space-y-4 flex flex-col justify-between">
          {selectedBuilding ? (
            <div>
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-[#26262e] pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
                  Zone Telemetry
                </span>
                <Badge variant={selectedBuilding?.zoneLevel === 'HIGH' ? 'rose' : selectedBuilding?.zoneLevel === 'MEDIUM' ? 'amber' : 'emerald'}>
                  {selectedBuilding?.zoneLevel || 'MONITORED'} RISK ZONE
                </Badge>
              </div>

              <div className="space-y-4 mt-4">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white leading-tight">{selectedBuilding?.name || selectedBuilding?.building}</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">High-traffic campus facility with active Findora monitoring.</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#101014] border border-zinc-200/80 dark:border-[#26262e]">
                    <span className="text-[10px] text-zinc-400 uppercase font-mono font-bold block">Loss Events</span>
                    <span className="text-xl font-black font-mono text-zinc-900 dark:text-white">{selectedBuilding?.reportedLosses || 0}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#101014] border border-zinc-200/80 dark:border-[#26262e]">
                    <span className="text-[10px] text-zinc-400 uppercase font-mono font-bold block">Recovery Rate</span>
                    <span className="text-xl font-black font-mono text-emerald-600 dark:text-[#4ade80]">{selectedBuilding?.recoveryRate || 0}%</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">Frequently Misplaced Items:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedBuilding?.primaryCategories || []).map((cat: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg text-[11px] bg-zinc-100 dark:bg-[#1a1a20] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-[#26262e] font-medium">
                        {cat}
                      </span>
                    ))}
                    {(!selectedBuilding?.primaryCategories || selectedBuilding.primaryCategories.length === 0) && (
                      <span className="text-xs text-zinc-400 italic">None recorded</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center my-auto space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-sky-400 flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">No Building Incidents Yet</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                As real lost and found reports are filed across campus facilities, spatial cluster heatmaps and building telemetry will appear here in real time.
              </p>
            </div>
          )}

          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-xs text-blue-800 dark:text-sky-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" />
            <span>Autonomous patrol routing prioritized during peak hours (4 PM - 6 PM).</span>
          </div>

        </div>

      </div>

      {/* Hourly Trends & Category Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Hourly Loss Trends (Bar Chart) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#141418] border border-zinc-200/90 dark:border-[#26262e] shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-[#26262e] pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white font-mono flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" /> Hourly Loss Incident Distribution
            </span>
            <Badge variant="amber" className="font-mono">
              PEAK: 4 PM – 6 PM
            </Badge>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyTrends}>
                <XAxis dataKey="hour" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#141418', borderColor: '#26262e', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                  itemStyle={{ color: '#38bdf8' }}
                />
                <Bar dataKey="losses" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown (Pie / Donut Chart) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#141418] border border-zinc-200/90 dark:border-[#26262e] shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-[#26262e] pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white font-mono flex items-center gap-1.5">
              <PieIcon className="w-4 h-4 text-blue-600 dark:text-sky-400" /> Campus Misplaced Category Share
            </span>
            <Badge variant="blue" className="font-mono">Electronics 44%</Badge>
          </div>

          <div className="h-56 w-full flex items-center justify-between">
            <div className="h-full w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryDistribution}
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#141418', borderColor: '#26262e', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="w-1/2 space-y-2 pr-2">
              {categoryDistribution.map((c: any) => (
                <div key={c.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }}></span>
                    <span className="text-zinc-600 dark:text-zinc-300 truncate">{c.name}</span>
                  </div>
                  <span className="font-mono font-bold text-zinc-900 dark:text-white">{c.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
