import React from 'react';
import { 
  LayoutGrid, 
  Sparkles, 
  PlusCircle, 
  Layers, 
  MapPin, 
  ShieldCheck, 
  ChevronRight, 
  LogOut,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  onOpenReport?: () => void;
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  mobileOpen, 
  setMobileOpen, 
  onOpenReport 
}: SidebarProps) {
  const { currentUser, isAdmin, logout } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutGrid className="w-4 h-4 text-blue-500" />, adminOnly: false },
    { id: 'matches', label: 'AI Matches', icon: <Sparkles className="w-4 h-4 text-purple-500" />, adminOnly: false },
    { id: 'report', label: 'Report Item', icon: <PlusCircle className="w-4 h-4 text-rose-500" />, adminOnly: false },
    { id: 'explore', label: 'Items Registry', icon: <Layers className="w-4 h-4 text-amber-500" />, adminOnly: false },
    { id: 'campus', label: 'Campus Heatmap', icon: <MapPin className="w-4 h-4 text-emerald-500" />, adminOnly: false },
    { id: 'admin', label: 'Verifications', icon: <ShieldCheck className="w-4 h-4 text-indigo-500" />, adminOnly: true },
  ];

  // Filter menu items strictly based on role: Remove items the user does not have permission to access
  const visibleMenuItems = menuItems.filter(item => {
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)} 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-xs"
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed inset-y-0 left-0 z-50
        md:sticky md:top-0 md:h-screen md:self-start
        w-64 h-screen shrink-0
        bg-white dark:bg-[#141418] border-r border-slate-200/90 dark:border-[#26262e]
        flex flex-col justify-between p-4 transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Top: Logo & Branding */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between pb-5 pt-1 px-1 border-b border-slate-100 dark:border-[#26262e] shrink-0">
            <div className="flex items-center gap-3">
              {/* Generated Bright Logo Image */}
              <div className="w-11 h-11 rounded-2xl overflow-hidden bg-white dark:bg-[#1a1a20] border border-cyan-500/40 p-0.5 shadow-sm shrink-0">
                <img 
                  src="/findora_logo.jpg" 
                  alt="Findora AI Logo" 
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-tight truncate">
                  Findora Vault
                </h1>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 truncate">
                  CAMPUS PORTAL
                </p>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button 
              onClick={() => setMobileOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Menu List - strictly filtered based on role */}
          <nav className="mt-5 space-y-1.5 overflow-y-auto flex-1 pr-0.5">
            {visibleMenuItems.map((item) => {
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileOpen(false);
                  }}
                  className={`
                    w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-sm
                    transition-all duration-200 cursor-pointer
                    ${isActive 
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs font-semibold' 
                      : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-[#1a1a20] hover:text-slate-900 dark:hover:text-white'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-white dark:text-zinc-900' : ''}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isActive && (
                      <ChevronRight className="w-4 h-4 text-white dark:text-zinc-900" />
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Profile & Logout Section (Constant at all pages) */}
        <div className="shrink-0 pt-4 border-t border-slate-100 dark:border-[#26262e] space-y-3">
          <div className="px-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
                LOGGED IN AS
              </span>
              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
                currentUser?.role === 'admin'
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                  : currentUser?.role === 'verification_officer'
                    ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                    : 'bg-emerald-500/15 text-emerald-600 dark:text-[#4ade80] border border-emerald-500/30'
              }`}>
                {currentUser?.role === 'admin' 
                  ? 'ADMIN' 
                  : currentUser?.role === 'verification_officer' 
                    ? 'OFFICER' 
                    : 'STUDENT'}
              </span>
            </div>
            <div className="font-bold text-xs text-slate-900 dark:text-white truncate mt-1">
              {currentUser?.name || 'Administrator'}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">
              {currentUser?.email || 'admin@campus.edu'}
            </div>
          </div>

          <button
            onClick={() => {
              if (confirm('Sign out from Findora Vault?')) {
                logout();
              }
            }}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-bold transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
