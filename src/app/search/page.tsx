'use client';

import React, { useState, useTransition } from 'react';
import MediaCard from '@/components/MediaCard';
import { MediaItem } from '@/lib/types';
import { MediaProvider } from '@/lib/mediaProvider';
import { Search as SearchIcon, X, Loader2 } from 'lucide-react';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (newQuery: string) => {
    setQuery(newQuery);

    startTransition(async () => {
      const res = await MediaProvider.search(newQuery);
      setResults(res);
    });
  };

  // Initial load
  React.useEffect(() => {
    startTransition(async () => {
      const res = await MediaProvider.search('');
      setResults(res);
    });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-grow">
      {/* Search Header */}
      <div className="mb-8 space-y-4">
        <h1 className="text-3xl font-black text-white tracking-tight">Search Catalog</h1>
        <p className="text-sm text-slate-400">Search thousands of movies, series, and anime titles in real time</p>

        {/* Input Bar */}
        <div className="relative max-w-2xl">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            id="search-catalog-input"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by title (e.g. Batman, Dune, Arcane, Avatar)..."
            className="w-full bg-slate-900/80 border border-white/10 rounded-2xl pl-12 pr-12 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all shadow-inner"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {isPending && <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />}
            {query && !isPending && (
              <button
                onClick={() => handleSearch('')}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results Grid */}
      {results.length === 0 && !isPending ? (
        <div className="text-center py-16 glass-panel rounded-3xl border border-white/5">
          <p className="text-slate-400 text-sm">No streaming titles match &quot;{query}&quot;</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {results.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
