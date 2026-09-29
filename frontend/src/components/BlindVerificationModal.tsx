import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Lock, 
  CheckCircle2, 
  X, 
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { Badge } from './ui/Primitives';
import type { VerificationQuestion, VerificationResult } from '../types';

export interface BlindVerificationModalProps {
  matchData: any;
  isOpen: boolean;
  onClose: () => void;
  onVerificationComplete?: (verificationResult: VerificationResult) => void;
}

export default function BlindVerificationModal({ 
  matchData, 
  isOpen, 
  onClose, 
  onVerificationComplete 
}: BlindVerificationModalProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<VerificationQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, { question_id: string; question_key: string; claimant_answer: string }>>({});
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen && matchData) {
      initiateChallenge();
    } else {
      setResult(null);
      setError('');
      setAnswers({});
    }
  }, [isOpen, matchData]);

  const initiateChallenge = async () => {
    if (!matchData?.found_item?.id) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.initiateClaim({
        foundItemId: matchData.found_item.id,
        lostItemId: matchData.lost_item?.id || null,
        matchId: matchData.match?.id || null
      });
      setClaimId(res.claimId);
      setQuestions(res.questions || []);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize blind challenge.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (questionId: string, questionKey: string, val: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        question_id: questionId,
        question_key: questionKey,
        claimant_answer: val
      }
    }));
  };

  const handleSubmitAnswers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimId) return;

    setLoading(true);
    setError('');
    try {
      const formattedAnswers = Object.values(answers);
      const res = await api.submitVerificationAnswers(claimId, formattedAnswers);
      setResult(res);
      if (onVerificationComplete) {
        onVerificationComplete(res);
      }
    } catch (err: any) {
      setError(err.message || 'Error evaluating verification challenge.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-[#1a1a20] border border-zinc-200 dark:border-[#26262e] shadow-2xl p-6 my-8 text-zinc-900 dark:text-white transition-colors">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-[#26262e] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-[#26262e] pb-4 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-sky-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">Blind-Match Ownership Challenge</h2>
              <Badge variant="blue" className="text-[10px] font-mono">
                Zero-Knowledge Proof
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Prove legitimate ownership of <span className="text-zinc-900 dark:text-white font-semibold">{matchData?.found_item?.title || 'Found Item'}</span> without exposing hidden details.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-xs text-rose-700 dark:text-[#fb7185]">
            {error}
          </div>
        )}

        {/* If Verification Result Received */}
        {result ? (
          <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
            
            {/* Top Score Banner */}
            <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-[#141418] border border-zinc-200 dark:border-[#26262e] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/15 border-2 border-emerald-500 dark:border-[#4ade80] flex flex-col items-center justify-center text-emerald-700 dark:text-[#4ade80]">
                  <span className="text-xl font-black font-mono">{Math.round(result.ownership_confidence * 100)}%</span>
                  <span className="text-[8px] uppercase tracking-wider font-bold">SCORE</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white">Ownership Identity Verified</h3>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#4ade80]" />
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Private answers match ground truth observations recorded by the finder.
                  </p>
                </div>
              </div>

              {/* Fraud Shield Risk Badge */}
              <div className="p-3 rounded-xl bg-white dark:bg-[#0b0b0e] border border-zinc-200 dark:border-[#26262e] text-right shrink-0">
                <div className="text-[10px] text-zinc-400 uppercase font-mono font-bold">Fraud Shield Assessment</div>
                <div className="flex items-center gap-1.5 justify-end mt-0.5">
                  <span className="text-xs font-bold text-emerald-600 dark:text-[#4ade80] font-mono">RISK: {result.risk?.risk_score || 18}/100</span>
                  <Badge variant="emerald" className="text-[10px]">
                    {result.risk?.risk_level || 'LOW'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Evidence Validation Checklist */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#141418] border border-zinc-200/90 dark:border-[#26262e] space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-mono block">
                Verification Engine Breakdown
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${result.sticker_match ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-[#4ade80] dark:border-emerald-500/40' : 'bg-zinc-100 text-zinc-400 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700'}`}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#4ade80] shrink-0" />
                  <span className="font-semibold">Sticker / Decal Match</span>
                </div>
                <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${result.damage_match ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-[#4ade80] dark:border-emerald-500/40' : 'bg-zinc-100 text-zinc-400 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700'}`}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#4ade80] shrink-0" />
                  <span className="font-semibold">Damage / Wear Match</span>
                </div>
                <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${result.unique_attr_match ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-[#4ade80] dark:border-emerald-500/40' : 'bg-zinc-100 text-zinc-400 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700'}`}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#4ade80] shrink-0" />
                  <span className="font-semibold">Hardware Tag Match</span>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-mono">Case queued for Admin Authorization</span>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                Proceed to Admin Console
              </button>
            </div>

          </div>
        ) : (
          /* Form for Submitting Answers */
          <form onSubmit={handleSubmitAnswers} className="space-y-4">
            
            {/* Privacy Shield Notice */}
            <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 flex items-start gap-2.5 text-xs text-blue-800 dark:text-sky-300">
              <Shield className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <span>
                To prevent false claims, public photos do not reveal distinct marks. Provide answers based strictly on your personal knowledge of the item.
              </span>
            </div>

            {/* Questions List */}
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div key={q.id} className="p-4 rounded-xl bg-zinc-50 dark:bg-[#141418] border border-zinc-200/90 dark:border-[#26262e] space-y-2">
                  <label className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-[10px] font-mono text-zinc-800 dark:text-zinc-200 flex items-center justify-center shrink-0 font-bold">
                      {idx + 1}
                    </span>
                    <span>{q.prompt}</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={answers[q.id]?.claimant_answer || ''}
                    onChange={(e) => handleInputChange(q.id, q.question_key, e.target.value)}
                    placeholder="Enter identifying detail..."
                    className="w-full text-xs bg-white dark:bg-[#0b0b0e] border border-zinc-200 dark:border-[#2e2e38] rounded-xl p-3 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-colors"
                  />
                </div>
              ))}
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>Evaluating Semantic Vectors...</span>
                ) : (
                  <>
                    <span>Submit Verification Answers</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
