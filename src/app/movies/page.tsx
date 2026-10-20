import React from 'react';
import MediaCard from '@/components/MediaCard';
import { MediaProvider } from '@/lib/mediaProvider';
import { Film } from 'lucide-react';

export const revalidate = 1800;

export const metadata = {
  title: 'Movies Catalog | FJL TV',
  description: 'Browse real blockbuster and trending cinema on FJL TV.',
};

export default async function MoviesPage() {
  const { results: movies } = await MediaProvider.getByType('movie', 1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
          <Film className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Movies</h1>
          <p className="text-sm text-slate-400">Live catalog of international blockbusters, sci-fi sagas, and thrillers</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
        {movies.map((movie) => (
          <MediaCard key={movie.id} item={movie} />
        ))}
      </div>
    </div>
  );
}
