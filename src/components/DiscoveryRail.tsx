'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MediaItem } from '@/lib/types';
import MediaCard from './MediaCard';

interface DiscoveryRailProps {
  title: string;
  subtitle?: string;
  items: MediaItem[];
  viewAllLink?: string;
}

export default function DiscoveryRail({ title, subtitle, items, viewAllLink }: DiscoveryRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -450 : 450;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="py-6 relative">
      <div className="flex items-end justify-between mb-4 px-4 sm:px-6 lg:px-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="w-1.5 h-5 bg-gradient-to-b from-cyan-400 to-violet-500 rounded-full inline-block" />
            {title}
          </h2>
          {subtitle && <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          {viewAllLink && (
            <Link
              href={viewAllLink}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 mr-2 transition-colors"
            >
              View All
            </Link>
          )}
          <button
            type="button"
            onClick={() => scroll('left')}
            aria-label={`Scroll ${title} left`}
            className="p-1.5 rounded-full glass-pill text-slate-300 hover:text-white transition-all disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            aria-label={`Scroll ${title} right`}
            className="p-1.5 rounded-full glass-pill text-slate-300 hover:text-white transition-all disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Rail Horizontal Scroll */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto px-4 sm:px-6 lg:px-8 pb-4 pt-1 no-scrollbar scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item) => (
          <div key={item.id} className="w-[170px] sm:w-[200px] md:w-[220px] flex-shrink-0">
            <MediaCard item={item} />
          </div>
        ))}
      </div>
    </section>
  );
}
