'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, RotateCcw, Trash2, Clock, RefreshCw } from 'lucide-react';
import { WatchProgress } from '@/lib/types';
import { getWatchProgress, removeWatchProgress, resetProgress } from '@/lib/storage';

export default function ContinueWatchingRail() {
  const [items, setItems] = useState<WatchProgress[]>([]);

  const loadItems = () => {
    setItems(getWatchProgress());
  };

  useEffect(() => {
    loadItems();
    window.addEventListener('fjl_progress_updated', loadItems);
    return () => window.removeEventListener('fjl_progress_updated', loadItems);
  }, []);

  if (items.length === 0) return null;

  const formatRemaining = (duration: number, timestamp: number) => {
    const left = Math.max(0, duration - timestamp);
    const mins = Math.ceil(left / 60);
    return `${mins}m left`;
  };

  return (
    <section className="py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-cyan-400" />
            Continue Watching
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">Resume your recent titles with exact timestamp precision</p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 no-scrollbar" style={{ scrollbarWidth: 'none' }}>
        {items.map((item) => {
          const percent = item.duration > 0 ? Math.min(100, Math.round((item.timestamp / item.duration) * 100)) : 0;
          const playUrl = `/watch/${item.mediaId}?type=${item.mediaType}${
            item.seasonNumber && item.episodeNumber ? `&season=${item.seasonNumber}&episode=${item.episodeNumber}` : ''
          }`;

          return (
            <div
              key={`${item.mediaId}-${item.seasonNumber || 1}-${item.episodeNumber || 1}`}
              className="group relative flex flex-col w-[200px] sm:w-[240px] flex-shrink-0 bg-slate-900/60 rounded-xl overflow-hidden border border-white/10 hover:border-cyan-500/40 transition-all shadow-md"
            >
              <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.poster}
                  alt={item.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />

                {/* Quick resume link */}
                <Link
                  href={playUrl}
                  className="absolute inset-0 flex items-center justify-center"
                  aria-label={`Resume ${item.title}`}
                >
                  <div className="w-10 h-10 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 fill-slate-950 ml-0.5" />
                  </div>
                </Link>

                {/* Top action buttons: Start Again & Remove from Continue Watching */}
                <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => resetProgress(item.mediaId, item.seasonNumber, item.episodeNumber)}
                    title="Start again from 0:00"
                    aria-label="Start again"
                    className="p-1.5 rounded-full bg-black/70 hover:bg-black text-slate-300 hover:text-cyan-400 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeWatchProgress(item.mediaId, item.seasonNumber, item.episodeNumber)}
                    title="Remove from Continue Watching"
                    aria-label="Remove from Continue Watching"
                    className="p-1.5 rounded-full bg-black/70 hover:bg-black text-slate-300 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-violet-500 transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>

              <div className="p-3 flex flex-col justify-between flex-grow gap-1">
                <h4 className="font-semibold text-sm text-white line-clamp-1" title={item.title}>
                  {item.title}
                </h4>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    {item.seasonNumber && item.episodeNumber
                      ? `S${item.seasonNumber}:E${item.episodeNumber}`
                      : `${Math.floor(item.timestamp / 60)}m watched`}
                  </span>
                  {item.duration > 0 && (
                    <span className="text-cyan-400 font-medium flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      {formatRemaining(item.duration, item.timestamp)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
