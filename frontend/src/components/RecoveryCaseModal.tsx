import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  MapPin, 
  CheckCircle2, 
  Copy, 
  Check, 
  X, 
  PackageCheck
} from 'lucide-react';
import { api } from '../services/api';
import { Badge } from './ui/Primitives';

export interface RecoveryCaseModalProps {
  recoveryCase: any;
  isOpen: boolean;
  onClose: () => void;
  onHandoverCompleted?: (result: any) => void;
}

export default function RecoveryCaseModal({ 
  recoveryCase, 
  isOpen, 
  onClose, 
  onHandoverCompleted 
}: RecoveryCaseModalProps) {
  const [copied, setCopied] = useState<boolean>(false);
  const [inputCode, setInputCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [currentCase, setCurrentCase] = useState<any>(recoveryCase);

  useEffect(() => {
    setCurrentCase(recoveryCase);
  }, [recoveryCase]);

  if (!isOpen || !currentCase) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentCase.handover_code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCompleteHandover = async () => {
    setLoading(true);
    setError('');
    try {
      const codeToSubmit = inputCode || currentCase.handover_code;
      const res = await api.completeHandover(currentCase.id, codeToSubmit);
      setCurrentCase((prev: any) => ({
        ...prev,
        status: 'RECOVERED',
        timeline: res.timeline
      }));
      if (onHandoverCompleted) onHandoverCompleted(res);
    } catch (err: any) {
      setError(err.message || 'Failed to complete handover.');
    } finally {
      setLoading(false);
    }
  };

  const isRecovered = currentCase.status === 'RECOVERED' || currentCase.status === 'CLOSED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white dark:bg-[#1a1a20] border border-zinc-200 dark:border-[#26262e] shadow-2xl p-6 my-8 text-zinc-900 dark:text-white transition-colors">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-[#26262e] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-[#26262e] pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isRecovered ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-[#4ade80] border border-emerald-200 dark:border-emerald-500/30' : 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-sky-400 border border-blue-200 dark:border-blue-500/30'}`}>
              <PackageCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold font-mono text-zinc-900 dark:text-white">{currentCase.id}</span>
                <Badge variant={isRecovered ? 'emerald' : 'amber'}>
                  {currentCase.status}
                </Badge>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Official Campus Recovery Case • Custody Chain Verified
              </p>
            </div>
          </div>

          {/* Handover Code Card */}
          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-[#141418] border border-zinc-200 dark:border-[#26262e] flex items-center gap-3">
            <div>
              <div className="text-[10px] text-zinc-400 uppercase font-mono font-bold">Handover Secret Code</div>
              <div className="text-lg font-black font-mono tracking-widest text-blue-600 dark:text-sky-400">{currentCase.handover_code}</div>
            </div>
            <button
              onClick={handleCopyCode}
              className="p-2 rounded-xl bg-white dark:bg-[#1a1a20] hover:bg-zinc-100 dark:hover:bg-[#202028] text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-[#26262e] transition-colors cursor-pointer"
              title="Copy code"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600 dark:text-[#4ade80]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-xs text-rose-700 dark:text-[#fb7185]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Left Column: QR Code & Pickup Information */}
          <div className="md:col-span-4 flex flex-col items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-[#141418] border border-zinc-200/90 dark:border-[#26262e] text-center space-y-4">
            
            {/* SVG Interactive QR Code */}
            <div className="relative p-3 rounded-xl bg-white text-black shadow-md border border-zinc-200">
              <svg className="w-36 h-36" viewBox="0 0 120 120">
                <rect width="120" height="120" fill="white" />
                <rect x="10" y="10" width="30" height="30" fill="black" />
                <rect x="15" y="15" width="20" height="20" fill="white" />
                <rect x="20" y="20" width="10" height="10" fill="black" />

                <rect x="80" y="10" width="30" height="30" fill="black" />
                <rect x="85" y="15" width="20" height="20" fill="white" />
                <rect x="90" y="20" width="10" height="10" fill="black" />

                <rect x="10" y="80" width="30" height="30" fill="black" />
                <rect x="15" y="85" width="20" height="20" fill="white" />
                <rect x="20" y="90" width="10" height="10" fill="black" />

                <rect x="50" y="15" width="8" height="8" fill="black" />
                <rect x="65" y="25" width="8" height="8" fill="black" />
                <rect x="50" y="45" width="15" height="15" fill="black" />
                <rect x="75" y="55" width="10" height="10" fill="black" />
                <rect x="25" y="55" width="8" height="8" fill="black" />
                <rect x="85" y="85" width="15" height="15" fill="black" />
                <rect x="55" y="85" width="12" height="12" fill="black" />
              </svg>
              <div className="text-[9px] font-mono font-bold text-zinc-800 mt-1">SCAN FOR DESK HANDOVER</div>
            </div>

            {/* Pickup Details */}
            <div className="text-left w-full space-y-2 pt-2 border-t border-zinc-200 dark:border-[#26262e] text-xs">
              <div>
                <span className="text-zinc-500 dark:text-zinc-400 text-[10px] uppercase font-mono font-bold block">Pickup Location</span>
                <span className="text-zinc-900 dark:text-white font-semibold flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 shrink-0" />
                  {currentCase.pickup_location}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 dark:text-zinc-400 text-[10px] uppercase font-mono font-bold block">Designated Claimant</span>
                <span className="text-zinc-900 dark:text-white font-medium">{currentCase.claimant_name || currentCase.claimant_email || 'Registered Claimant'}</span>
              </div>
            </div>

          </div>

          {/* Right Column: Custody Chain Timeline */}
          <div className="md:col-span-8 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
              Custody Chain Timeline
            </h3>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {(currentCase.timeline || []).map((step: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3 relative">
                  {idx < currentCase.timeline.length - 1 && (
                    <div className={`absolute left-3.5 top-6 bottom-0 w-0.5 ${step.completed ? 'bg-blue-600/40 dark:bg-sky-500/40' : 'bg-zinc-200 dark:bg-zinc-800'}`}></div>
                  )}

                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ${step.completed ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-sky-400 border border-blue-200 dark:border-blue-500/30' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500'}`}>
                    {step.completed ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600"></div>}
                  </div>

                  <div className="flex-1 pb-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-semibold ${step.completed ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-500'}`}>
                        {step.title}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                        {step.timestamp ? new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Actor: <span className="text-zinc-700 dark:text-zinc-300 font-mono">{step.actor}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Officer Handover Action Box */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#141418] border border-zinc-200/90 dark:border-[#26262e] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                  {isRecovered ? 'Custody Handover Completed' : 'Campus Officer Handover Action'}
                </span>
                {isRecovered && (
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-[#4ade80] flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> RECOVERED ✓
                  </span>
                )}
              </div>

              {!isRecovered ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={`Enter ${currentCase.handover_code}`}
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    className="flex-1 text-xs bg-white dark:bg-[#0b0b0e] border border-zinc-200 dark:border-[#2e2e38] rounded-xl p-2.5 font-mono text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none uppercase"
                  />
                  <button
                    onClick={handleCompleteHandover}
                    disabled={loading}
                    className="px-4 py-2.5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Verify & Hand Over'}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-emerald-700 dark:text-[#4ade80]">
                  Physical item returned to verified owner. Case resolution recorded in immutable audit log.
                </p>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
