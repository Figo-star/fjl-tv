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
  subtitles?: {
    url: string;
    label: string;
    lang: string;
    language?: string;
    format?: string;
    source?: string;
  }[];
}

/**
 * Validates that an HLS stream is actually playable (sub-manifest loads with HTTP 200).
 * Rejects 502/expired/broken streams so the player never stalls on dead upstream HLS nodes.
 */
async function verifyHlsPlayability(m3u8Url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500); // 2.5s fast verification
    const res = await fetch(m3u8Url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return false;
    const text = await res.text();
    const subLine = text.split('\n').find((l) => l.startsWith('http') && l.includes('.m3u8'));
    if (!subLine) return false;

    // Check sub-manifest
    const subController = new AbortController();
    const subTimeout = setTimeout(() => subController.abort(), 2500);
    const subRes = await fetch(subLine, { signal: subController.signal });
    clearTimeout(subTimeout);

    return subRes.status === 200;
  } catch {
    return false;
  }
}

export class PlaybackResolver {
  /**
   * Resolves playable streams for an exact media item.
   * Priority:
   * 1. Verified Working Direct HLS stream (if sub-manifest loads with 200).
   * 2. VidLink Pro (primary fast embed with progress postMessage API support).
   * 3. Videasy (reliable fallback embed).
   * 4. VidSrc TO & VidSrc ME (alternative third-party embeds).
   *
   * If a direct HLS source exists but is experiencing upstream 502s, it is placed as an
   * alternate source rather than primary, allowing the user to select it manually while
   * immediately playing from a working verified provider.
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

    const directSources: StreamSource[] = [];
    let directIsHealthy = false;
    let resolvedSubtitles: { url: string; label: string; lang: string }[] = [];

    // 1. Attempt direct HLS stream resolution from upstream backend cluster
    for (const base of BACKEND_POOLS) {
      try {
        const streamType = mediaType === 'anime' ? 'anime' : mediaType;
        let url = `${base}/api/stream?type=${streamType}&id=${encodeURIComponent(mediaId)}`;
        if (mediaType === 'tv' || mediaType === 'anime') {
          url += `&season=${season}&episode=${episode}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

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
          if (Array.isArray(data.subtitles) && data.subtitles.length > 0) {
            resolvedSubtitles = data.subtitles.map((sub) => ({
              url: sub.url,
              label: sub.label || sub.language || sub.lang,
              lang: sub.lang || 'en',
            }));
          }

          if (data.success && Array.isArray(data.sources) && data.sources.length > 0) {
            for (let idx = 0; idx < data.sources.length; idx++) {
              const s = data.sources[idx];
              if (s.url && (s.url.startsWith('https://') || s.url.startsWith('http://'))) {
                // Check if stream is genuinely playable right now
                const isHealthy = await verifyHlsPlayability(s.url);
                if (isHealthy) directIsHealthy = true;

                directSources.push({
                  id: `direct-hls-${idx + 1}`,
                  name: `Direct Ad-Free Stream ${idx > 0 ? `(${idx + 1})` : ''}`.trim(),
                  quality: s.quality || 'Auto / 1080p',
                  type: 'hls',
                  url: s.url,
                  isAdFree: true,
                  supportsProgressTracking: true,
                  isAuthorizedDemo: false,
                  subtitles: resolvedSubtitles,
                });
              }
            }
            break;
          }
        }
      } catch {
        // Proceed to fallback pool
      }
    }

    // 2. Build verified embed providers
    const embedSources: StreamSource[] = [];

    if (mediaType === 'movie') {
      embedSources.push(
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
      embedSources.push(
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

    // Assemble final sources prioritizing working sources:
    // If direct HLS is verified healthy, put direct first; otherwise put VidLink/Videasy first
    const availableSources: StreamSource[] = directIsHealthy
      ? [...directSources, ...embedSources]
      : [...embedSources, ...directSources];

    // Development mode demo fixture fallback only if explicitly enabled
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
      subtitles: resolvedSubtitles,
    };
  }
}
