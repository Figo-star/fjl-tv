'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Star, Play, Bookmark, Check } from 'lucide-react';
import { MediaItem } from '@/lib/types';
import { isFavorite, toggleFavorite } from '@/lib/storage';

interface MediaCardProps {
  item: MediaItem;
}

export default function MediaCard({ item }: MediaCardProps) {
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    setFavorite(isFavorite(item.id));
    const handleFavChange = () => setFavorite(isFavorite(item.id));
    window.addEventListener('fjl_favorites_updated', handleFavChange);
    return () => window.removeEventListener('fjl_favorites_updated', handleFavChange);
  }, [item.id]);

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextState = toggleFavorite(item);
    setFavorite(nextState);
  };

  const detailUrl = `/${item.mediaType === 'movie' ? 'movie' : item.mediaType === 'tv' ? 'tv' : 'anime'}/${item.id}`;
  const playUrl = `/watch/${item.id}`;

  return (
    <div className="group relative flex flex-col rounded-2xl overflow-hidden bg-slate-900/60 border border-white/5 hover:border-cyan-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-1">
      {/* Poster Image Container */}
      <Link href={detailUrl} className="relative aspect-[2/3] w-full overflow-hidden bg-slate-950 block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.poster}
          alt={item.title}
          loading="lazy"
          className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30 opacity-70 group-hover:opacity-90 transition-opacity" />

        {/* Badges top */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-cyan-300 border border-cyan-500/20">
            {item.mediaType}
          </span>
          <button
            type="button"
            onClick={handleBookmarkClick}
            aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
            className="pointer-events-auto p-1.5 rounded-full bg-black/60 backdrop-blur-md text-slate-300 hover:text-cyan-400 hover:bg-black/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            {favorite ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <Bookmark className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Play Button Overlay on Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Link
            href={playUrl}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Watch ${item.title}`}
            className="w-12 h-12 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow-lg shadow-cyan-500/50 hover:scale-110 active:scale-95 transition-all"
          >
            <Play className="w-6 h-6 fill-slate-950 ml-0.5" />
          </Link>
        </div>

        {/* Rating and Year bottom over image */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs text-slate-300 pointer-events-none font-medium">
          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="font-semibold text-white">{item.rating}</span>
          </div>
          <span className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10">
            {item.releaseYear}
          </span>
        </div>
      </Link>

      {/* Card Info */}
      <div className="p-3.5 flex flex-col flex-grow justify-between gap-2">
        <Link href={detailUrl} className="group-hover:text-cyan-400 transition-colors">
          <h3 className="font-semibold text-sm line-clamp-1 text-slate-100 tracking-tight" title={item.title}>
            {item.title}
          </h3>
        </Link>
        <div className="flex items-center gap-1.5 flex-wrap">
          {item.genres.slice(0, 2).map((genre) => (
            <span key={genre} className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
              {genre}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
