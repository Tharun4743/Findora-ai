import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardOverview from './pages/DashboardOverview';
import MatchHeroView from './components/MatchHeroView';
import BlindVerificationModal from './components/BlindVerificationModal';
import RecoveryCaseModal from './components/RecoveryCaseModal';
import AiAssistantModal from './components/AiAssistantModal';
import AdminDashboard from './pages/AdminDashboard';
import CampusIntelligence from './pages/CampusIntelligence';
import ReportItem from './pages/ReportItem';
import ItemsExplorer from './pages/ItemsExplorer';
import { api } from './services/api';

function MainLayout() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard'); // 'dashboard' | 'matches' | 'explore' | 'report' | 'campus' | 'admin'
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  
  // Guard admin tab for role-based access
  useEffect(() => {
    if (activeTab === 'admin' && !isAdmin) {
      setActiveTab('dashboard');
    }
  }, [activeTab, isAdmin]);
  
  // Modals
  const [claimModalOpen, setClaimModalOpen] = useState<boolean>(false);
  const [activeClaimMatchData, setActiveClaimMatchData] = useState<any>(null);
  
  const [recoveryModalOpen, setRecoveryModalOpen] = useState<boolean>(false);
  const [activeRecoveryCase, setActiveRecoveryCase] = useState<any>(null);

  const [assistantModalOpen, setAssistantModalOpen] = useState<boolean>(false);

  // Initialize active match dynamically from database
  useEffect(() => {
    api.getMatches().then(res => {
      if (res.matches && res.matches.length > 0) {
        setActiveMatchId(res.matches[0].id);
      }
    }).catch(console.error);
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K to open AI Assistant
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setAssistantModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleStartClaim = (matchData: any) => {
    setActiveClaimMatchData(matchData);
    setClaimModalOpen(true);
  };

  const handleInspectMatch = (matchId: string) => {
    setActiveMatchId(matchId);
    setActiveTab('matches');
  };

  const handleViewRecoveryCase = (caseObj: any) => {
    setActiveRecoveryCase(caseObj);
    setRecoveryModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b0b0e] text-slate-900 dark:text-white flex font-sans transition-colors selection:bg-blue-600 selection:text-white">
      
      {/* 1. Left Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        mobileOpen={sidebarOpen} 
        setMobileOpen={setSidebarOpen}
        onOpenReport={() => setActiveTab('report')}
      />

      {/* 2. Main Right Column */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        
        {/* Top Header Bar with Export Button, Theme Toggle, Bell */}
        <Header 
          activeTab={activeTab}
          onToggleSidebar={() => setSidebarOpen(prev => !prev)}
          onOpenReport={() => setActiveTab('report')}
          onOpenAssistant={() => setAssistantModalOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardOverview 
              onNavigate={(tab) => {
                if (tab === 'admin' && !isAdmin) {
                  alert('Access restricted: Security & Verifications requires Security Officer (Admin) privileges.');
                  return;
                }
                setActiveTab(tab);
              }} 
            />
          )}

          {activeTab === 'matches' && (
            <MatchHeroView 
              activeMatchId={activeMatchId}
              onStartClaim={handleStartClaim}
              onSelectOtherMatch={(id) => setActiveMatchId(id)}
            />
          )}

          {activeTab === 'explore' && (
            <ItemsExplorer 
              onInspectItemMatches={async (itemId) => {
                try {
                  const res = await api.getMatches();
                  const matched = res.matches?.find((m: any) => m.lost_item_id === itemId || m.found_item_id === itemId);
                  if (matched) {
                    setActiveMatchId(matched.id);
                  } else if (res.matches?.length > 0) {
                    setActiveMatchId(res.matches[0].id);
                  }
                } catch (e) {
                  console.error(e);
                }
                setActiveTab('matches');
              }}
            />
          )}

          {activeTab === 'report' && (
            <ReportItem 
              onReportSuccess={() => {
                setActiveTab('explore');
              }}
            />
          )}

          {activeTab === 'campus' && (
            <CampusIntelligence />
          )}

          {activeTab === 'admin' && (
            isAdmin ? (
              <AdminDashboard 
                onInspectMatch={handleInspectMatch}
                onViewRecoveryCase={handleViewRecoveryCase}
              />
            ) : (
              <div className="p-8 text-center bg-white dark:bg-[#141418] rounded-2xl border border-slate-200 dark:border-[#26262e]">
                <h3 className="text-lg font-bold text-rose-600">Access Restricted</h3>
                <p className="text-xs text-slate-500 mt-2">Only Campus Security Officers have access to the Verifications panel.</p>
              </div>
            )
          )}
        </main>

        {/* Clean Footer */}
        <footer className="border-t border-slate-200/80 dark:border-[#26262e] bg-white dark:bg-[#0b0b0e] py-3.5 text-center text-xs text-slate-400 dark:text-zinc-500 font-mono transition-colors">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>Findora Vault • Campus Incident &amp; Recovery Intelligence</span>
            <span>Zero-Knowledge Verification • Multimodal Engine • 2026</span>
          </div>
        </footer>

      </div>

      {/* Blind Verification Challenge Modal */}
      <BlindVerificationModal 
        isOpen={claimModalOpen}
        matchData={activeClaimMatchData}
        onClose={() => setClaimModalOpen(false)}
        onVerificationComplete={(_verificationResult) => {
          setClaimModalOpen(false);
          if (isAdmin) {
            setActiveTab('admin');
          } else {
            setActiveTab('dashboard');
          }
        }}
      />

      {/* Recovery Case & Handover Modal */}
      <RecoveryCaseModal 
        isOpen={recoveryModalOpen}
        recoveryCase={activeRecoveryCase}
        onClose={() => setRecoveryModalOpen(false)}
        onHandoverCompleted={() => {
          setRecoveryModalOpen(false);
        }}
      />

      {/* Grounded AI Search Assistant Modal */}
      <AiAssistantModal 
        isOpen={assistantModalOpen}
        onClose={() => setAssistantModalOpen(false)}
        onSelectCandidate={(_item) => {
          setActiveTab('explore');
        }}
      />

    </div>
  );
}

function RootApp() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b0b0e] flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-xl border border-cyan-500/40 bg-white dark:bg-[#141418] p-1 animate-pulse mb-4">
          <img src="/findora_logo.jpg" alt="Findora AI" className="w-full h-full object-cover rounded-xl" />
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Verifying Findora Security Session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return <MainLayout />;
}

export default function App() {
  return (
    <AuthProvider>
      <RootApp />
    </AuthProvider>
  );
}
