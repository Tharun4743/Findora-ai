import React, { useState } from 'react';
import { 
  Search, 
  X, 
  MapPin, 
  ArrowRight,
  Bot
} from 'lucide-react';
import { api } from '../services/api';
import { Badge } from './ui/Primitives';
import type { Item } from '../types';

export interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCandidate?: (item: Item) => void;
}

interface AssistantResponse {
  extractedParameters: {
    category: string;
    color: string;
    location: string;
  };
  results: Item[];
}

export default function AiAssistantModal({ isOpen, onClose, onSelectCandidate }: AiAssistantModalProps) {
  const [query, setQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<AssistantResponse | null>(null);

  if (!isOpen) return null;

  const searchCategories = ['Electronics', 'Bags', 'Keys', 'Accessories', 'Audio'];

  const handleSearch = async (queryString?: string) => {
    const q = queryString || query;
    if (!q.trim()) return;

    setLoading(true);
    try {
      const res = await api.queryAssistant(q);
      setResponse(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryFilter = (cat: string) => {
    setQuery(cat);
    handleSearch(cat);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-[#1a1a20] border border-zinc-200 dark:border-[#26262e] shadow-2xl p-6 my-8 text-zinc-900 dark:text-white space-y-5 transition-colors">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-[#26262e] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-[#26262e] pb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">Findora AI Search Assistant</h2>
              <Badge variant="blue" className="text-[10px] font-mono">
                Grounded NLP Engine
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Describe your lost item in natural plain English. The AI parses parameters and searches live records.
            </p>
          </div>
        </div>

        {/* Search Input Bar */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
          className="relative"
        >
          <Search className="w-4 h-4 text-blue-600 dark:text-sky-400 absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder="e.g. I lost my blue backpack near the library yesterday evening..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full text-xs bg-zinc-50 dark:bg-[#0b0b0e] border border-zinc-200 dark:border-[#2e2e38] rounded-xl pl-9 pr-24 py-3 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 font-mono"
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-2 top-2 px-3 py-1.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 font-bold text-xs font-mono shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'Parsing...' : 'Search'}
          </button>
        </form>

        {/* Quick Category Suggestions */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 font-bold">Search by Category:</span>
          <div className="flex flex-wrap gap-1.5">
            {searchCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryFilter(cat)}
                className="text-[11px] px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-[#141418] border border-zinc-200 dark:border-[#26262e] text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-500 transition-colors text-left cursor-pointer active:scale-95"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Results View */}
        {response && (
          <div className="space-y-4 pt-3 border-t border-zinc-100 dark:border-[#26262e] animate-in fade-in duration-300">
            
            {/* Extracted Parameters Card */}
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#141418] border border-zinc-200/90 dark:border-[#26262e] space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-zinc-400 dark:text-zinc-500 tracking-wider font-bold">
                Grounded Parameter Extraction:
              </span>
              <div className="flex flex-wrap gap-2 text-xs font-mono">
                <Badge variant="blue">Category: {response.extractedParameters.category}</Badge>
                <Badge variant="zinc">Color: {response.extractedParameters.color}</Badge>
                <Badge variant="emerald">Zone: {response.extractedParameters.location}</Badge>
              </div>
            </div>

            {/* Candidate Results */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {response.results.length === 0 ? (
                <p className="text-xs text-zinc-400 py-4 text-center">No grounded items matched your description.</p>
              ) : (
                response.results.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => {
                      if (onSelectCandidate) onSelectCandidate(item);
                      onClose();
                    }}
                    className="p-3 rounded-xl bg-zinc-50 dark:bg-[#141418] border border-zinc-200/80 dark:border-[#26262e] hover:border-zinc-300 dark:hover:border-zinc-600 cursor-pointer flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-12 h-10 rounded-lg object-cover bg-zinc-200 dark:bg-zinc-800 flex-shrink-0"
                          onError={(e: any) => { e.target.style.display='none'; if (e.target.nextSibling) e.target.nextSibling.style.display='flex'; }}
                        />
                      ) : null}
                      <div
                        style={{ display: item.image ? 'none' : 'flex' }}
                        className="w-12 h-10 rounded-lg bg-zinc-200 dark:bg-zinc-800 items-center justify-center flex-shrink-0"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-900 dark:text-white">{item.title}</div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-3 h-3 text-blue-600 dark:text-sky-400" />
                          <span>{item.location}</span>
                          <span>•</span>
                          <span className="text-blue-600 dark:text-sky-400 font-medium">{item.type}</span>
                        </div>
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-zinc-400" />
                  </div>
                ))
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
