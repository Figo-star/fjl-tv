import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MediaProvider } from '@/lib/mediaProvider';
import { Play, Star, Calendar, Layers } from 'lucide-react';
import MediaCard from '@/components/MediaCard';

interface Props {
  params: Promise<{ id: string }>;
}

export const revalidate = 3600;

export default async function TVDetailPage({ params }: Props) {
  const { id } = await params;
  const tv = await MediaProvider.getById(id, 'tv');

  if (!tv) {
    notFound();
  }

  const episodes = await MediaProvider.getEpisodes(id, 1);
  const { popularTv } = await MediaProvider.getHomeRails();
  const recommendations = popularTv.filter((m) => m.id !== id).slice(0, 5);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Backdrop */}
      <div className="relative w-full h-[450px] lg:h-[550px] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={tv.backdrop || tv.poster}
          alt={tv.title}
          className="w-full h-full object-cover object-top filter brightness-[0.45] contrast-[1.1]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/70 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-64 relative z-10 w-full space-y-12">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="w-56 sm:w-64 flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-white/10 hidden md:block aspect-[2/3] bg-slate-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={tv.poster} alt={tv.title} className="w-full h-full object-cover" />
          </div>

          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30">
                TV Series
              </span>
              <div className="flex items-center gap-1.5 bg-black/50 px-2.5 py-1 rounded-full border border-white/10 text-xs">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="font-bold text-white">{tv.rating}</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">{tv.title}</h1>

            <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {tv.releaseYear}
              </span>
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                {tv.seasonsCount || 1} Season{tv.seasonsCount && tv.seasonsCount > 1 ? 's' : ''}
              </span>
              <span>{episodes.length} Episodes in Season 1</span>
            </div>

            <p className="text-slate-300 leading-relaxed text-sm sm:text-base">{tv.overview}</p>

            <div className="flex items-center gap-2 flex-wrap pt-2">
              {tv.genres.map((g) => (
                <span key={g} className="text-xs text-slate-300 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                  {g}
                </span>
              ))}
            </div>

            <div className="pt-4">
              <Link
                href={`/watch/${tv.id}?type=tv&season=1&episode=1`}
                id="watch-tv-first-episode"
                className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full font-bold text-sm bg-violet-500 hover:bg-violet-400 text-white shadow-xl shadow-violet-500/30 transition-all hover:scale-105 active:scale-95"
              >
                <Play className="w-4 h-4 fill-white" />
                Start Watching (S1:E1)
              </Link>
            </div>
          </div>
        </div>

        {/* Episode List Section */}
        {episodes.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-white/5">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-violet-400" />
              Season 1 Episodes
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {episodes.map((ep) => (
                <Link
                  key={ep.id}
                  href={`/watch/${tv.id}?type=tv&season=${ep.seasonNumber}&episode=${ep.episodeNumber}`}
                  className="group flex flex-col bg-slate-900/50 rounded-xl overflow-hidden border border-white/5 hover:border-violet-500/40 p-3 transition-all hover:bg-slate-900/80"
                >
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-950 mb-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ep.thumbnail} alt={ep.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-8 h-8 text-white fill-white" />
                    </div>
                    {ep.airDate && (
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[10px] bg-black/70 text-slate-300">
                        {ep.airDate}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-violet-400">Episode {ep.episodeNumber}</div>
                    <h4 className="text-sm font-bold text-white group-hover:text-violet-300 transition-colors">{ep.title}</h4>
                    <p className="text-xs text-slate-400 line-clamp-2">{ep.overview}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="space-y-4 pt-8 border-t border-white/5">
            <h2 className="text-2xl font-bold text-white">Recommended Shows</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {recommendations.map((m) => (
                <MediaCard key={m.id} item={m} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
