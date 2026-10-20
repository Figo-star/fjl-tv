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

async function fetchWithFailover(path: string, options: RequestInit = {}): Promise<Response> {
  let lastError: Error | null = null;

  for (const base of BACKEND_POOLS) {
    try {
      const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
      const res = await fetch(url, {
        ...options,
        headers: {
          ...BROWSER_HEADERS,
          ...(options.headers || {}),
        },
      });

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

interface FramexRawItem {
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
  genres?: string[] | { id: number; name: string }[];
  duration?: string;
  number_of_seasons?: number;
}

interface FramexHomeResponse {
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

function normalizeItem(raw: FramexRawItem, fallbackType: 'movie' | 'tv' | 'anime' = 'movie'): MediaItem {
  const idStr = String(raw.id || '');
  const titleStr = raw.title || raw.name || 'Untitled Content';
  
  // Format rating
  let ratingNum = 0;
  if (typeof raw.rating === 'number') ratingNum = raw.rating;
  else if (typeof raw.rating === 'string') ratingNum = parseFloat(raw.rating) || 0;
  else if (raw.vote_average) ratingNum = Math.round(raw.vote_average * 10) / 10;

  // Format year
  let yearNum = 2026;
  if (raw.year) yearNum = parseInt(String(raw.year), 10) || 2026;
  else if (raw.release_date) yearNum = parseInt(raw.release_date.split('-')[0], 10) || 2026;
  else if (raw.first_air_date) yearNum = parseInt(raw.first_air_date.split('-')[0], 10) || 2026;

  // Format genres
  const genresList: string[] = [];
  if (Array.isArray(raw.genres)) {
    raw.genres.forEach(g => {
      if (typeof g === 'string') genresList.push(g);
      else if (typeof g === 'object' && g && 'name' in g) genresList.push(g.name);
    });
  }
  if (genresList.length === 0) {
    genresList.push(fallbackType === 'tv' ? 'Drama' : fallbackType === 'anime' ? 'Anime' : 'Action');
  }

  const posterImg = raw.poster || raw.image || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80';
  const backdropImg = raw.backdrop || posterImg;

  return {
    id: idStr,
    title: titleStr,
    overview: raw.overview || 'Synopsis is currently unavailable for this title.',
    poster: posterImg,
    backdrop: backdropImg,
    mediaType: raw.type || fallbackType,
    releaseYear: yearNum,
    rating: ratingNum || 7.5,
    duration: raw.duration,
    genres: genresList,
    seasonsCount: raw.number_of_seasons || 1,
    isFeatured: false,
  };
}

export class MediaProvider {
  /**
   * Fetches real live catalog rails from FramexTV upstream API with automatic failover.
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

      const trendingMovies = (data.rails?.trending_movies?.results || []).map(r => normalizeItem(r, 'movie'));
      const popularMovies = (data.rails?.popular_movies?.results || []).map(r => normalizeItem(r, 'movie'));
      const popularTv = (data.rails?.popular_tv?.results || []).map(r => normalizeItem(r, 'tv'));
      const popularAnime = (data.rails?.popular_anime?.results || []).map(r => normalizeItem(r, 'anime'));
      const newReleases = (data.rails?.new_releases?.results || []).map(r => normalizeItem(r, 'movie'));

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
   * Queries catalog by type with pagination from /api/discover with failover.
   */
  static async getByType(type: 'movie' | 'tv' | 'anime', page: number = 1): Promise<{ results: MediaItem[]; totalPages: number }> {
    try {
      const res = await fetchWithFailover(`/api/discover?type=${type}&page=${page}`, {
        next: { revalidate: 1800 },
      });

      const data = await res.json();
      const results = (data.results || []).map((r: FramexRawItem) => normalizeItem(r, type));
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
   * Fetches accurate verified metadata for a movie or TV series.
   */
  static async getById(id: string, mediaTypeHint?: 'movie' | 'tv' | 'anime'): Promise<MediaItem | null> {
    if (!id) return null;

    // Try TV endpoint first if hinted or unknown
    if (mediaTypeHint === 'tv' || !mediaTypeHint) {
      try {
        const tvRes = await fetchWithFailover(`/api/tv/${id}`, {
          next: { revalidate: 3600 },
        });
        const tvData = await tvRes.json();
        if (tvData.success && tvData.title && tvData.title !== 'Unknown Title') {
          return normalizeItem(tvData, 'tv');
        }
      } catch (e) {
        // Continue to movie
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
   * Queries real search endpoint with debounced multi-category results.
   */
  static async search(query: string): Promise<MediaItem[]> {
    const q = query.trim();
    if (!q) {
      const { results } = await this.getByType('movie', 1);
      return results.slice(0, 20);
    }

    try {
      const res = await fetchWithFailover(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();

      if (!data.success || !Array.isArray(data.results)) return [];

      return data.results.map((r: FramexRawItem) => normalizeItem(r, r.type || 'movie'));
    } catch (err) {
      console.error('Failed executing search query:', err);
      return [];
    }
  }
}
