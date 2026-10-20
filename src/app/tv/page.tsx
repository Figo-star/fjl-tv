import React from 'react';
import MediaCard from '@/components/MediaCard';
import { MediaProvider } from '@/lib/mediaProvider';
import { Tv } from 'lucide-react';

export const revalidate = 1800;

export const metadata = {
  title: 'TV Series Catalog | FJL TV',
  description: 'Explore live TV series and episodic releases on FJL TV.',
};

export default async function TVPage() {
  const { results: tvShows } = await MediaProvider.getByType('tv', 1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
          <Tv className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">TV Shows</h1>
          <p className="text-sm text-slate-400">Real episodic television series, season directories, and episode guides</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
        {tvShows.map((tv) => (
          <MediaCard key={tv.id} item={tv} />
        ))}
      </div>
    </div>
  );
}
