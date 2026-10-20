'use client';

import React from 'react';
import Link from 'next/link';
import { Play, Info, Star } from 'lucide-react';
import { MediaItem } from '@/lib/types';

interface HeroProps {
  item: MediaItem;
}

export default function Hero({ item }: HeroProps) {
  if (!item) return null;

  return (
    <div className="relative w-full min-h-[500px] lg:min-h-[620px] flex items-center overflow-hidden">
      {/* Background Poster/Backdrop Image */}
      <div className="absolute inset-0 z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.backdrop || item.poster}
          alt={item.title}
          className="w-full h-full object-cover object-top filter brightness-[0.7] contrast-[1.1] scale-105"
        />
        {/* Cinematic Vignette Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07090e] via-[#07090e]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#07090e]/80 via-transparent to-transparent" />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-start gap-4 max-w-2xl">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 backdrop-blur-md">
            Featured {item.mediaType}
          </span>
          <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-xs">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="font-bold text-white">{item.rating}</span>
            <span className="text-slate-400">/ 10</span>
          </div>
          <span className="text-xs text-slate-300 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
            {item.releaseYear}
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-md">
          {item.title}
        </h1>

        <p className="text-sm sm:text-base text-slate-300 line-clamp-3 max-w-xl leading-relaxed">
          {item.overview}
        </p>

        <div className="flex items-center gap-2 flex-wrap pt-1">
          {item.genres.map((g) => (
            <span
              key={g}
              className="text-xs text-slate-300 bg-white/5 border border-white/10 px-3 py-1 rounded-full backdrop-blur-sm"
            >
              {g}
            </span>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 pt-4">
          <Link
            href={`/watch/${item.id}`}
            id="hero-watch-button"
            className="flex items-center gap-2.5 px-6 py-3.5 rounded-full font-bold text-sm bg-gradient-to-r from-cyan-400 to-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105 active:scale-95 transition-all"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            Watch Now
          </Link>
          <Link
            href={`/${item.mediaType === 'movie' ? 'movie' : item.mediaType === 'tv' ? 'tv' : 'anime'}/${item.id}`}
            id="hero-details-button"
            className="flex items-center gap-2.5 px-6 py-3.5 rounded-full font-semibold text-sm glass-pill text-white hover:bg-white/10 transition-all"
          >
            <Info className="w-4 h-4 text-cyan-400" />
            Details
          </Link>
        </div>
      </div>
    </div>
  );
}
