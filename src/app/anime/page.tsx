import React from 'react';
import MediaCard from '@/components/MediaCard';
import { MediaProvider } from '@/lib/mediaProvider';
import { PlaySquare } from 'lucide-react';

export const revalidate = 1800;

export const metadata = {
  title: 'Anime Catalog | FJL TV',
  description: 'Experience popular anime series and broadcasts on FJL TV.',
};

export default async function AnimePage() {
  const { popularAnime } = await MediaProvider.getHomeRails();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
          <PlaySquare className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Anime</h1>
          <p className="text-sm text-slate-400">Top Japanese animation broadcasts, action epics, and seasonal series</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
        {popularAnime.map((anime) => (
          <MediaCard key={anime.id} item={anime} />
        ))}
      </div>
    </div>
  );
}
