export interface MediaCast {
  id: number | string;
  name: string;
  character?: string;
  profilePath?: string;
}

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
  trailerYoutubeId?: string;
  cast?: MediaCast[];
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

export interface SubtitleTrack {
  url: string;
  label: string;
  lang: string;
  language?: string;
  format?: string;
  source?: string;
}

export interface StreamSource {
  id: string;
  name: string;
  quality: string;
  type: 'hls' | 'mp4' | 'embed';
  url: string;
  adWarning?: string;
  isAdFree?: boolean;
  supportsProgressTracking?: boolean;
  isAuthorizedDemo?: boolean;
  subtitles?: SubtitleTrack[];
}

export interface PlaybackResolution {
  mediaId: string;
  mediaType: 'movie' | 'tv' | 'anime';
  season?: number;
  episode?: number;
  isPlayable: boolean;
  activeSource: StreamSource | null;
  availableSources: StreamSource[];
  subtitles?: SubtitleTrack[];
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
