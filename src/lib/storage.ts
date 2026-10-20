import { WatchProgress, MediaItem } from './types';

const STORAGE_KEY_PROGRESS = 'fjl_tv_watch_progress';
const STORAGE_KEY_FAVORITES = 'fjl_tv_favorites';

export function getWatchProgress(): WatchProgress[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROGRESS);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed reading progress', err);
    return [];
  }
}

export function getProgressForMedia(
  mediaId: string,
  mediaType: 'movie' | 'tv' | 'anime',
  seasonNumber?: number,
  episodeNumber?: number
): WatchProgress | null {
  const all = getWatchProgress();
  if (mediaType === 'movie') {
    return all.find((p) => p.mediaId === mediaId) || null;
  }
  return (
    all.find(
      (p) =>
        p.mediaId === mediaId &&
        p.seasonNumber === (seasonNumber || 1) &&
        p.episodeNumber === (episodeNumber || 1)
    ) || null
  );
}

export function saveWatchProgress(progress: Omit<WatchProgress, 'updatedAt'>): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getWatchProgress().filter((p) => {
      if (progress.mediaType === 'movie') {
        return p.mediaId !== progress.mediaId;
      }
      return !(
        p.mediaId === progress.mediaId &&
        p.seasonNumber === progress.seasonNumber &&
        p.episodeNumber === progress.episodeNumber
      );
    });

    list.unshift({
      ...progress,
      updatedAt: Date.now(),
    });

    localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(list.slice(0, 30)));
    window.dispatchEvent(new Event('fjl_progress_updated'));
  } catch (err) {
    console.error('Failed saving progress', err);
  }
}

export function removeWatchProgress(
  mediaId: string,
  seasonNumber?: number,
  episodeNumber?: number
): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getWatchProgress().filter((p) => {
      if (seasonNumber !== undefined && episodeNumber !== undefined) {
        return !(p.mediaId === mediaId && p.seasonNumber === seasonNumber && p.episodeNumber === episodeNumber);
      }
      return p.mediaId !== mediaId;
    });

    localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(list));
    window.dispatchEvent(new Event('fjl_progress_updated'));
  } catch (err) {
    console.error('Failed removing progress', err);
  }
}

export function resetProgress(
  mediaId: string,
  seasonNumber?: number,
  episodeNumber?: number
): void {
  removeWatchProgress(mediaId, seasonNumber, episodeNumber);
}

export function getFavorites(): MediaItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FAVORITES);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed reading favorites', err);
    return [];
  }
}

export function toggleFavorite(media: MediaItem): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const list = getFavorites();
    const exists = list.some((m) => m.id === media.id);
    let updated: MediaItem[];
    if (exists) {
      updated = list.filter((m) => m.id !== media.id);
    } else {
      updated = [media, ...list];
    }
    localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(updated));
    window.dispatchEvent(new Event('fjl_favorites_updated'));
    return !exists;
  } catch (err) {
    console.error('Failed toggling favorite', err);
    return false;
  }
}

export function isFavorite(mediaId: string): boolean {
  if (typeof window === 'undefined') return false;
  const list = getFavorites();
  return list.some((m) => m.id === mediaId);
}
