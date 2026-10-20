export interface MediaItem {
  id: string;
  title: string;
  overview: string;
  poster: string;
  backdrop: string;
  mediaType: 'movie' | 'tv' | 'anime';
  releaseYear: number;
  rating: number;
  duration?: string;
  genres: string[];
  seasonsCount?: number;
  totalEpisodes?: number;
  isFeatured?: boolean;
}

export interface Episode {
  id: string;
  episodeNumber: number;
  seasonNumber: number;
  title: string;
  overview: string;
  thumbnail: string;
  duration: string;
  airDate?: string;
}

export interface StreamSource {
  id: string;
  name: string;
  quality: string;
  type: 'hls' | 'mp4' | 'embed';
  url: string;
  isAuthorizedDemo?: boolean;
}

export interface PlaybackResolution {
  mediaId: string;
  mediaType: 'movie' | 'tv' | 'anime';
  season?: number;
  episode?: number;
  isPlayable: boolean;
  activeSource: StreamSource | null;
  availableSources: StreamSource[];
  unavailabilityReason?: string;
}

export interface WatchProgress {
  mediaId: string;
  mediaType: 'movie' | 'tv' | 'anime';
  title: string;
  poster: string;
  seasonNumber?: number;
  episodeNumber?: number;
  timestamp: number;
  duration: number;
  updatedAt: number;
}
