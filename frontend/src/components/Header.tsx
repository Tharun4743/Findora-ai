import React from 'react';
import { 
  Menu, 
  Bell, 
  Download, 
  PlusCircle, 
  Sparkles,
  Users
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../context/AuthContext';

export interface HeaderProps { 
  activeTab: string; 
  onToggleSidebar: () => void; 
  onOpenReport: () => void; 
  onOpenAssistant: () => void; 
}

export default function Header({ 
  activeTab, 
  onToggleSidebar, 
  onOpenReport, 
  onOpenAssistant 
}: HeaderProps) {
  const { unreadCount } = useAuth();

  const titleMap: Record<string, { title: string; subtitle: string }> = {
    dashboard: { title: 'Dashboard', subtitle: 'FINDORA CAMPUS VAULT' },
    matches: { title: 'AI Match Intelligence', subtitle: 'MULTIMODAL CORRELATION ENGINE' },
    report: { title: 'Report Lost & Found', subtitle: 'ZERO-KNOWLEDGE PRIVACY VAULT' },
    explore: { title: 'Items Registry', subtitle: 'PUBLIC ZERO-LEAK CATALOG' },
    campus: { title: 'Campus Spatial Heatmap', subtitle: 'REAL-TIME INCIDENT TELEMETRY' },
    admin: { title: 'Security & Verifications', subtitle: 'COMMAND & AUDIT CENTER' }
  };

  const current = titleMap[activeTab] || titleMap.dashboard;

  const handleExportReport = () => {
    window.print();
  };

  return (
    <header className="bg-white dark:bg-[#141418] border-b border-slate-200/90 dark:border-[#26262e] transition-colors sticky top-0 z-30">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
      
      {/* Left: Hamburger & Page Headings */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 rounded-xl text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#1a1a20] transition-colors cursor-pointer"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Logo display */}
        <div className="md:hidden w-8 h-8 rounded-xl overflow-hidden border border-emerald-500/30 shrink-0">
          <img src="/findora_logo.jpg" alt="Findora AI" className="w-full h-full object-cover" />
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
            {current.title}
          </h2>
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mt-0.5">
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        
        {/* Emerald Green CTA Pill Button */}
        <button
          onClick={handleExportReport}
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00875A] hover:bg-[#007048] text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Custom Report</span>
        </button>

        {/* Telegram Campus Community Group Link Button */}
        <a
          href="https://t.me/+V_U9BauJqKQ2NzE1"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
          title="Join Official Telegram Campus Group (Visual Summaries & Broadcasts)"
        >
          <Users className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden md:inline font-mono">Campus Group</span>
        </a>

        {/* Telegram Bot Link Button */}
        <a
          href="https://t.me/findoravsb_bot"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
          title="Open Telegram Bot @findoravsb_bot (Personal 1-on-1 Student Bot)"
        >
          <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.197 1.006.128.832.942z"/>
          </svg>
          <span className="hidden md:inline font-mono">@findoravsb_bot</span>
        </a>

        {/* Quick Report CTA Button */}
        <button
          onClick={onOpenReport}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Report Item</span>
        </button>

        {/* AI Assistant Quick Search Trigger */}
        <button
          onClick={onOpenAssistant}
          className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#1a1a20] hover:bg-slate-200 dark:hover:bg-[#202028] border border-slate-200 dark:border-[#26262e] text-xs font-mono text-slate-700 dark:text-zinc-300 transition-all cursor-pointer"
          title="Search AI Assistant (Ctrl+K)"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
          <span>Search</span>
          <kbd className="text-[10px] bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-1 rounded">⌘K</kbd>
        </button>

        {/* Theme Toggle in Circle Badge */}
        <ThemeToggle />

        {/* Notification Bell in Circle Badge */}
        <div className="relative">
          <button 
            className="w-9 h-9 rounded-xl border border-slate-200 dark:border-[#26262e] bg-white dark:bg-[#1a1a20] hover:bg-slate-50 dark:hover:bg-[#202028] text-slate-600 dark:text-zinc-300 flex items-center justify-center transition-colors cursor-pointer shadow-xs"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

      </div>
      </div>
    </header>
  );
}
