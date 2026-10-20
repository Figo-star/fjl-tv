import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MediaProvider } from '@/lib/mediaProvider';
import { Play, Star, Calendar, Clock, ShieldCheck } from 'lucide-react';
import MediaCard from '@/components/MediaCard';

interface Props {
  params: Promise<{ id: string }>;
}

export const revalidate = 3600;

export default async function MovieDetailPage({ params }: Props) {
  const { id } = await params;
  const movie = await MediaProvider.getById(id, 'movie');

  if (!movie) {
    notFound();
  }

  const { popularMovies } = await MediaProvider.getHomeRails();
  const recommendations = popularMovies.filter((m) => m.id !== id).slice(0, 5);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Backdrop Header */}
      <div className="relative w-full h-[450px] lg:h-[550px] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={movie.backdrop || movie.poster}
          alt={movie.title}
          className="w-full h-full object-cover object-top filter brightness-[0.45] contrast-[1.1]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07090e] via-transparent to-transparent" />
      </div>

      {/* Main Content Details */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-64 relative z-10 w-full space-y-12">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Left Poster Card */}
          <div className="w-56 sm:w-64 flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-white/10 hidden md:block aspect-[2/3] bg-slate-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
          </div>

          {/* Right Info */}
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Movie
              </span>
              <div className="flex items-center gap-1.5 bg-black/50 px-2.5 py-1 rounded-full border border-white/10 text-xs">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="font-bold text-white">{movie.rating}</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">{movie.title}</h1>

            <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {movie.releaseYear}
              </span>
              {movie.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {movie.duration}
                </span>
              )}
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                1080p Ad-Free Stream
              </span>
            </div>

            <p className="text-slate-300 leading-relaxed text-sm sm:text-base">{movie.overview}</p>

            <div className="flex items-center gap-2 flex-wrap pt-2">
              {movie.genres.map((g) => (
                <span key={g} className="text-xs text-slate-300 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                  {g}
                </span>
              ))}
            </div>

            {/* Play Button */}
            <div className="pt-4">
              <Link
                href={`/watch/${movie.id}?type=movie`}
                id="watch-movie-button"
                className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full font-bold text-sm bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-xl shadow-cyan-500/30 transition-all hover:scale-105 active:scale-95"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                Watch Movie Now
              </Link>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="space-y-4 pt-8 border-t border-white/5">
            <h2 className="text-2xl font-bold text-white">Recommended Cinema</h2>
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
