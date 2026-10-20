import React from 'react';
import Hero from '@/components/Hero';
import DiscoveryRail from '@/components/DiscoveryRail';
import ContinueWatchingRail from '@/components/ContinueWatchingRail';
import { MediaProvider } from '@/lib/mediaProvider';

export const revalidate = 1800; // 30 minutes cache revalidation

export default async function HomePage() {
  const {
    hero,
    trendingMovies,
    popularMovies,
    popularTv,
    popularAnime,
    newReleases,
  } = await MediaProvider.getHomeRails();

  const heroItem = hero || trendingMovies[0] || popularMovies[0];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Spotlight Banner */}
      {heroItem && <Hero item={heroItem} />}

      {/* Discovery Rail Section Container */}
      <div className="relative -mt-10 sm:-mt-16 z-20 space-y-4 max-w-7xl mx-auto w-full">
        {/* Continue Watching Section (Client persisted) */}
        <ContinueWatchingRail />

        {/* Curated Rails with Real Metadata */}
        {trendingMovies.length > 0 && (
          <DiscoveryRail
            title="Trending Movies"
            subtitle="Top box-office and critically acclaimed cinema"
            items={trendingMovies}
            viewAllLink="/movies"
          />
        )}

        {popularMovies.length > 0 && (
          <DiscoveryRail
            title="Popular Cinema"
            subtitle="Global crowd favorites and blockbuster releases"
            items={popularMovies}
            viewAllLink="/movies"
          />
        )}

        {popularTv.length > 0 && (
          <DiscoveryRail
            title="Binge-Worthy TV Series"
            subtitle="Episodic dramas, mysteries, and ongoing television sagas"
            items={popularTv}
            viewAllLink="/tv"
          />
        )}

        {popularAnime.length > 0 && (
          <DiscoveryRail
            title="Featured Anime"
            subtitle="Top Japanese animation and seasonal broadcasts"
            items={popularAnime}
            viewAllLink="/anime"
          />
        )}

        {newReleases.length > 0 && (
          <DiscoveryRail
            title="Fresh Digital Arrivals"
            subtitle="Recently released cinema and new stream premieres"
            items={newReleases}
            viewAllLink="/movies"
          />
        )}
      </div>
    </div>
  );
}
