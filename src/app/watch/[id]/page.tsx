import React from 'react';
import { notFound } from 'next/navigation';
import { MediaProvider } from '@/lib/mediaProvider';
import { PlaybackResolver } from '@/lib/playbackResolver';
import VideoPlayer from '@/components/VideoPlayer';
import Link from 'next/link';
import { ChevronLeft, Info, Layers, Star } from 'lucide-react';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ season?: string; episode?: string; type?: 'movie' | 'tv' | 'anime' }>;
}

export const revalidate = 3600;

export default async function WatchPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { season, episode, type } = await searchParams;

  const media = await MediaProvider.getById(id, type);

  if (!media) {
    notFound();
  }

  const seasonNum = season ? parseInt(season, 10) : 1;
  const episodeNum = episode ? parseInt(episode, 10) : 1;

  // Resolve authentic ad-free direct playback source for this specific title and episode
  const resolution = await PlaybackResolver.resolvePlayback(media.id, media.mediaType, seasonNum, episodeNum);
  const episodes = media.mediaType !== 'movie' ? await MediaProvider.getEpisodes(id, seasonNum) : [];
  const currentEp = episodes.find((e) => e.seasonNumber === seasonNum && e.episodeNumber === episodeNum);

  // Next episode calculation
  const nextEp = episodes.find((e) => e.seasonNumber === seasonNum && e.episodeNumber === episodeNum + 1);
  const nextEpisodeUrl = nextEp
    ? `/watch/${media.id}?type=${media.mediaType}&season=${seasonNum}&episode=${episodeNum + 1}`
    : undefined;
  const nextEpisodeTitle = nextEp ? `Ep ${nextEp.episodeNumber}: ${nextEp.title}` : undefined;

  const backUrl = `/${media.mediaType === 'movie' ? 'movie' : media.mediaType === 'tv' ? 'tv' : 'anime'}/${media.id}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
      {/* Top Bar with back link and title */}
      <div className="flex items-center justify-between">
        <Link
          href={backUrl}
          className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white glass-pill px-3.5 py-1.5 rounded-full transition-all"
        >
          <ChevronLeft className="w-4 h-4 text-cyan-400" />
          Back to Details
        </Link>
        <div className="text-right">
          <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">{media.title}</h1>
          {media.mediaType !== 'movie' && (
            <p className="text-xs text-cyan-400 font-medium">
              Season {seasonNum} · Episode {episodeNum} {currentEp ? `- ${currentEp.title}` : ''}
            </p>
          )}
        </div>
      </div>

      {/* Video Player Container */}
      <div className="w-full">
        <VideoPlayer
          media={media}
          resolution={resolution}
          initialSeason={seasonNum}
          initialEpisode={episodeNum}
          nextEpisodeUrl={nextEpisodeUrl}
          nextEpisodeTitle={nextEpisodeTitle}
        />
      </div>

      {/* Under Player Metadata */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {media.mediaType}
              </span>
              <div className="flex items-center gap-1 text-xs text-amber-400">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span className="font-bold text-white">{media.rating}</span>
              </div>
              <span className="text-xs text-slate-400">{media.releaseYear}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">{media.title}</h2>
          </div>

          <Link
            href={backUrl}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold glass-pill text-slate-300 hover:text-white w-fit"
          >
            <Info className="w-4 h-4 text-cyan-400" />
            Full Synopsis & Credits
          </Link>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed max-w-4xl">{media.overview}</p>

        {/* Next episodes quick picker if TV or Anime */}
        {episodes.length > 0 && (
          <div className="pt-4 border-t border-white/5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Episodes in Season {seasonNum}
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {episodes.map((ep) => {
                const isActive = ep.episodeNumber === episodeNum && ep.seasonNumber === seasonNum;
                return (
                  <Link
                    key={ep.id}
                    href={`/watch/${media.id}?type=${media.mediaType}&season=${ep.seasonNumber}&episode=${ep.episodeNumber}`}
                    className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                        : 'glass-pill text-slate-300 hover:text-white border-white/5'
                    }`}
                  >
                    <span className="font-bold block">Ep {ep.episodeNumber}</span>
                    <span className="text-[11px] text-slate-400 line-clamp-1 max-w-[120px]">{ep.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
