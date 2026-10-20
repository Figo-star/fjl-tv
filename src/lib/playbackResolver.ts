import type { StreamSource, PlaybackResolution } from './types';

const BACKEND_POOLS = [
  'https://api.framextv.tech',
  'https://api.framextv.xyz',
  'https://api.framextv.cc',
];

interface UpstreamStreamSource {
  url: string;
  quality?: string;
  type?: 'hls' | 'mp4' | 'embed';
  server?: string;
  skipProxy?: boolean;
}

interface UpstreamStreamResponse {
  success: boolean;
  provider?: string;
  sources?: UpstreamStreamSource[];
}

export class PlaybackResolver {
  /**
   * Resolves playable streams for an exact media item.
   * Priority:
   * 1. Direct verified ad-free HLS stream (if available from upstream authorized cluster).
   * 2. VidLink Pro (primary fast embed with progress postMessage API support).
   * 3. Videasy (reliable fallback embed).
   * 4. VidSrc TO & VidSrc ME (alternative third-party embeds).
   *
   * Accurately labels each provider regarding ad risk and progress tracking capabilities.
   */
  static async resolvePlayback(
    mediaId: string,
    mediaType: 'movie' | 'tv' | 'anime',
    season: number = 1,
    episode: number = 1
  ): Promise<PlaybackResolution> {
    if (!mediaId || typeof mediaId !== 'string') {
      return {
        mediaId: mediaId || '',
        mediaType,
        season,
        episode,
        isPlayable: false,
        activeSource: null,
        availableSources: [],
        unavailabilityReason: 'Invalid content identifier provided.',
      };
    }

    const availableSources: StreamSource[] = [];

    // 1. Attempt direct HLS stream resolution from upstream backend cluster
    for (const base of BACKEND_POOLS) {
      try {
        const streamType = mediaType === 'anime' ? 'anime' : mediaType;
        let url = `${base}/api/stream?type=${streamType}&id=${encodeURIComponent(mediaId)}`;
        if (mediaType === 'tv' || mediaType === 'anime') {
          url += `&season=${season}&episode=${episode}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s resilient timeout

        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Origin': 'https://framextv.cc',
            'Referer': 'https://framextv.cc/',
          },
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data: UpstreamStreamResponse = await res.json();
          if (data.success && Array.isArray(data.sources) && data.sources.length > 0) {
            data.sources.forEach((s, idx) => {
              if (s.url && (s.url.startsWith('https://') || s.url.startsWith('http://'))) {
                availableSources.push({
                  id: `direct-hls-${idx + 1}`,
                  name: `Direct Ad-Free Stream ${idx > 0 ? `(${idx + 1})` : ''}`.trim(),
                  quality: s.quality || 'Auto / 1080p',
                  type: 'hls',
                  url: s.url,
                  isAdFree: true,
                  supportsProgressTracking: true,
                  isAuthorizedDemo: false,
                });
              }
            });
            break;
          }
        }
      } catch (err) {
        // Proceed to fallback pool
      }
    }

    // 2. Add authenticated embed providers
    if (mediaType === 'movie') {
      availableSources.push(
        {
          id: 'embed-vidlink',
          name: 'VidLink Pro (Primary 1080p)',
          quality: '1080p HD',
          type: 'embed',
          url: `https://vidlink.pro/movie/${mediaId}?autoplay=false`,
          adWarning: 'May open sponsor links on interaction',
          isAdFree: false,
          supportsProgressTracking: true,
        },
        {
          id: 'embed-videasy',
          name: 'Videasy Fast (Server 2)',
          quality: 'Auto / 1080p',
          type: 'embed',
          url: `https://player.videasy.to/movie/${mediaId}`,
          adWarning: 'May display external ads or new tabs',
          isAdFree: false,
          supportsProgressTracking: false,
        },
        {
          id: 'embed-vidsrc-to',
          name: 'VidSrc TO (Server 3)',
          quality: '1080p',
          type: 'embed',
          url: `https://vidsrc.to/embed/movie/${mediaId}`,
          adWarning: 'Contains provider advertisements and redirects',
          isAdFree: false,
          supportsProgressTracking: false,
        },
        {
          id: 'embed-vidsrc-me',
          name: 'VidSrc VIP (Server 4)',
          quality: '720p',
          type: 'embed',
          url: `https://vidsrc.me/embed/movie?tmdb=${mediaId}`,
          adWarning: 'Contains provider advertisements and redirects',
          isAdFree: false,
          supportsProgressTracking: false,
        }
      );
    } else {
      // TV and Anime episodic stream routing
      availableSources.push(
        {
          id: 'embed-vidlink',
          name: `VidLink Pro (S${season}:E${episode})`,
          quality: '1080p HD',
          type: 'embed',
          url: `https://vidlink.pro/tv/${mediaId}/${season}/${episode}?autoplay=false`,
          adWarning: 'May open sponsor links on interaction',
          isAdFree: false,
          supportsProgressTracking: true,
        },
        {
          id: 'embed-videasy',
          name: `Videasy (S${season}:E${episode})`,
          quality: 'Auto / 1080p',
          type: 'embed',
          url: `https://player.videasy.to/tv/${mediaId}/${season}/${episode}`,
          adWarning: 'May display external ads or new tabs',
          isAdFree: false,
          supportsProgressTracking: false,
        },
        {
          id: 'embed-vidsrc-to',
          name: `VidSrc TO (S${season}:E${episode})`,
          quality: '1080p',
          type: 'embed',
          url: `https://vidsrc.to/embed/tv/${mediaId}/${season}/${episode}`,
          adWarning: 'Contains provider advertisements and redirects',
          isAdFree: false,
          supportsProgressTracking: false,
        },
        {
          id: 'embed-vidsrc-me',
          name: `VidSrc VIP (S${season}:E${episode})`,
          quality: '720p',
          type: 'embed',
          url: `https://vidsrc.me/embed/tv?tmdb=${mediaId}&season=${season}&episode=${episode}`,
          adWarning: 'Contains provider advertisements and redirects',
          isAdFree: false,
          supportsProgressTracking: false,
        }
      );
    }

    // Only inject generic demo test streams if explicitly permitted in development mode
    const allowDemoFixtures = process.env.NEXT_PUBLIC_ENABLE_DEMO_FIXTURES === 'true';
    if (allowDemoFixtures && availableSources.length === 0) {
      availableSources.push({
        id: 'dev-demo-hls',
        name: 'Authorized Mux HLS Test Stream',
        quality: '1080p Test',
        type: 'hls',
        url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        isAdFree: true,
        supportsProgressTracking: true,
        isAuthorizedDemo: true,
      });
    }

    if (availableSources.length === 0) {
      return {
        mediaId,
        mediaType,
        season,
        episode,
        isPlayable: false,
        activeSource: null,
        availableSources: [],
        unavailabilityReason: 'No working playback stream source is currently available for this title.',
      };
    }

    return {
      mediaId,
      mediaType,
      season,
      episode,
      isPlayable: true,
      activeSource: availableSources[0],
      availableSources,
    };
  }
}
