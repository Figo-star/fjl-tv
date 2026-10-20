'use client';

import React from 'react';
import { MediaCast } from '@/lib/types';
import { User } from 'lucide-react';

interface CastCarouselProps {
  cast: MediaCast[];
}

export default function CastCarousel({ cast }: CastCarouselProps) {
  if (!cast || cast.length === 0) return null;

  return (
    <div className="space-y-4 pt-6 border-t border-white/5">
      <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
        <span>Top Billed Cast</span>
      </h3>
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 no-scrollbar scroll-smooth">
        {cast.slice(0, 15).map((member, i) => (
          <div
            key={`${member.name}-${i}`}
            className="flex-shrink-0 w-28 sm:w-32 bg-slate-900/60 rounded-xl overflow-hidden border border-white/5 p-2 flex flex-col items-center text-center group hover:border-cyan-500/40 hover:bg-slate-900/90 transition-all"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden mb-2.5 bg-slate-950 flex items-center justify-center border border-white/10 group-hover:scale-105 transition-transform">
              {member.profilePath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.profilePath}
                  alt={member.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <User className="w-8 h-8 text-slate-600" />
              )}
            </div>
            <div className="w-full">
              <p className="text-xs font-bold text-white line-clamp-1 group-hover:text-cyan-300 transition-colors">
                {member.name}
              </p>
              {member.character && (
                <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                  {member.character}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
