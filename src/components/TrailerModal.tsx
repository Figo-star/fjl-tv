'use client';

import React, { useState } from 'react';
import { Play, X } from 'lucide-react';

interface TrailerModalProps {
  youtubeId: string;
  title: string;
}

export default function TrailerModal({ youtubeId, title }: TrailerModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        id="open-trailer-btn"
        className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-semibold text-sm bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all hover:scale-105 active:scale-95"
      >
        <Play className="w-4 h-4 text-cyan-400 fill-cyan-400" />
        Watch Official Trailer
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/15"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white transition-colors"
              aria-label="Close trailer"
            >
              <X className="w-5 h-5" />
            </button>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
              title={`${title} Trailer`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </>
  );
}
