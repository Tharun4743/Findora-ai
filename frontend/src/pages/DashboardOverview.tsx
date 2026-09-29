import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  GraduationCap, 
  AlertTriangle, 
  ClipboardList, 
  ArrowRight,
  Sparkles,
  ShieldCheck,
  PlusCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { api } from '../services/api';

export interface DashboardOverviewProps {
  onNavigate: (tab: string) => void;
}

export default function DashboardOverview({ onNavigate }: DashboardOverviewProps) {
  const [data, setData] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [, setLoading] = useState<boolean>(true);

  // Filters matching screenshot
  const [selectedBuilding, setSelectedBuilding] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dash, ana] = await Promise.all([
        api.getAdminDashboard().catch(() => null),
        api.getAnalytics().catch(() => null)
      ]);
      setData(dash);
      setAnalytics(ana);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const stats = data?.stats || analytics?.stats || {
    totalLost: 0,
    totalFound: 0,
    aiMatches: 0,
    pendingClaims: 0,
    recovered: 0,
    activeRiskAlerts: 0,
    recoveryRate: 0
  };

  const totalRegistry = (stats.totalLost || 0) + (stats.totalFound || 0);

  return (
    <div className="space-y-6 w-full pb-12">
      
      {/* 1. TOP ROW OF 5 KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Card 1: ACTIVE LOST (Blue icon) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#141418] border border-slate-200/90 dark:border-[#26262e] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 truncate">
              ACTIVE LOST...
            </p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
              {stats.totalLost}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#2563EB] flex items-center justify-center text-white shadow-xs shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: FOUND ITEMS (Green icon) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#141418] border border-slate-200/90 dark:border-[#26262e] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 truncate">
              ITEMS FOUND...
            </p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
              {stats.totalFound}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#10B981] flex items-center justify-center text-white shadow-xs shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: TOTAL ENROLLED / INDEXED (Purple icon) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#141418] border border-slate-200/90 dark:border-[#26262e] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 truncate">
              TOTAL ENROL...
            </p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
              {totalRegistry}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#6366F1] flex items-center justify-center text-white shadow-xs shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: PENDING / ALERTS (Orange icon) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#141418] border border-slate-200/90 dark:border-[#26262e] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 truncate">
              PENDING CLA...
            </p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
              {stats.pendingClaims}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#F59E0B] flex items-center justify-center text-white shadow-xs shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Card 5: RECOVERIES COMPLETED (Amber/Orange icon) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#141418] border border-slate-200/90 dark:border-[#26262e] shadow-xs flex items-center justify-between col-span-2 sm:col-span-1">
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 truncate">
              RECOVERED...
            </p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
              {stats.recovered}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#F97316] flex items-center justify-center text-white shadow-xs shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* 2. MAIN SECTION: CLASS ANALYZER CONTAINER */}
      <div className="rounded-2xl bg-white dark:bg-[#141418] border border-slate-200/90 dark:border-[#26262e] p-5 sm:p-7 shadow-xs space-y-6">
        
        {/* Container Header */}
        <div>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Campus Incident &amp; Match Analyzer
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Track registered reports, multimodal matching correlation, and custody recovery by zone and category
          </p>
        </div>

        {/* Filter Row with Styled Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
          
          {/* Dropdown 1: Building */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block font-mono">
              BUILDING / ZONE
            </label>
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 dark:bg-[#0b0b0e] text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-[#26262e] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">All Buildings</option>
              <option value="Library">Library</option>
              <option value="Science Complex">Science Complex</option>
              <option value="Hostel Block A">Hostel Block A</option>
              <option value="Dining Hall">Dining Hall</option>
              <option value="Gymnasium">Gymnasium</option>
            </select>
          </div>

          {/* Dropdown 2: Category */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block font-mono">
              CATEGORY
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 dark:bg-[#0b0b0e] text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-[#26262e] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">All Categories</option>
              <option value="Electronics">Electronics</option>
              <option value="Bags">Bags</option>
              <option value="Keys">Keys</option>
              <option value="Accessories">Accessories</option>
            </select>
          </div>

          {/* Dropdown 3: Report Type */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block font-mono">
              REPORT TYPE
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 dark:bg-[#0b0b0e] text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-[#26262e] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">All Reports</option>
              <option value="LOST">Lost Reports</option>
              <option value="FOUND">Found Reports</option>
            </select>
          </div>

          {/* Dropdown 4: Verification Status */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block font-mono">
              VERIFICATION
            </label>
            <select
              className="w-full text-xs font-semibold bg-slate-50 dark:bg-[#0b0b0e] text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-[#26262e] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">All Claimants</option>
              <option value="VERIFIED">Verified (Low Risk)</option>
              <option value="AUDIT">Under Review</option>
            </select>
          </div>

          {/* Dropdown 5: Item Status */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block font-mono">
              STATUS
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 dark:bg-[#0b0b0e] text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-[#26262e] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">All Status</option>
              <option value="OPEN">Open</option>
              <option value="CLAIMED">Claimed</option>
              <option value="RECOVERED">Recovered</option>
            </select>
          </div>

        </div>

        {/* 4 Nested Mini Sub-Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          
          {/* Sub-Card 1: TOTAL REGISTRY */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-[#26262e] bg-slate-50/50 dark:bg-[#0b0b0e] flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                TOTAL REGISTRY
              </p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                {totalRegistry}
              </p>
            </div>
            <div className="text-right space-y-0.5 text-xs font-semibold">
              <div className="text-blue-600 dark:text-sky-400">Lost: {stats.totalLost}</div>
              <div className="text-rose-500 dark:text-rose-400">Found: {stats.totalFound}</div>
            </div>
          </div>

          {/* Sub-Card 2: MATCH DISCOVERIES */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-[#26262e] bg-slate-50/50 dark:bg-[#0b0b0e] flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-sky-400">
                AI CANDIDATES
              </p>
              <p className="text-2xl font-black text-blue-600 dark:text-sky-400 mt-0.5">
                {stats.aiMatches}
              </p>
              <p className="text-[10px] text-blue-500/80 font-medium">Multimodal Indexed</p>
            </div>
            <div className="text-right space-y-0.5 text-xs font-semibold">
              <div className="text-blue-600 dark:text-sky-400">Matches: {stats.aiMatches}</div>
              <div className="text-purple-500 dark:text-purple-400">Verified: {stats.recovered}</div>
            </div>
          </div>

          {/* Sub-Card 3: COMPLETED */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-[#26262e] bg-slate-50/50 dark:bg-[#0b0b0e] flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-[#4ade80]">
                COMPLETED
              </p>
              <p className="text-2xl font-black text-emerald-600 dark:text-[#4ade80] mt-0.5">
                {stats.recovered}
              </p>
            </div>
            <div className="text-right space-y-0.5 text-xs font-semibold">
              <div className="text-emerald-600 dark:text-[#4ade80]">Recovered: {stats.recovered}</div>
              <div className="text-slate-400">Rate: {stats.recoveryRate}%</div>
            </div>
          </div>

          {/* Sub-Card 4: PENDING / SKIPPED */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-[#26262e] bg-slate-50/50 dark:bg-[#0b0b0e] flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-[#fde047]">
                UNDER REVIEW
              </p>
              <p className="text-2xl font-black text-amber-600 dark:text-[#fde047] mt-0.5">
                {stats.pendingClaims}
              </p>
            </div>
            <div className="text-right space-y-0.5 text-xs font-semibold">
              <div className="text-amber-600 dark:text-[#fde047]">Claims: {stats.pendingClaims}</div>
              <div className="text-rose-500">Alerts: {stats.activeRiskAlerts}</div>
            </div>
          </div>

        </div>

        {/* Telemetry Charts & Quick Action Row */}
        <div className="pt-4 border-t border-slate-100 dark:border-[#26262e] grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Chart: Hourly Activity */}
          <div className="lg:col-span-8 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 font-mono">
                EVENT-WISE PERFORMANCE / HOURLY INCIDENT RATE
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">Live Telemetry</span>
            </div>

            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.hourlyTrends || []}>
                  <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#18181b', 
                      borderColor: '#27272a', 
                      borderRadius: '12px',
                      color: '#ffffff',
                      fontSize: '12px' 
                    }} 
                  />
                  <Bar dataKey="losses" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Action Box: Quick Navigation Links */}
          <div className="lg:col-span-4 p-4 rounded-xl bg-slate-50 dark:bg-[#0b0b0e] border border-slate-200/80 dark:border-[#26262e] flex flex-col justify-between space-y-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white font-mono">
                System Quick Actions
              </h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Zero-knowledge verification protocols ready.
              </p>

              <div className="space-y-2 mt-4">
                <button
                  onClick={() => onNavigate('matches')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#141418] border border-slate-200 dark:border-[#26262e] hover:border-blue-400 text-xs font-semibold text-slate-800 dark:text-zinc-200 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                    Inspect AI Matches
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <button
                  onClick={() => onNavigate('report')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#141418] border border-slate-200 dark:border-[#26262e] hover:border-emerald-400 text-xs font-semibold text-slate-800 dark:text-zinc-200 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-[#4ade80]" />
                    Register Lost or Found Item
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <button
                  onClick={() => onNavigate('admin')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#141418] border border-slate-200 dark:border-[#26262e] hover:border-indigo-400 text-xs font-semibold text-slate-800 dark:text-zinc-200 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    Security Verification Queue
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-[#26262e] text-[10px] text-slate-400 font-mono">
              Findora Autonomous Protocol • 100% Dynamic
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
