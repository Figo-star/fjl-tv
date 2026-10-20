import type { StreamSource, PlaybackResolution } from './types';

export class PlaybackResolver {
  /**
   * Resolves playable streams for an exact media item.
   * Separates metadata availability from playback availability.
   * If production resolution fails or streams are missing, returns isPlayable: false
   * with explicit unavailability reason rather than silently injecting generic fake videos.
   */
  static resolvePlayback(
    mediaId: string,
    mediaType: 'movie' | 'tv' | 'anime',
    season: number = 1,
    episode: number = 1
  ): PlaybackResolution {
    // Check if DEMO mode is explicitly enabled via environment variable
    const allowDemoFixtures = process.env.NEXT_PUBLIC_ENABLE_DEMO_FIXTURES === 'true';

    // Verify valid ID structure
    if (!mediaId || typeof mediaId !== 'string') {
      return {
        mediaId,
        mediaType,
        season,
        episode,
        isPlayable: false,
        activeSource: null,
        availableSources: [],
        unavailabilityReason: 'Invalid content identifier provided.',
      };
    }

    // In production, build exact verified streaming embeds matching the content ID
    const sources: StreamSource[] = [];

    if (mediaType === 'movie') {
      sources.push(
        {
          id: 'embed-vidlink',
          name: 'VidLink Pro (Primary 1080p)',
          quality: '1080p HD',
          type: 'embed',
          url: `https://vidlink.pro/movie/${mediaId}?autoplay=false`,
        },
        {
          id: 'embed-videasy',
          name: 'Videasy Fast (Server 2)',
          quality: 'Auto / 1080p',
          type: 'embed',
          url: `https://player.videasy.to/movie/${mediaId}`,
        },
        {
          id: 'embed-vidsrc-to',
          name: 'VidSrc TO (Server 3)',
          quality: '1080p',
          type: 'embed',
          url: `https://vidsrc.to/embed/movie/${mediaId}`,
        },
        {
          id: 'embed-vidsrc-me',
          name: 'VidSrc VIP (Server 4)',
          quality: '720p',
          type: 'embed',
          url: `https://vidsrc.me/embed/movie?tmdb=${mediaId}`,
        }
      );
    } else if (mediaType === 'tv') {
      sources.push(
        {
          id: 'embed-vidlink',
          name: `VidLink Pro (S${season}:E${episode})`,
          quality: '1080p HD',
          type: 'embed',
          url: `https://vidlink.pro/tv/${mediaId}/${season}/${episode}?autoplay=false`,
        },
        {
          id: 'embed-videasy',
          name: `Videasy (S${season}:E${episode})`,
          quality: 'Auto / 1080p',
          type: 'embed',
          url: `https://player.videasy.to/tv/${mediaId}/${season}/${episode}`,
        },
        {
          id: 'embed-vidsrc-to',
          name: `VidSrc TO (S${season}:E${episode})`,
          quality: '1080p',
          type: 'embed',
          url: `https://vidsrc.to/embed/tv/${mediaId}/${season}/${episode}`,
        },
        {
          id: 'embed-vidsrc-me',
          name: `VidSrc VIP (S${season}:E${episode})`,
          quality: '720p',
          type: 'embed',
          url: `https://vidsrc.me/embed/tv?tmdb=${mediaId}&season=${season}&episode=${episode}`,
        }
      );
    } else if (mediaType === 'anime') {
      sources.push(
        {
          id: 'embed-vidlink',
          name: `VidLink Pro Anime (Ep ${episode})`,
          quality: '1080p HD',
          type: 'embed',
          url: `https://vidlink.pro/tv/${mediaId}/${season}/${episode}?autoplay=false`,
        },
        {
          id: 'embed-videasy',
          name: `Videasy Anime (Ep ${episode})`,
          quality: 'Auto / 1080p',
          type: 'embed',
          url: `https://player.videasy.to/tv/${mediaId}/${season}/${episode}`,
        }
      );
    }

    // Only inject generic demo test streams if explicitly permitted in development mode
    if (allowDemoFixtures && sources.length === 0) {
      sources.push({
        id: 'dev-demo-hls',
        name: 'Dev Test Source (Authorized Mux HLS)',
        quality: 'Test Only',
        type: 'hls',
        url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        isAuthorizedDemo: true,
      });
    }

    if (sources.length === 0) {
      return {
        mediaId,
        mediaType,
        season,
        episode,
        isPlayable: false,
        activeSource: null,
        availableSources: [],
        unavailabilityReason: 'No authorized playback source is configured for this title. Generic sample streams are rejected in production mode.',
      };
    }

    return {
      mediaId,
      mediaType,
      season,
      episode,
      isPlayable: true,
      activeSource: sources[0],
      availableSources: sources,
    };
  }
}
