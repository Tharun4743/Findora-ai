import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  Layers, 
  TrendingUp, 
  User,
  ExternalLink,
  RefreshCw,
  Send,
  Users,
  Bot,
  Radio,
  MessageSquare
} from 'lucide-react';
import { api } from '../services/api';
import { StatCard, Badge } from '../components/ui/Primitives';

export interface AdminDashboardProps {
  onInspectMatch?: (matchId: string) => void;
  onViewRecoveryCase?: (recoveryCase: any) => void;
}

export default function AdminDashboard({ onInspectMatch, onViewRecoveryCase }: AdminDashboardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [processingClaim, setProcessingClaim] = useState<string | null>(null);

  // 1-Time Code Search Closure State
  const [closeCodeInput, setCloseCodeInput] = useState<string>('');
  const [closeCodeLoading, setCloseCodeLoading] = useState<boolean>(false);
  const [closeCodeResult, setCloseCodeResult] = useState<any>(null);
  const [closeCodeError, setCloseCodeError] = useState<string>('');

  // Telegram Bot & Campus Group Hub State
  const [telegramStatus, setTelegramStatus] = useState<any>(null);
  const [telegramSimInput, setTelegramSimInput] = useState<string>('/summary');
  const [telegramSimType, setTelegramSimType] = useState<string>('supergroup');
  const [telegramSimReplies, setTelegramSimReplies] = useState<any[] | null>(null);
  const [telegramSimLoading, setTelegramSimLoading] = useState<boolean>(false);
  const [telegramBroadcastLoading, setTelegramBroadcastLoading] = useState<boolean>(false);
  const [telegramBroadcastSuccess, setTelegramBroadcastSuccess] = useState<string>('');

  useEffect(() => {
    loadDashboard();
    loadTelegramStatus();
  }, []);

  const loadTelegramStatus = async () => {
    try {
      const res = await api.getTelegramStatus();
      setTelegramStatus(res);
    } catch (err) {
      console.error('Failed to load telegram status:', err);
    }
  };

  const handleBroadcastSummary = async () => {
    setTelegramBroadcastLoading(true);
    setTelegramBroadcastSuccess('');
    try {
      const res = await api.broadcastTelegramSummary();
      setTelegramBroadcastSuccess(`Broadcast dispatched to ${res.broadcastedToGroupsCount || 1} campus group(s)!`);
      setTimeout(() => setTelegramBroadcastSuccess(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch summary');
    } finally {
      setTelegramBroadcastLoading(false);
    }
  };

  const handleSimulateCommand = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!telegramSimInput.trim()) return;
    setTelegramSimLoading(true);
    setTelegramSimReplies(null);
    try {
      const res = await api.simulateTelegramCommand({
        message: telegramSimInput.trim(),
        chatType: telegramSimType,
        username: telegramSimType === 'supergroup' ? 'CampusOfficer' : 'StudentKumar'
      });
      setTelegramSimReplies(res.replies || []);
    } catch (err: any) {
      alert(err.message || 'Simulation error');
    } finally {
      setTelegramSimLoading(false);
    }
  };

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminDashboard();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closeCodeInput.trim()) return;
    setCloseCodeLoading(true);
    setCloseCodeError('');
    setCloseCodeResult(null);
    try {
      const res = await api.closeSearchByCode(closeCodeInput.trim());
      setCloseCodeResult(res);
      setCloseCodeInput('');
      await loadDashboard();
    } catch (err: any) {
      setCloseCodeError(err.message || 'Failed to verify code');
    } finally {
      setCloseCodeLoading(false);
    }
  };

  const handleApproveClaim = async (claimId: string) => {
    setProcessingClaim(claimId);
    try {
      const res = await api.approveClaim(claimId, {
        pickupLocation: 'Central Campus Security Desk, Wilson Hall Rm 102',
        adminNotes: 'Verified via blind ownership protocol and authorized by Officer Vance.'
      });
      await loadDashboard();
      if (onViewRecoveryCase && res.recoveryCase) {
        onViewRecoveryCase(res.recoveryCase);
      }
    } catch (err: any) {
      alert(err.message || 'Error approving claim');
    } finally {
      setProcessingClaim(null);
    }
  };

  const handleRejectClaim = async (claimId: string) => {
    const reason = prompt('Reason for rejection:', 'Divergent ownership answers and risk anomaly');
    if (!reason) return;
    setProcessingClaim(claimId);
    try {
      await api.rejectClaim(claimId, reason);
      await loadDashboard();
    } catch (err: any) {
      alert(err.message || 'Error rejecting claim');
    } finally {
      setProcessingClaim(null);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[450px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 dark:border-sky-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono text-blue-600 dark:text-sky-400">LOADING COMMAND CENTER TELEMETRY...</span>
        </div>
      </div>
    );
  }

  const { stats, topMatches = [], claimsReview = [], fraudAlerts = [] } = data;

  return (
    <div className="space-y-6 w-full pb-12">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-[#26262e] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="rose" className="font-mono">
              CAMPUS SECURITY &amp; VERIFICATION
            </Badge>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">AUTONOMOUS AUDIT MODE</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white mt-1">Admin Command Center</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Real-time multi-agent triage, fraud anomaly inspection, and secure custody authorization.
          </p>
        </div>

        <button 
          onClick={loadDashboard}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-[#141418] hover:bg-zinc-200 dark:hover:bg-[#1a1a20] border border-zinc-200 dark:border-[#26262e] text-xs text-zinc-700 dark:text-zinc-300 font-mono transition-all active:scale-95 cursor-pointer shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard title="REPORTED LOST" value={stats.totalLost} icon={<Layers className="w-5 h-5" />} color="blue" />
        <StatCard title="REPORTED FOUND" value={stats.totalFound} icon={<Sparkles className="w-5 h-5" />} color="emerald" />
        <StatCard title="AI MATCHES" value={stats.aiMatches} icon={<Sparkles className="w-5 h-5" />} color="indigo" />
        <StatCard title="PENDING CLAIMS" value={stats.pendingClaims} icon={<Clock className="w-5 h-5" />} color="amber" />
        <StatCard title="RECOVERED" value={stats.recovered} icon={<CheckCircle2 className="w-5 h-5" />} color="emerald" />
        <StatCard title="RECOVERY RATE" value={`${stats.recoveryRate}%`} icon={<TrendingUp className="w-5 h-5" />} color="purple" />
      </div>

      {/* 1-Time Code Custody & Search Closure Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#141418] border border-blue-200 dark:border-blue-900/30 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-[#26262e] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-sky-400 flex items-center justify-center font-bold">
              🔑
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase font-mono tracking-wider">
                Close Item Search by 1-Time Code
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                When the owner collects their lost item, verify the secret 1-time code they recite to officially close the search.
              </p>
            </div>
          </div>
          <Badge variant="blue" className="font-mono text-[10px]">
            ZERO-LEAK VERIFICATION
          </Badge>
        </div>

        <form onSubmit={handleVerifyAndClose} className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            value={closeCodeInput}
            onChange={(e) => setCloseCodeInput(e.target.value.toUpperCase())}
            placeholder="ENTER 1-TIME CODE RECITED BY STUDENT (e.g. FND-AB123)"
            className="flex-1 w-full text-xs font-mono font-bold tracking-widest bg-zinc-50 dark:bg-[#0b0b0e] border border-zinc-200 dark:border-[#2e2e38] rounded-xl px-4 py-3 text-zinc-900 dark:text-white uppercase placeholder:normal-case placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            type="submit"
            disabled={closeCodeLoading || !closeCodeInput.trim()}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-sky-500 dark:hover:bg-sky-400 text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{closeCodeLoading ? 'Verifying Code...' : 'Verify Code & Close Search'}</span>
          </button>
        </form>

        {closeCodeResult && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-xs text-emerald-800 dark:text-[#4ade80] flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold">{closeCodeResult.message}</div>
              <div className="font-mono text-[11px] text-emerald-700 dark:text-emerald-300">
                Item: {closeCodeResult.item?.title} • Category: {closeCodeResult.item?.category} • Status: {closeCodeResult.item?.status}
              </div>
            </div>
          </div>
        )}

        {closeCodeError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-xs text-rose-700 dark:text-[#fb7185] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{closeCodeError}</span>
          </div>
        )}
      </div>

      {/* Telegram Campus Bot & Group Hub Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#141418] border border-indigo-200 dark:border-indigo-900/30 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-[#26262e] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase font-mono tracking-wider">
                  Telegram Campus Bot &amp; Group Hub (@{telegramStatus?.botUsername || 'findoravsb_bot'})
                </h3>
                <Badge variant={telegramStatus?.connected ? 'emerald' : 'blue'} className="text-[10px] font-mono">
                  {telegramStatus?.mode || 'SIMULATION'}
                </Badge>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Official Campus Community Group admin &amp; student 1-on-1 private bot for visual alerts and zero-leak handover.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://t.me/+V_U9BauJqKQ2NzE1"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-xs font-bold transition-all"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Campus Group</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>

            <a
              href={`https://t.me/${telegramStatus?.botUsername || 'findoravsb_bot'}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 text-xs font-bold transition-all"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Personal Bot</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          </div>
        </div>

        {/* Status Metrics & Broadcast Trigger */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#101014] border border-zinc-200/80 dark:border-[#26262e] flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono">Active Campus Groups</span>
              <div className="text-lg font-bold text-zinc-900 dark:text-white font-mono">
                {telegramStatus?.groupsCount || 0} Group(s)
              </div>
            </div>
            <Users className="w-5 h-5 text-indigo-500/60" />
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#101014] border border-zinc-200/80 dark:border-[#26262e] flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono">Subscribed Students</span>
              <div className="text-lg font-bold text-zinc-900 dark:text-white font-mono">
                {telegramStatus?.subscribersCount || 0} Member(s)
              </div>
            </div>
            <Bot className="w-5 h-5 text-sky-500/60" />
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#101014] border border-zinc-200/80 dark:border-[#26262e] flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono">Group Broadcast Trigger</span>
              <div>
                <button
                  onClick={handleBroadcastSummary}
                  disabled={telegramBroadcastLoading}
                  className="mt-1 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold font-mono transition-all disabled:opacity-50 cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                >
                  <Send className="w-3 h-3" />
                  <span>{telegramBroadcastLoading ? 'Dispatching...' : 'Broadcast /summary'}</span>
                </button>
              </div>
            </div>
            <Radio className="w-5 h-5 text-emerald-500/60 animate-pulse" />
          </div>
        </div>

        {telegramBroadcastSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-xs text-emerald-800 dark:text-[#4ade80] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{telegramBroadcastSuccess}</span>
          </div>
        )}

        {/* Live Interactive Command Simulator */}
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#101014] border border-zinc-200/80 dark:border-[#26262e] space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-xs font-bold text-zinc-900 dark:text-white font-mono uppercase tracking-wider">
                Interactive Telegram Command Console
              </span>
            </div>

            {/* Chat Type Mode Switch */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-zinc-400">Context:</span>
              <button
                type="button"
                onClick={() => setTelegramSimType('supergroup')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${telegramSimType === 'supergroup' ? 'bg-indigo-600 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}
              >
                👥 Campus Group
              </button>
              <button
                type="button"
                onClick={() => setTelegramSimType('private')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${telegramSimType === 'private' ? 'bg-indigo-600 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}
              >
                👤 Personal Student
              </button>
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
            <span className="text-zinc-400 text-xs mr-1 self-center">Presets:</span>
            {['/summary', '/lost', '/found', '/report', '/status item_1790668204284', '/code item_1790668204284'].map((cmd) => (
              <button
                key={cmd}
                type="button"
                onClick={() => setTelegramSimInput(cmd)}
                className="px-2 py-0.5 rounded bg-white dark:bg-[#1a1a20] border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-indigo-400 cursor-pointer text-[10px]"
              >
                {cmd}
              </button>
            ))}
          </div>

          <form onSubmit={handleSimulateCommand} className="flex gap-2">
            <input
              type="text"
              value={telegramSimInput}
              onChange={(e) => setTelegramSimInput(e.target.value)}
              placeholder="e.g. /summary, /lost, /status <id>, /code <id>"
              className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-[#141418] border border-zinc-200 dark:border-[#26262e] text-xs font-mono text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
            />
            <button
              type="submit"
              disabled={telegramSimLoading}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold font-mono transition-all disabled:opacity-50 cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{telegramSimLoading ? 'Simulating...' : 'Run Command'}</span>
            </button>
          </form>

          {/* Simulation Output */}
          {telegramSimReplies && telegramSimReplies.length > 0 && (
            <div className="mt-3 p-3.5 rounded-xl bg-zinc-900 text-zinc-100 font-mono text-xs space-y-3 overflow-x-auto max-h-80 overflow-y-auto border border-zinc-800">
              <div className="text-[10px] text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-1 flex items-center justify-between">
                <span>Bot Responses ({telegramSimReplies.length})</span>
                <span className="text-emerald-400">Context: {telegramSimType}</span>
              </div>
              {telegramSimReplies.map((r, i) => (
                <div key={i} className="space-y-1.5 pb-2 border-b border-zinc-800/50 last:border-0">
                  {r.photo && (
                    <div className="text-[11px] text-indigo-400 flex items-center gap-1">
                      <span>🖼️ Attached Image Source:</span>
                      <span className="underline truncate">{r.photo}</span>
                    </div>
                  )}
                  <pre className="whitespace-pre-wrap font-sans text-xs text-zinc-200 leading-relaxed">
                    {r.text}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Claims Review Queue & Fraud Shield Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left (8 cols): Pending Claims Review Queue */}
        <div className="lg:col-span-8 p-5 rounded-2xl bg-white dark:bg-[#141418] border border-zinc-200/90 dark:border-[#26262e] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-[#26262e] pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600 dark:text-sky-400" />
              Ownership Claims Review Queue ({claimsReview.length})
            </h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">Requires Officer Approval</span>
          </div>

          <div className="space-y-3">
            {claimsReview.length === 0 ? (
              <p className="text-xs text-zinc-400 py-6 text-center">No pending claims currently in queue.</p>
            ) : (
              claimsReview.map((claim: any) => (
                <div 
                  key={claim.id} 
                  className="p-4 rounded-xl bg-zinc-50 dark:bg-[#101014] border border-zinc-200/80 dark:border-[#26262e] hover:border-zinc-300 dark:hover:border-zinc-600 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white">{claim.found_title}</span>
                      <Badge variant={claim.status === 'APPROVED' ? 'emerald' : claim.status === 'UNDER_REVIEW' ? 'blue' : 'amber'}>
                        {claim.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-zinc-400" />
                        {claim.claimant_name} ({claim.claimant_email})
                      </span>
                      <span>•</span>
                      <span>Location: {claim.building}</span>
                    </div>

                    {/* Verification and Risk Indicators */}
                    <div className="flex items-center gap-3 pt-1 text-[11px] font-mono">
                      <span className="text-emerald-700 dark:text-[#4ade80] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Verification: {Math.round((claim.verification_score ?? 0) * 100)}%
                      </span>
                      <span>•</span>
                      <span className={`font-semibold flex items-center gap-1 ${
                        claim.risk_level === 'HIGH' ? 'text-rose-600 dark:text-[#fb7185]' : claim.risk_level === 'MEDIUM' ? 'text-amber-600 dark:text-[#fde047]' : 'text-zinc-600 dark:text-zinc-300'
                      }`}>
                        <Shield className="w-3 h-3" />
                        Risk: {claim.risk_score ?? 0}/100 ({claim.risk_level || 'LOW'})
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {claim.status !== 'APPROVED' ? (
                      <>
                        <button
                          onClick={() => handleApproveClaim(claim.id)}
                          disabled={processingClaim === claim.id}
                          className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-600" />
                          <span>Approve Claim</span>
                        </button>
                        <button
                          onClick={() => handleRejectClaim(claim.id)}
                          disabled={processingClaim === claim.id}
                          className="p-1.5 rounded-xl bg-zinc-200/80 dark:bg-zinc-800 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-zinc-500 dark:text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <Badge variant="emerald" className="font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Authorized
                      </Badge>
                    )}
                  </div>

                </div>
              ))
            )}
          </div>
        </div>

        {/* Right (4 cols): Active Fraud Shield Alerts & Top Matches */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Fraud Alerts Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#141418] border border-rose-200 dark:border-rose-900/30 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-[#26262e] pb-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-[#fb7185] flex items-center gap-2 font-mono">
                <AlertTriangle className="w-4 h-4" /> Fraud Shield Alerts
              </h2>
              <Badge variant="rose" className="text-[10px] font-mono">ACTIVE</Badge>
            </div>

            <div className="space-y-3">
              {fraudAlerts.length === 0 ? (
                <p className="text-xs text-zinc-400 py-3 text-center">No active anomalies detected.</p>
              ) : (
                fraudAlerts.map((alert: any) => (
                  <div key={alert.id} className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-rose-900 dark:text-[#fb7185]">{alert.claimant_name}</span>
                      <span className="font-mono text-rose-700 dark:text-[#fb7185] text-[11px] font-bold">RISK: {alert.risk_score}/100</span>
                    </div>
                    <div className="space-y-1">
                      {(alert.reasons || []).map((r: string, i: number) => (
                        <div key={i} className="text-[11px] text-rose-800 dark:text-[#fb7185]/90 flex items-start gap-1.5">
                          <span className="text-rose-500">•</span>
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Ranked AI Matches Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#141418] border border-zinc-200/90 dark:border-[#26262e] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-[#26262e] pb-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2 font-mono">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-sky-400" /> Top AI Matches
              </h2>
            </div>

            <div className="space-y-2.5">
              {topMatches.map((m: any) => (
                <div 
                  key={m.id} 
                  onClick={() => onInspectMatch && onInspectMatch(m.id)}
                  className="p-2.5 rounded-xl bg-zinc-50 dark:bg-[#101014] border border-zinc-200/80 dark:border-[#26262e] hover:border-zinc-300 dark:hover:border-zinc-600 transition-all cursor-pointer flex items-center justify-between text-xs"
                >
                  <div className="truncate pr-2">
                    <div className="font-semibold text-zinc-900 dark:text-white truncate">{m.lost_title}</div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">↔ {m.found_title}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="blue" className="font-mono font-bold">
                      {Math.round(m.final_score * 100)}%
                    </Badge>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
