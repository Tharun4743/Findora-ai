import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  MapPin, 
  Clock, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { Badge } from './ui/Primitives';

export interface MatchHeroViewProps {
  onStartClaim: (matchData: any) => void;
  onSelectOtherMatch?: (id: string) => void;
  activeMatchId?: string | null;
}

export default function MatchHeroView({ 
  onStartClaim, 
  onSelectOtherMatch: _onSelectOtherMatch, 
  activeMatchId = null 
}: MatchHeroViewProps) {
  const [matchData, setMatchData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showSliders, setShowSliders] = useState<boolean>(false);
  const [allMatches, setAllMatches] = useState<any[]>([]);

  // Configurable weights
  const [weights, setWeights] = useState<Record<string, number>>({
    image: 30,
    text: 25,
    location: 15,
    time: 10,
    category: 10,
    attributes: 10
  });

  useEffect(() => {
    loadMatchData(activeMatchId);
    api.getMatches().then(res => {
      if (res.matches) setAllMatches(res.matches);
    }).catch(console.error);
  }, [activeMatchId]);

  const loadMatchData = async (matchId: string | null) => {
    setLoading(true);
    try {
      let targetId = matchId;
      if (!targetId) {
        const res = await api.getMatches();
        if (res.matches && res.matches.length > 0) {
          setAllMatches(res.matches);
          targetId = res.matches[0].id;
        }
      }
      if (!targetId) {
        setMatchData(null);
        return;
      }
      const data = await api.getMatch(targetId);
      setMatchData(data);
    } catch (err) {
      console.error(err);
      setMatchData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleWeightChange = (key: string, val: string | number) => {
    const newWeights = { ...weights, [key]: Number(val) };
    setWeights(newWeights);
  };

  // Dynamically calculate final score based on sliders
  const calculateDynamicScore = () => {
    if (!matchData?.match) return 0;
    const m = matchData.match;
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0) || 100;
    const raw = (
      (m.visual_score * (weights.image / 100)) +
      (m.text_score * (weights.text / 100)) +
      (m.location_score * (weights.location / 100)) +
      (m.time_score * (weights.time / 100)) +
      (m.category_score * (weights.category / 100)) +
      (m.attribute_score * (weights.attributes / 100))
    ) * (100 / totalWeight);

    return Math.min(Math.max(Math.round(raw * 100), 0), 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-blue-600 dark:border-sky-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono text-blue-600 dark:text-sky-400 tracking-wider">RETRIEVING MULTIMODAL CANDIDATES...</span>
        </div>
      </div>
    );
  }

  if (!matchData) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-white dark:bg-[#141418] border border-zinc-200/90 dark:border-[#26262e] shadow-xs my-8 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-sky-400 flex items-center justify-center">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">No AI Match Pairs Active</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md">
          There are currently no active AI matches generated. Submit lost or found reports in the registry to trigger real-time multimodal matching.
        </p>
      </div>
    );
  }

  const { match, lost_item, found_item } = matchData;
  const dynamicScore = calculateDynamicScore();

  const signals = [
    { label: 'VISUAL SIMILARITY', score: Math.round(match.visual_score * 100), weight: weights.image, color: 'bg-blue-600 dark:bg-sky-400' },
    { label: 'DESCRIPTION SEMANTICS', score: Math.round(match.text_score * 100), weight: weights.text, color: 'bg-indigo-600 dark:bg-purple-400' },
    { label: 'LOCATION PROXIMITY', score: Math.round(match.location_score * 100), weight: weights.location, color: 'bg-emerald-600 dark:bg-emerald-400' },
    { label: 'TIME COMPATIBILITY', score: Math.round(match.time_score * 100), weight: weights.time, color: 'bg-amber-500 dark:bg-amber-400' },
    { label: 'ATTRIBUTE COINCIDENCE', score: Math.round(match.attribute_score * 100), weight: weights.attributes, color: 'bg-purple-600 dark:bg-purple-400' },
  ];

  return (
    <div className="space-y-6 w-full pb-12">
      
      {/* Top Banner / Match Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#141418] border border-zinc-200/90 dark:border-[#26262e] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="blue" className="text-[11px] font-mono">
              <Sparkles className="w-3 h-3" /> MULTIMODAL MATCH
            </Badge>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">ID: {match.id}</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white mt-1">
            AI Match Intelligence Console
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Explainable multimodal matching with cross-entropy feature alignment &amp; spatial-temporal decay.
          </p>
        </div>

        {/* Alternate Matches Selector */}
        <div className="flex items-center gap-2">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono hidden md:block">Switch Match Pair:</div>
          <select 
            value={match.id} 
            onChange={(e) => loadMatchData(e.target.value)}
            className="text-xs bg-zinc-50 dark:bg-[#1a1a20] text-zinc-900 dark:text-white border border-zinc-200 dark:border-[#26262e] rounded-xl px-3 py-2 font-mono focus:outline-none"
          >
            {allMatches.map(m => (
              <option key={m.id} value={m.id}>
                {m.lost_title} ↔ {m.found_title} ({Math.round(m.final_score * 100)}%)
              </option>
            ))}
          </select>
          
          <button
            onClick={() => setShowSliders(!showSliders)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-mono transition-all active:scale-95 cursor-pointer ${
              showSliders 
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-sky-300 border-blue-200 dark:border-blue-500/30' 
                : 'bg-zinc-100 dark:bg-[#1a1a20] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-[#26262e] hover:bg-zinc-200 dark:hover:bg-[#202028]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Weights</span>
          </button>
        </div>
      </div>

      {/* Dynamic Weight Sliders Drawer */}
      {showSliders && (
        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-[#101014] border border-zinc-200 dark:border-[#26262e] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {Object.entries(weights).map(([k, v]) => (
            <div key={k} className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono text-zinc-700 dark:text-zinc-300 uppercase font-bold">
                <span>{k}</span>
                <span className="text-blue-600 dark:text-sky-400">{v}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={v}
                onChange={(e) => handleWeightChange(k, e.target.value)}
                className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-sky-400"
              />
            </div>
          ))}
        </div>
      )}

      {/* Side-by-Side Comparison Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left: Lost Item Card */}
        <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#141418] border border-zinc-200/90 dark:border-[#26262e] p-5 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-600 transition-all shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-3">
              <Badge variant="blue">LOST ITEM REPORT</Badge>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono flex items-center gap-1">
                <Clock className="w-3 h-3" /> {lost_item.event_time ? new Date(lost_item.event_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Time Logged'}
              </span>
            </div>

            {/* Image Preview */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-100 dark:bg-[#0b0b0e] border border-zinc-200 dark:border-[#26262e] mb-4 group">
              {lost_item.image ? (
                <img 
                  src={lost_item.image} 
                  alt={lost_item.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e: any) => { e.target.style.display='none'; if (e.target.nextSibling) e.target.nextSibling.style.display='flex'; }}
                />
              ) : null}
              <div style={{ display: lost_item.image ? 'none' : 'flex' }}
                className="w-full h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-[#0f0f14] dark:to-[#1a1a22]">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-zinc-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-600 font-mono">NO PHOTO SUBMITTED</span>
              </div>
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono text-sky-400 border border-white/10">
                Visual Hash: {lost_item?.id ? `VEC_${lost_item.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}` : 'VEC_SYNC'}
              </div>
            </div>

            <h3 className="text-lg font-bold text-zinc-900 dark:text-white leading-snug">{lost_item.title}</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">{lost_item.description}</p>

            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-zinc-100 dark:border-[#26262e] text-xs">
              <div>
                <span className="text-zinc-500 dark:text-zinc-400 text-[11px] block uppercase tracking-wider font-bold">Category &amp; Brand</span>
                <span className="font-semibold text-zinc-900 dark:text-white">{lost_item.category} • {lost_item.brand}</span>
              </div>
              <div>
                <span className="text-zinc-500 dark:text-zinc-400 text-[11px] block uppercase tracking-wider font-bold">Reported Location</span>
                <span className="font-semibold text-zinc-900 dark:text-white flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-blue-600 dark:text-sky-400 shrink-0" /> {lost_item.location}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-2.5 rounded-xl bg-zinc-50 dark:bg-[#101014] border border-zinc-200/80 dark:border-[#26262e] text-[11px] text-zinc-600 dark:text-zinc-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-[#4ade80] shrink-0" />
            <span>Private ownership characteristics encrypted in vault.</span>
          </div>
        </div>

        {/* Center: Dynamic Circular AI Match Gauge */}
        <div className="lg:col-span-2 flex flex-col items-center justify-center py-6 lg:py-0">
          <div className="relative flex flex-col items-center justify-center">
            
            {/* Outer Glow Halo */}
            <div className="w-36 h-36 rounded-full bg-blue-500/10 dark:bg-sky-500/15 absolute -inset-2 blur-xl animate-pulse"></div>

            {/* Circular Gauge Ring */}
            <div className="relative w-32 h-32 rounded-full bg-white dark:bg-[#0b0b0e] border-4 border-zinc-100 dark:border-[#26262e] flex flex-col items-center justify-center shadow-lg p-2">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="6" className="text-zinc-200 dark:text-zinc-800" fill="transparent" />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="42" 
                  stroke="currentColor" 
                  strokeWidth="6" 
                  strokeDasharray="264"
                  strokeDashoffset={264 - (264 * (dynamicScore / 100))}
                  strokeLinecap="round"
                  className="text-blue-600 dark:text-sky-400 transition-all duration-700 ease-out" 
                  fill="transparent" 
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white font-mono">
                  {dynamicScore}%
                </span>
                <span className="text-[9px] uppercase tracking-widest font-mono font-bold text-blue-600 dark:text-sky-400">
                  AI MATCH
                </span>
              </div>
            </div>

            <div className="mt-3 text-center">
              <Badge variant="emerald" className="font-mono">
                HIGH CONFIDENCE
              </Badge>
            </div>
          </div>
        </div>

        {/* Right: Found Item Card */}
        <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#141418] border border-zinc-200/90 dark:border-[#26262e] p-5 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-600 transition-all shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-3">
              <Badge variant="emerald">FOUND ITEM REPORT</Badge>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono flex items-center gap-1">
                <Clock className="w-3 h-3" /> {found_item.event_time ? new Date(found_item.event_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Time Logged'}
              </span>
            </div>

            {/* Image Preview */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-100 dark:bg-[#0b0b0e] border border-zinc-200 dark:border-[#26262e] mb-4 group">
              {found_item.image ? (
                <img 
                  src={found_item.image} 
                  alt={found_item.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e: any) => { e.target.style.display='none'; if (e.target.nextSibling) e.target.nextSibling.style.display='flex'; }}
                />
              ) : null}
              <div style={{ display: found_item.image ? 'none' : 'flex' }}
                className="w-full h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-[#0f0f14] dark:to-[#1a1a22]">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-zinc-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-600 font-mono">NO PHOTO SUBMITTED</span>
              </div>
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono text-emerald-400 border border-white/10">
                Condition: {found_item.condition || 'Operational'}
              </div>
            </div>

            <h3 className="text-lg font-bold text-zinc-900 dark:text-white leading-snug">{found_item.title}</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">{found_item.description}</p>

            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-zinc-100 dark:border-[#26262e] text-xs">
              <div>
                <span className="text-zinc-500 dark:text-zinc-400 text-[11px] block uppercase tracking-wider font-bold">Category &amp; Brand</span>
                <span className="font-semibold text-zinc-900 dark:text-white">{found_item.category} • {found_item.brand}</span>
              </div>
              <div>
                <span className="text-zinc-500 dark:text-zinc-400 text-[11px] block uppercase tracking-wider font-bold">Turned In At</span>
                <span className="font-semibold text-zinc-900 dark:text-white flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" /> {found_item.location}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-2.5 rounded-xl bg-zinc-50 dark:bg-[#101014] border border-zinc-200/80 dark:border-[#26262e] text-[11px] text-zinc-600 dark:text-zinc-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" />
            <span>Blind verification required before sensitive details unlocked.</span>
          </div>
        </div>

      </div>

      {/* Multimodal Score Breakdown Progress Bars */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#141418] border border-zinc-200/90 dark:border-[#26262e] shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-[#26262e] pb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-sky-400" /> Multimodal Alignment Breakdown
          </h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">Configurable Weights Enforced</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {signals.map((sig) => (
            <div key={sig.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-700 dark:text-zinc-300 font-mono tracking-wide font-medium">{sig.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">({sig.weight}% wt)</span>
                  <span className="font-bold text-zinc-900 dark:text-white font-mono">{sig.score}%</span>
                </div>
              </div>
              <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${sig.color} rounded-full transition-all duration-700 ease-out`}
                  style={{ width: `${sig.score}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Why This Match? Narrative & Evidence Badges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Grounded Evidence Checklist */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#141418] border border-zinc-200/90 dark:border-[#26262e] shadow-xs space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-[#4ade80] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Why This Match? Grounded Evidence
          </h2>
          <p className="text-xs text-zinc-700 dark:text-zinc-200 leading-relaxed italic bg-zinc-50 dark:bg-[#101014] p-3 rounded-xl border border-zinc-200/80 dark:border-[#26262e]">
            "{match.explanation?.why || 'Multimodal correlation detected across visual, textual, and spatial telemetry.'}"
          </p>

          <div className="space-y-2 pt-2">
            {(match.explanation?.evidence || []).map((ev: string, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-[#4ade80] shrink-0 mt-0.5" />
                <span className="leading-snug">{ev}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hard Negative Protection & Uncertainty Factors */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#141418] border border-zinc-200/90 dark:border-[#26262e] shadow-xs space-y-3 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-700 dark:text-[#fde047] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Technical Uncertainty &amp; Hard Negative Guard
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mt-1">
              Findora does not assume "same category = same item". The following flags protect against false positive handover:
            </p>

            <div className="space-y-2 mt-3">
              {(match.explanation?.uncertainty || []).map((un: string, i: number) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 text-xs text-amber-800 dark:text-[#fde047]">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-[#fde047] shrink-0 mt-0.5" />
                  <span className="leading-snug">{un}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Core Call to Action */}
          <div className="pt-4 border-t border-zinc-100 dark:border-[#26262e]">
            <button
              onClick={() => onStartClaim(matchData)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 font-bold text-xs sm:text-sm shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Start Secure Blind Claim</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[10px] text-center text-zinc-400 dark:text-zinc-500 mt-2 font-mono">
              Private ownership challenge questions will be presented without revealing sensitive details.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
