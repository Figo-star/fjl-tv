'use client';

import React, { useState, useEffect } from 'react';
import MediaCard from '@/components/MediaCard';
import { MediaItem } from '@/lib/types';
import { getFavorites } from '@/lib/storage';
import { Bookmark, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function MyListPage() {
  const [favorites, setFavorites] = useState<MediaItem[]>([]);

  const loadFavorites = () => {
    setFavorites(getFavorites());
  };

  useEffect(() => {
    loadFavorites();
    window.addEventListener('fjl_favorites_updated', loadFavorites);
    return () => window.removeEventListener('fjl_favorites_updated', loadFavorites);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
          <Bookmark className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">My List</h1>
          <p className="text-sm text-slate-400">Your bookmarked movies, series, and anime</p>
        </div>
      </div>

      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center glass-panel rounded-3xl border border-white/5 my-8">
          <Bookmark className="w-12 h-12 text-slate-600 mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Your list is currently empty</h2>
          <p className="text-sm text-slate-400 max-w-sm mb-6">
            Click the bookmark icon on any title in the catalog to save it to your personal watchlist.
          </p>
          <Link
            href="/"
            className="px-6 py-2.5 rounded-full font-semibold text-xs bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20"
          >
            Explore Titles
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {favorites.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
