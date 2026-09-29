import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MapPin, 
  Clock, 
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { Badge } from '../components/ui/Primitives';

export interface ItemsExplorerProps {
  onInspectItemMatches?: (itemId: string) => void;
}

export default function ItemsExplorer({ onInspectItemMatches }: ItemsExplorerProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [buildingFilter, setBuildingFilter] = useState<string>('');

  useEffect(() => {
    loadItems();
  }, [typeFilter, categoryFilter, buildingFilter]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const filters: Record<string, string> = {};
      if (typeFilter) filters.type = typeFilter;
      if (categoryFilter) filters.category = categoryFilter;
      if (buildingFilter) filters.building = buildingFilter;
      if (search) filters.search = search;

      const res = await api.getItems(filters);
      setItems(res.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadItems();
  };

  return (
    <div className="space-y-6 w-full pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-[#26262e] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="blue" className="font-mono">
              CAMPUS REGISTRY
            </Badge>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">SECURE ZERO-LEAK CATALOG</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white mt-1">Explore Items Registry</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Browse public lost and found reports. Sensitive verification characteristics remain concealed.
          </p>
        </div>

        <div className="text-xs font-mono text-blue-600 dark:text-sky-400 bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-500/20 font-bold">
          INDEXED: {items.length} ACTIVE ITEMS
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#141418] border border-zinc-200/90 dark:border-[#26262e] shadow-xs flex flex-col md:flex-row items-center gap-3">
        
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search keywords, brand, model, color..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs bg-zinc-50 dark:bg-[#0b0b0e] border border-zinc-200 dark:border-[#2e2e38] rounded-xl pl-9 pr-4 py-2.5 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 font-mono"
          />
        </form>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs bg-zinc-50 dark:bg-[#1a1a20] text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-[#26262e] rounded-xl px-3 py-2 font-mono focus:outline-none"
          >
            <option value="">All Types</option>
            <option value="LOST">Lost Reports</option>
            <option value="FOUND">Found Reports</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs bg-zinc-50 dark:bg-[#1a1a20] text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-[#26262e] rounded-xl px-3 py-2 font-mono focus:outline-none"
          >
            <option value="">All Categories</option>
            <option value="Electronics">Electronics</option>
            <option value="Bags">Bags</option>
            <option value="Keys">Keys</option>
            <option value="Accessories">Accessories</option>
            <option value="Documents">Documents</option>
          </select>

          {/* Building Filter */}
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="text-xs bg-zinc-50 dark:bg-[#1a1a20] text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-[#26262e] rounded-xl px-3 py-2 font-mono focus:outline-none"
          >
            <option value="">All Buildings</option>
            <option value="Library">Library</option>
            <option value="Science Complex">Science Complex</option>
            <option value="Student Union">Student Union</option>
            <option value="Gymnasium">Gymnasium</option>
            <option value="Dining Hall">Dining Hall</option>
            <option value="Engineering Center">Engineering</option>
            <option value="Hostel Block A">Hostel</option>
          </select>
        </div>

      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-2 border-blue-600 dark:border-sky-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center text-zinc-400 rounded-2xl bg-zinc-50 dark:bg-[#141418] border border-zinc-200 dark:border-[#26262e]">
          No items match your filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => {
            const isLost = item.type === 'LOST';

            return (
              <div 
                key={item.id}
                className="rounded-2xl bg-white dark:bg-[#141418] border border-zinc-200/90 dark:border-[#26262e] hover:border-zinc-300 dark:hover:border-zinc-600 p-4 flex flex-col justify-between transition-all duration-300 shadow-xs group"
              >
                <div>
                  {/* Top Badge Row */}
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant={isLost ? 'blue' : 'emerald'}>
                      {item.type}
                    </Badge>
                    <span className="text-[11px] text-zinc-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.event_time ? new Date(item.event_time).toLocaleDateString() : 'Active'}
                    </span>
                  </div>

                  {/* Thumbnail */}
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-100 dark:bg-[#0b0b0e] border border-zinc-200 dark:border-[#26262e] mb-3">
                    {item.image ? (
                      <img 
                        src={item.image} 
                        alt={item.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e: any) => {
                          e.target.style.display = 'none';
                          if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    {/* Fallback placeholder shown when image is missing or broken */}
                    <div
                      style={{ display: item.image ? 'none' : 'flex' }}
                      className="w-full h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-[#0f0f14] dark:to-[#1a1a22]"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-zinc-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-600 font-mono">NO PHOTO</span>
                    </div>
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/60 text-[9px] font-mono text-white border border-white/10">
                      {item.category}
                    </div>

                    {item.latitude && item.longitude && (
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/80 text-[9px] font-mono text-cyan-300 border border-cyan-500/40 flex items-center gap-1 backdrop-blur-xs">
                        <MapPin className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                        <span>LIVE GPS: {Number(item.latitude).toFixed(3)}°, {Number(item.longitude).toFixed(3)}°</span>
                      </div>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-300 mt-1 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-[#26262e] flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1 truncate max-w-[180px]">
                      <MapPin className="w-3 h-3 text-blue-600 dark:text-sky-400 shrink-0" />
                      {item.location}
                    </span>
                    <span className="font-mono text-zinc-400 dark:text-zinc-500">{item.brand || 'Generic'}</span>
                  </div>

                  {item.close_code && (
                    <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-between text-xs">
                      <div>
                        <div className="text-[9px] uppercase font-mono font-bold text-emerald-700 dark:text-[#4ade80]">1-Time Close Code</div>
                        <div className="font-mono font-black text-sm text-emerald-800 dark:text-emerald-300 tracking-wider">{item.close_code}</div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(item.close_code);
                          alert(`Copied code: ${item.close_code}`);
                        }}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[10px] font-bold cursor-pointer transition-colors shadow-xs"
                      >
                        Copy
                      </button>
                    </div>
                  )}
                </div>

                {/* Inspect Action */}
                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-[#26262e] flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400 font-mono font-bold">Status: {item.status}</span>
                  <button
                    onClick={() => onInspectItemMatches && onInspectItemMatches(item.id)}
                    className="flex items-center gap-1 text-xs text-blue-600 dark:text-sky-400 hover:underline font-mono font-bold cursor-pointer"
                  >
                    <span>Check AI Match</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
