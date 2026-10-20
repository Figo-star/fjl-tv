'use client';

import React, { useState, useTransition, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MediaCard from '@/components/MediaCard';
import { MediaItem } from '@/lib/types';
import { MediaProvider } from '@/lib/mediaProvider';
import { Search as SearchIcon, X, Loader2, Filter, AlertCircle, RefreshCw } from 'lucide-react';

const GENRES = [
  'All',
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Family',
  'Fantasy',
  'Horror',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Thriller',
];

const LANGUAGES = [
  { label: 'All Languages', value: '' },
  { label: 'English', value: 'en' },
  { label: 'Malayalam', value: 'ml' },
  { label: 'Hindi', value: 'hi' },
  { label: 'Tamil', value: 'ta' },
  { label: 'Arabic', value: 'ar' },
];

const YEARS = ['All', '2026', '2025', '2024', '2023', '2022', '2021', '2020'];

const MEDIA_TYPES = [
  { label: 'All Content', value: 'all' },
  { label: 'Movies', value: 'movie' },
  { label: 'TV Shows', value: 'tv' },
  { label: 'Anime', value: 'anime' },
];

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get('q') || '';
  const initialType = searchParams.get('type') || 'all';
  const initialGenre = searchParams.get('genre') || 'All';
  const initialYear = searchParams.get('year') || 'All';
  const initialLang = searchParams.get('lang') || '';

  const [query, setQuery] = useState(initialQuery);
  const [selectedType, setSelectedType] = useState(initialType);
  const [selectedGenre, setSelectedGenre] = useState(initialGenre);
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [selectedLang, setSelectedLang] = useState(initialLang);

  const [results, setResults] = useState<MediaItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const syncUrlParams = useCallback(
    (q: string, t: string, g: string, y: string, l: string) => {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (t && t !== 'all') params.set('type', t);
      if (g && g !== 'All') params.set('genre', g);
      if (y && y !== 'All') params.set('year', y);
      if (l) params.set('lang', l);

      const qs = params.toString();
      router.replace(`/search${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [router]
  );

  const executeSearch = useCallback(
    (q: string, t: string, g: string, y: string, l: string) => {
      setErrorMessage(null);
      startTransition(async () => {
        try {
          // If a regional language is selected, combine search query for accurate regional results
          let effectiveQuery = q;
          if (l) {
            const langObj = LANGUAGES.find((item) => item.value === l);
            if (langObj && langObj.value && !effectiveQuery.toLowerCase().includes(langObj.label.toLowerCase())) {
              effectiveQuery = effectiveQuery ? `${effectiveQuery} ${langObj.label}` : langObj.label;
            }
          }

          const filters = {
            type: t !== 'all' ? t : undefined,
            genre: g !== 'All' ? g : undefined,
            year: y !== 'All' ? y : undefined,
          };

          const data = await MediaProvider.search(effectiveQuery, filters);
          setResults(data);
        } catch (err) {
          setErrorMessage('Unable to load catalog results. Please check network connection and retry.');
        }
      });
    },
    []
  );

  useEffect(() => {
    executeSearch(query, selectedType, selectedGenre, selectedYear, selectedLang);
  }, []);

  const handleQueryChange = (newQ: string) => {
    setQuery(newQ);
    syncUrlParams(newQ, selectedType, selectedGenre, selectedYear, selectedLang);
    executeSearch(newQ, selectedType, selectedGenre, selectedYear, selectedLang);
  };

  const handleFilterChange = (
    nextType: string,
    nextGenre: string,
    nextYear: string,
    nextLang: string
  ) => {
    setSelectedType(nextType);
    setSelectedGenre(nextGenre);
    setSelectedYear(nextYear);
    setSelectedLang(nextLang);
    syncUrlParams(query, nextType, nextGenre, nextYear, nextLang);
    executeSearch(query, nextType, nextGenre, nextYear, nextLang);
  };

  const handleRetry = () => {
    executeSearch(query, selectedType, selectedGenre, selectedYear, selectedLang);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-grow space-y-8">
      {/* Search Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-black text-white tracking-tight">Explore & Search Catalog</h1>
        <p className="text-sm text-slate-400">
          Discover verified ad-free movies, series, and anime by title, genre, year, or regional language.
        </p>

        {/* Input Bar */}
        <div className="relative max-w-2xl">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            id="search-catalog-input"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search titles (e.g. Batman, Dune, Arcane, Avatar)..."
            className="w-full bg-slate-900/80 border border-white/10 rounded-2xl pl-12 pr-12 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all shadow-inner"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {isPending && <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />}
            {query && !isPending && (
              <button
                type="button"
                onClick={() => handleQueryChange('')}
                aria-label="Clear search"
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-cyan-400" />
          <span>Filters</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Content Type Filter */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Type</label>
            <select
              value={selectedType}
              onChange={(e) => handleFilterChange(e.target.value, selectedGenre, selectedYear, selectedLang)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
            >
              {MEDIA_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Genre Filter */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Genre</label>
            <select
              value={selectedGenre}
              onChange={(e) => handleFilterChange(selectedType, e.target.value, selectedYear, selectedLang)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
            >
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Release Year Filter */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => handleFilterChange(selectedType, selectedGenre, e.target.value, selectedLang)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Language Filter */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Language</label>
            <select
              value={selectedLang}
              onChange={(e) => handleFilterChange(selectedType, selectedGenre, selectedYear, e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error State with Retry Button */}
      {errorMessage && (
        <div className="text-center py-12 glass-panel rounded-3xl border border-red-500/20 p-6 flex flex-col items-center gap-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-slate-300 text-sm max-w-md">{errorMessage}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Search
          </button>
        </div>
      )}

      {/* Empty State */}
      {!errorMessage && results.length === 0 && !isPending && (
        <div className="text-center py-16 glass-panel rounded-3xl border border-white/5 space-y-2">
          <p className="text-slate-300 font-semibold text-base">No titles match your current criteria</p>
          <p className="text-slate-500 text-xs">
            Try adjusting your search keywords, clearing filters, or switching language selections.
          </p>
        </div>
      )}

      {/* Results Grid */}
      {!errorMessage && results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {results.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <React.Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
          <span>Loading catalog discovery...</span>
        </div>
      }
    >
      <SearchContent />
    </React.Suspense>
  );
}
