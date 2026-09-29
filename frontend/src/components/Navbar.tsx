import React, { useState } from 'react';
import { 
  Shield, 
  Search, 
  Bell, 
  MapPin, 
  Layers, 
  PlusCircle, 
  RotateCcw,
  Sparkles,
  ChevronDown,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import ThemeToggle from './ThemeToggle';
import { Badge } from './ui/Primitives';

export interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAssistant: () => void;
}

export default function Navbar({ activeTab, setActiveTab, onOpenAssistant }: NavbarProps) {
  const { currentUser, personas = [], switchPersona, notifications, unreadCount, refreshNotifications } = useAuth();
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleResetDemo = async () => {
    if (confirm('Reset Findora AI demo environment to clean initial state?')) {
      setResetting(true);
      try {
        await api.resetDemo();
        if (switchPersona) await switchPersona('usr_student_alex');
        window.location.reload();
      } catch (err) {
        console.error(err);
      } finally {
        setResetting(false);
      }
    }
  };

  const navItems = [
    { id: 'matches', label: 'AI Matches', icon: Sparkles, badge: 'Hero' },
    { id: 'explore', label: 'Explore Registry', icon: Layers },
    { id: 'report', label: 'Report Item', icon: PlusCircle },
    { id: 'campus', label: 'Campus Map', icon: MapPin },
    { id: 'admin', label: 'Command Center', icon: Shield, adminOnly: true }
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 dark:border-[#26262e] bg-white/90 dark:bg-[#0b0b0e]/90 backdrop-blur-xl transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('matches')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 p-[1.5px] shadow-sm">
              <div className="w-full h-full bg-white dark:bg-[#141418] rounded-[10px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-600 dark:text-sky-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white font-sans">FINDORA<span className="text-blue-600 dark:text-sky-400">.AI</span></span>
                <Badge variant="blue" className="text-[10px] py-0">Autonomous</Badge>
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-bold">INTELLIGENCE • VERIFICATION • RECOVERY</p>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-98 ${
                    isActive 
                      ? 'bg-zinc-100 text-zinc-900 dark:bg-white/10 dark:text-white border border-zinc-200 dark:border-[#26262e] shadow-xs' 
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-[#1a1a20]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-sky-400' : 'text-zinc-400 dark:text-zinc-500'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-sky-400 px-1.5 py-0.2 rounded-full font-mono font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Icons & Persona Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* AI Search Assistant Trigger */}
            <button
              onClick={onOpenAssistant}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-[#141418] border border-zinc-200 dark:border-[#26262e] hover:border-zinc-300 dark:hover:border-zinc-600 text-zinc-700 dark:text-zinc-300 text-xs font-mono transition-all active:scale-95 shadow-xs group cursor-pointer"
              title="Open Grounded AI Search Assistant (⌘K)"
            >
              <Search className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 group-hover:scale-110 transition-transform" />
              <span className="hidden lg:inline">AI Assistant</span>
              <kbd className="hidden lg:inline text-[9px] bg-white dark:bg-[#1a1a20] text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-[#26262e]">⌘K</kbd>
            </button>

            {/* Light / Dark Mode Toggle */}
            <ThemeToggle />

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className="relative p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-[#141418] hover:bg-zinc-200 dark:hover:bg-[#1a1a20] border border-zinc-200 dark:border-[#26262e] transition-all active:scale-95 shadow-xs cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 dark:bg-sky-400 animate-pulse" />
                )}
              </button>

              {/* Notifications Popup */}
              {showNotifMenu && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-[#1a1a20] border border-zinc-200 dark:border-[#26262e] shadow-xl p-3 z-50">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-[#26262e]">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Smart Alerts ({notifications.length})</span>
                    <button 
                      onClick={() => { api.markAllNotificationsRead(); refreshNotifications(); }}
                      className="text-[11px] text-blue-600 dark:text-sky-400 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-zinc-400 py-3 text-center">No active alerts</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="p-2.5 rounded-xl bg-zinc-50 dark:bg-[#141418] border border-zinc-200/80 dark:border-[#26262e] text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                              {n.type === 'MATCH_ALERT' ? <Sparkles className="w-3 h-3 text-blue-600 dark:text-sky-400" /> : <AlertTriangle className="w-3 h-3 text-amber-500" />}
                              {n.title}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono">just now</span>
                          </div>
                          <p className="text-zinc-600 dark:text-zinc-300 text-[11px] leading-relaxed">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Active User Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl bg-zinc-100 dark:bg-[#141418] border border-zinc-200 dark:border-[#26262e] hover:border-zinc-300 dark:hover:border-zinc-600 transition-all active:scale-95 shadow-xs cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 flex items-center justify-center">
                  {currentUser?.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser?.name || 'User'}
                      className="w-full h-full object-cover"
                      onError={(e: any) => { e.target.style.display='none'; e.target.parentNode.classList.add('flex','items-center','justify-center'); e.target.parentNode.innerHTML = `<span class="text-[9px] font-bold text-zinc-500 dark:text-zinc-400">${(currentUser?.name||'U')[0].toUpperCase()}</span>`; }}
                    />
                  ) : (
                    <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400">{(currentUser?.name || 'U')[0].toUpperCase()}</span>
                  )}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-zinc-900 dark:text-white leading-tight flex items-center gap-1">
                    {currentUser?.name || 'Loading...'}
                    {currentUser?.role === 'admin' && (
                      <span className="text-[9px] bg-rose-500/20 text-rose-600 dark:text-rose-400 px-1 rounded font-mono font-bold">ADMIN</span>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400">{currentUser?.role === 'admin' ? 'Campus Officer' : 'Student / Claimant'}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              </button>

              {/* Persona Switcher Dropdown */}
              {showPersonaMenu && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-[#1a1a20] border border-zinc-200 dark:border-[#26262e] shadow-xl p-2 z-50">
                  <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100 dark:border-[#26262e] mb-1">
                    Switch Active User
                  </div>
                  <div className="space-y-1">
                    {personas.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { if (switchPersona) switchPersona(p.id); setShowPersonaMenu(false); }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                          currentUser?.id === p.id 
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-sky-300 border border-blue-200 dark:border-blue-500/30' 
                            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#141418]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0">
                            {p.avatar ? (
                              <img
                                src={p.avatar}
                                alt={p.name}
                                className="w-full h-full object-cover"
                                onError={(e: any) => { e.target.style.display='none'; e.target.parentNode.innerHTML = `<span class="text-[9px] font-bold text-zinc-500">${(p.name||'U')[0].toUpperCase()}</span>`; }}
                              />
                            ) : (
                              <span className="text-[9px] font-bold text-zinc-500">{(p.name||'U')[0].toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-900 dark:text-white">{p.name}</div>
                            <div className="text-[10px] text-zinc-400">{p.email} • {p.role}</div>
                          </div>
                        </div>
                        {currentUser?.id === p.id && <CheckCircle className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Reset Database Button */}
            <button
              onClick={handleResetDemo}
              disabled={resetting}
              className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-sky-400 bg-zinc-100 dark:bg-[#141418] hover:bg-zinc-200 dark:hover:bg-[#1a1a20] border border-zinc-200 dark:border-[#26262e] transition-all active:scale-95 shadow-xs cursor-pointer"
              title="Reset System Database to Baseline"
            >
              <RotateCcw className={`w-4 h-4 ${resetting ? 'animate-spin text-blue-600' : ''}`} />
            </button>

          </div>

        </div>
      </div>
    </header>
  );
}
