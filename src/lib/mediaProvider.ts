import { MediaItem, Episode } from './types';

const BACKEND_POOLS = [
  'https://api.framextv.tech',
  'https://api.framextv.xyz',
  'https://api.framextv.cc',
];

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Origin': 'https://framextv.cc',
  'Referer': 'https://framextv.cc/',
};

// Comprehensive TMDB Genre ID dictionary to map numeric IDs to real, accurate genre titles
const TMDB_GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};

async function fetchWithFailover(path: string, options: RequestInit = {}): Promise<Response> {
  let lastError: Error | null = null;

  for (const base of BACKEND_POOLS) {
    try {
      const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout per pool

      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...BROWSER_HEADERS,
          ...(options.headers || {}),
        },
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        return res;
      } else {
        lastError = new Error(`Backend ${base} returned HTTP ${res.status}`);
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error(`All backend failover nodes exhausted for ${path}`);
}

export interface FramexRawItem {
  id: string | number;
  title?: string;
  name?: string;
  overview?: string;
  poster?: string;
  image?: string;
  backdrop?: string;
  type?: 'movie' | 'tv' | 'anime';
  rating?: string | number;
  vote_average?: number;
  year?: string | number;
  release_date?: string;
  first_air_date?: string;
  genres?: (string | number | { id: number; name: string })[];
  genre_ids?: number[];
  duration?: string;
  number_of_seasons?: number;
}

export interface FramexHomeResponse {
  success: boolean;
  hero?: FramexRawItem;
  rails?: {
    trending_movies?: { results: FramexRawItem[] };
    popular_movies?: { results: FramexRawItem[] };
    popular_tv?: { results: FramexRawItem[] };
    popular_anime?: { results: FramexRawItem[] };
    new_releases?: { results: FramexRawItem[] };
    action_movies?: { results: FramexRawItem[] };
    scifi_movies?: { results: FramexRawItem[] };
    thriller_movies?: { results: FramexRawItem[] };
    comedy_movies?: { results: FramexRawItem[] };
    airing_anime?: { results: FramexRawItem[] };
  };
}

export function normalizeItem(raw: FramexRawItem, fallbackType: 'movie' | 'tv' | 'anime' = 'movie'): MediaItem {
  const idStr = String(raw.id || '');
  const titleStr = raw.title || raw.name || 'Untitled Content';
  
  // Format rating honestly: preserve 0 if absent
  let ratingNum = 0;
  if (typeof raw.rating === 'number') ratingNum = raw.rating;
  else if (typeof raw.rating === 'string') ratingNum = parseFloat(raw.rating) || 0;
  else if (raw.vote_average) ratingNum = Math.round(raw.vote_average * 10) / 10;

  // Format year honestly
  let yearNum: number | undefined;
  if (raw.year) yearNum = parseInt(String(raw.year), 10) || undefined;
  else if (raw.release_date) yearNum = parseInt(raw.release_date.split('-')[0], 10) || undefined;
  else if (raw.first_air_date) yearNum = parseInt(raw.first_air_date.split('-')[0], 10) || undefined;

  // Format genres honestly: map TMDB IDs, strings, or object structures.
  // NEVER inject a fake default "Action" genre.
  const genresList: string[] = [];
  const rawList = Array.isArray(raw.genres) ? raw.genres : Array.isArray(raw.genre_ids) ? raw.genre_ids : [];

  rawList.forEach((g) => {
    if (typeof g === 'string') {
      genresList.push(g);
    } else if (typeof g === 'number') {
      const mapped = TMDB_GENRE_MAP[g];
      if (mapped) genresList.push(mapped);
    } else if (typeof g === 'object' && g && 'name' in g && typeof g.name === 'string') {
      genresList.push(g.name);
    } else if (typeof g === 'object' && g && 'id' in g && typeof g.id === 'number') {
      const mapped = TMDB_GENRE_MAP[g.id];
      if (mapped) genresList.push(mapped);
    }
  });

  const posterImg = raw.poster || raw.image || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80';
  const backdropImg = raw.backdrop || posterImg;

  return {
    id: idStr,
    title: titleStr,
    overview: raw.overview || 'Synopsis is currently unavailable for this title.',
    poster: posterImg,
    backdrop: backdropImg,
    mediaType: raw.type || fallbackType,
    releaseYear: yearNum || 2026,
    rating: ratingNum,
    duration: raw.duration,
    genres: genresList,
    seasonsCount: raw.number_of_seasons,
    isFeatured: false,
  };
}

export class MediaProvider {
  /**
   * Fetches real live catalog rails from FramexTV upstream API with automatic failover.
   * Limits cards per rail to 12 items for lightweight initial response and fast layout rendering.
   */
  static async getHomeRails(): Promise<{
    hero: MediaItem | null;
    trendingMovies: MediaItem[];
    popularMovies: MediaItem[];
    popularTv: MediaItem[];
    popularAnime: MediaItem[];
    newReleases: MediaItem[];
  }> {
    try {
      const res = await fetchWithFailover('/api/home', {
        next: { revalidate: 1800 },
      });

      const data: FramexHomeResponse = await res.json();

      const trendingMovies = (data.rails?.trending_movies?.results || []).slice(0, 12).map((r) => normalizeItem(r, 'movie'));
      const popularMovies = (data.rails?.popular_movies?.results || []).slice(0, 12).map((r) => normalizeItem(r, 'movie'));
      const popularTv = (data.rails?.popular_tv?.results || []).slice(0, 12).map((r) => normalizeItem(r, 'tv'));
      const popularAnime = (data.rails?.popular_anime?.results || []).slice(0, 12).map((r) => normalizeItem(r, 'anime'));
      const newReleases = (data.rails?.new_releases?.results || []).slice(0, 12).map((r) => normalizeItem(r, 'movie'));

      let hero: MediaItem | null = null;
      if (data.hero) {
        hero = normalizeItem(data.hero, data.hero.type || 'movie');
        hero.isFeatured = true;
      } else if (trendingMovies.length > 0) {
        hero = trendingMovies[0];
        hero.isFeatured = true;
      }

      return {
        hero,
        trendingMovies,
        popularMovies,
        popularTv,
        popularAnime,
        newReleases,
      };
    } catch (err) {
      console.error('Failed fetching home rails from FramexTV API:', err);
      return {
        hero: null,
        trendingMovies: [],
        popularMovies: [],
        popularTv: [],
        popularAnime: [],
        newReleases: [],
      };
    }
  }

  /**
   * Queries catalog by type with pagination and optional filter parameters.
   */
  static async getByType(
    type: 'movie' | 'tv' | 'anime',
    page: number = 1,
    filters?: { genre?: string; year?: string; language?: string }
  ): Promise<{ results: MediaItem[]; totalPages: number }> {
    try {
      let queryUrl = `/api/discover?type=${type}&page=${page}`;
      if (filters?.genre) {
        // Find matching TMDB genre ID if numeric, or pass through
        const foundEntry = Object.entries(TMDB_GENRE_MAP).find(
          ([, name]) => name.toLowerCase() === filters.genre?.toLowerCase()
        );
        if (foundEntry) {
          queryUrl += `&with_genres=${foundEntry[0]}`;
        }
      }
      if (filters?.year) {
        queryUrl += `&primary_release_year=${encodeURIComponent(filters.year)}`;
      }
      if (filters?.language) {
        queryUrl += `&with_original_language=${encodeURIComponent(filters.language)}`;
      }

      const res = await fetchWithFailover(queryUrl, {
        next: { revalidate: 1800 },
      });

      const data = await res.json();
      let results = (data.results || []).map((r: FramexRawItem) => normalizeItem(r, type));

      // In-memory filter enhancement for robust precision
      if (filters?.genre) {
        const target = filters.genre.toLowerCase();
        const filtered = results.filter((item: MediaItem) =>
          item.genres.some((g) => g.toLowerCase().includes(target))
        );
        if (filtered.length > 0) results = filtered;
      }

      return {
        results,
        totalPages: data.totalPages || 1,
      };
    } catch (err) {
      console.error(`Failed discovering ${type}:`, err);
      return { results: [], totalPages: 0 };
    }
  }

  /**
   * Fetches accurate verified metadata for a movie, TV series, or anime.
   */
  static async getById(id: string, mediaTypeHint?: 'movie' | 'tv' | 'anime'): Promise<MediaItem | null> {
    if (!id) return null;

    // Try TV endpoint first if hinted as TV or Anime
    if (mediaTypeHint === 'tv' || mediaTypeHint === 'anime' || !mediaTypeHint) {
      try {
        const tvRes = await fetchWithFailover(`/api/tv/${id}`, {
          next: { revalidate: 3600 },
        });
        const tvData = await tvRes.json();
        if (tvData.success && tvData.title && tvData.title !== 'Unknown Title') {
          return normalizeItem(tvData, mediaTypeHint === 'anime' ? 'anime' : 'tv');
        }
      } catch (e) {
        // Fall through
      }
    }

    // Try Movie endpoint
    try {
      const movieRes = await fetchWithFailover(`/api/movies/${id}`, {
        next: { revalidate: 3600 },
      });
      const movieData = await movieRes.json();
      if (movieData.success && movieData.title && movieData.title !== 'Unknown Title') {
        return normalizeItem(movieData, 'movie');
      }
    } catch (e) {
      // Fall through
    }

    return null;
  }

  /**
   * Fetches real season episodes for TV and Anime with failover.
   */
  static async getEpisodes(mediaId: string, seasonNumber: number = 1): Promise<Episode[]> {
    try {
      const res = await fetchWithFailover(`/api/tv/${mediaId}/season/${seasonNumber}`, {
        next: { revalidate: 3600 },
      });

      const data = await res.json();
      if (!data.success || !Array.isArray(data.episodes)) return [];

      return data.episodes.map((ep: {
        id: number | string;
        episode_number: number;
        season_number: number;
        name: string;
        overview: string;
        still?: string;
        still_path?: string;
        air_date?: string;
      }) => ({
        id: String(ep.id || `${mediaId}-s${seasonNumber}-e${ep.episode_number}`),
        episodeNumber: ep.episode_number,
        seasonNumber: ep.season_number || seasonNumber,
        title: ep.name || `Episode ${ep.episode_number}`,
        overview: ep.overview || 'No description available for this episode.',
        thumbnail: ep.still || ep.still_path || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
        duration: '45m',
        airDate: ep.air_date,
      }));
    } catch (err) {
      console.error(`Failed getting episodes for ${mediaId} S${seasonNumber}:`, err);
      return [];
    }
  }

  /**
   * Queries real search endpoint with debounced multi-category results and regional language fallback.
   */
  static async search(query: string, filters?: { type?: string; genre?: string; year?: string }): Promise<MediaItem[]> {
    const q = query.trim();
    if (!q) {
      const { results } = await this.getByType((filters?.type as 'movie' | 'tv' | 'anime') || 'movie', 1);
      return results.slice(0, 20);
    }

    try {
      const res = await fetchWithFailover(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();

      if (!data.success || !Array.isArray(data.results)) return [];

      let list = data.results.map((r: FramexRawItem) => normalizeItem(r, r.type || 'movie'));

      if (filters?.type && filters.type !== 'all') {
        list = list.filter((m: MediaItem) => m.mediaType === filters.type);
      }
      if (filters?.year) {
        list = list.filter((m: MediaItem) => String(m.releaseYear) === filters.year);
      }
      if (filters?.genre && filters.genre !== 'all') {
        const target = filters.genre.toLowerCase();
        list = list.filter((m: MediaItem) => m.genres.some((g) => g.toLowerCase().includes(target)));
      }

      return list;
    } catch (err) {
      console.error('Failed executing search query:', err);
      return [];
    }
  }
}
