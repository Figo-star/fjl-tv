'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  FastForward,
  Settings,
  AlertTriangle,
  Server,
  ShieldCheck,
  SkipForward,
  RefreshCw,
  X,
  ExternalLink,
  Info,
  Loader2,
} from 'lucide-react';
import { StreamSource, MediaItem, PlaybackResolution } from '@/lib/types';
import { saveWatchProgress, getProgressForMedia, resetProgress } from '@/lib/storage';

type PlaybackState = 'resolving' | 'loading' | 'ready' | 'playing' | 'buffering' | 'failed';

interface VideoPlayerProps {
  media: MediaItem;
  resolution: PlaybackResolution;
  initialSeason?: number;
  initialEpisode?: number;
  nextEpisodeUrl?: string;
  nextEpisodeTitle?: string;
}

export default function VideoPlayer({
  media,
  resolution,
  initialSeason,
  initialEpisode,
  nextEpisodeUrl,
  nextEpisodeTitle,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [activeSource, setActiveSource] = useState<StreamSource | null>(resolution.activeSource);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('loading');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.9);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [errorMessage, setErrorMessage] = useState(resolution.unavailabilityReason || '');
  const [showControls, setShowControls] = useState(true);
  const [showServerPicker, setShowServerPicker] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [qualities, setQualities] = useState<{ id: number; height: number; bitrate: number }[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(5);
  const [needsClickToPlay, setNeedsClickToPlay] = useState(false);

  // Resume prompt state
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [savedResumeTime, setSavedResumeTime] = useState(0);

  // Track failover attempts to prevent infinite retry loops
  const failedSourceIdsRef = useRef<Set<string>>(new Set());
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stallTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Check saved progress on mount or content change
  useEffect(() => {
    const saved = getProgressForMedia(media.id, media.mediaType, initialSeason, initialEpisode);
    if (saved && saved.timestamp >= 15) {
      if (!saved.duration || saved.timestamp < saved.duration * 0.95) {
        setSavedResumeTime(saved.timestamp);
        setShowResumeModal(true);
      }
    } else {
      setShowResumeModal(false);
    }
  }, [media.id, media.mediaType, initialSeason, initialEpisode]);

  // Handle postMessage progress tracking from supported embed players (e.g. VidLink Pro)
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (
        typeof e.origin === 'string' &&
        (e.origin.includes('vidlink.pro') || e.origin.includes('videasy.to'))
      ) {
        try {
          const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
          if (data && typeof data === 'object') {
            if (data.type === 'MEDIA_DATA' || data.event === 'timeupdate') {
              const cur = Number(data.currentTime || data.time || 0);
              const dur = Number(data.duration || 0);
              if (cur > 0) {
                setCurrentTime(cur);
                if (dur > 0) setDuration(dur);
                setPlaybackState('playing');
                setIsPlaying(true);
                saveWatchProgress({
                  mediaId: media.id,
                  mediaType: media.mediaType,
                  title: media.title,
                  poster: media.poster,
                  seasonNumber: initialSeason,
                  episodeNumber: initialEpisode,
                  timestamp: Math.floor(cur),
                  duration: Math.floor(dur),
                });
              }
            }
          }
        } catch {
          // Ignore non-json messages
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [media.id, media.mediaType, media.title, media.poster, initialSeason, initialEpisode]);

  // Handle native video time updates
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 0;
    setCurrentTime(curr);
    setDuration(dur);

    if (stallTimeoutRef.current) clearTimeout(stallTimeoutRef.current);

    if (Math.floor(curr) % 5 === 0 && dur > 0) {
      saveWatchProgress({
        mediaId: media.id,
        mediaType: media.mediaType,
        title: media.title,
        poster: media.poster,
        seasonNumber: initialSeason,
        episodeNumber: initialEpisode,
        timestamp: Math.floor(curr),
        duration: Math.floor(dur),
      });
    }

    if (nextEpisodeUrl && dur > 30 && dur - curr <= 15 && !showCountdown) {
      setShowCountdown(true);
      setCountdownSeconds(10);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            if (nextEpisodeUrl) window.location.href = nextEpisodeUrl;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [media.id, media.mediaType, media.title, media.poster, initialSeason, initialEpisode, nextEpisodeUrl, showCountdown]);

  // Handle fatal error and failover to next viable provider
  const handleSourceFailure = useCallback(
    (reason: string) => {
      if (!activeSource) return;
      console.warn(`Source failed [${activeSource.name}]:`, reason);
      failedSourceIdsRef.current.add(activeSource.id);

      // Look for next untried source
      const nextSource = resolution.availableSources.find(
        (s) => !failedSourceIdsRef.current.has(s.id)
      );

      if (nextSource) {
        console.log(`Auto-switching to alternative server: ${nextSource.name}`);
        setPlaybackState('loading');
        setActiveSource(nextSource);
      } else {
        setPlaybackState('failed');
        setErrorMessage(
          'All playback servers for this title are currently unavailable or undergoing maintenance. Please select a server manually or retry later.'
        );
      }
    },
    [activeSource, resolution.availableSources]
  );

  // Initialize playback on active source change
  useEffect(() => {
    if (!activeSource) {
      setPlaybackState('failed');
      setErrorMessage(resolution.unavailabilityReason || 'Playback is currently unavailable for this title.');
      return;
    }

    setPlaybackState('loading');
    setErrorMessage('');
    setQualities([]);
    setNeedsClickToPlay(false);

    if (stallTimeoutRef.current) clearTimeout(stallTimeoutRef.current);

    // If source is an iframe embed
    if (activeSource.type === 'embed') {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      setPlaybackState('ready');
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const streamUrl = activeSource.url;

    // Set a bounded stall detector (6s): if neither play nor timeupdate fires, failover gracefully
    stallTimeoutRef.current = setTimeout(() => {
      if (activeSource.type === 'hls' && video.paused && video.currentTime === 0) {
        console.warn('Playback stalled on stream start; attempting failover...');
        handleSourceFailure('Stream stalled on buffer attach');
      }
    }, 6000);

    if (activeSource.type === 'hls') {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          manifestLoadingTimeOut: 5000,
          manifestLoadingMaxRetry: 1,
          levelLoadingTimeOut: 5000,
          levelLoadingMaxRetry: 1,
          fragLoadingTimeOut: 5000,
          fragLoadingMaxRetry: 1,
        });

        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          setPlaybackState('ready');
          setQualities(
            data.levels.map((lvl, index) => ({
              id: index,
              height: lvl.height,
              bitrate: lvl.bitrate,
            }))
          );

          video.play().catch((err) => {
            if (err.name === 'NotAllowedError') {
              setNeedsClickToPlay(true);
            }
            setIsPlaying(false);
          });
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            handleSourceFailure(`HLS fatal: ${data.type} - ${data.details}`);
          }
        });

        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.play().catch((err) => {
          if (err.name === 'NotAllowedError') setNeedsClickToPlay(true);
          setIsPlaying(false);
        });
      }
    } else {
      video.src = streamUrl;
      video.play().catch((err) => {
        if (err.name === 'NotAllowedError') setNeedsClickToPlay(true);
        setIsPlaying(false);
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (stallTimeoutRef.current) clearTimeout(stallTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [activeSource, handleSourceFailure, resolution.unavailabilityReason]);

  // Resume Action: Restore to saved timestamp
  const handleResume = () => {
    setShowResumeModal(false);
    if (activeSource?.type === 'hls' && videoRef.current) {
      videoRef.current.currentTime = savedResumeTime;
      setCurrentTime(savedResumeTime);
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else if (activeSource?.type === 'embed' && iframeRef.current) {
      try {
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ type: 'SEEK', time: savedResumeTime }),
          '*'
        );
      } catch {
        // Embed controls own resume
      }
    }
  };

  // Start From Beginning Action: Resets position and removes progress
  const handleStartFromBeginning = () => {
    setShowResumeModal(false);
    resetProgress(media.id, initialSeason, initialEpisode);
    setCurrentTime(0);
    if (activeSource?.type === 'hls' && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else if (activeSource?.type === 'embed' && iframeRef.current) {
      try {
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ type: 'SEEK', time: 0 }),
          '*'
        );
      } catch {
        // Embed controls own resume
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
      setNeedsClickToPlay(false);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const next = !videoRef.current.muted;
    videoRef.current.muted = next;
    setIsMuted(next);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const skipTime = (offset: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + offset));
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleQualityChange = (levelId: number) => {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = levelId;
    setCurrentQuality(levelId);
    setShowQualityMenu(false);
  };

  const handleSpeedChange = (speed: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3500);
  };

  const remainingTime = Math.max(0, duration - currentTime);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 select-none group focus:outline-none"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'k') {
          e.preventDefault();
          togglePlay();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          skipTime(10);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          skipTime(-10);
        } else if (e.key === 'f') {
          e.preventDefault();
          toggleFullscreen();
        } else if (e.key === 'm') {
          e.preventDefault();
          toggleMute();
        }
      }}
    >
      {/* Top Header Bar / Server Switcher */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2">
          {activeSource?.isAdFree ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-black/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30 shadow-md">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Ad-Free Direct Stream
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-black/80 backdrop-blur-md text-amber-400 border border-amber-500/30 shadow-md">
              <ExternalLink className="w-3.5 h-3.5" />
              Embedded Player
            </span>
          )}

          {activeSource && (
            <span className="text-xs text-slate-300 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 hidden sm:inline-block">
              {activeSource.name}
            </span>
          )}

          {activeSource?.adWarning && (
            <span className="text-[11px] text-amber-300/90 px-2.5 py-0.5 rounded-full bg-amber-950/60 border border-amber-500/20 hidden md:inline-block">
              ⚠️ {activeSource.adWarning}
            </span>
          )}
        </div>

        {/* Server Picker Dropdown Button */}
        {resolution.availableSources.length > 1 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowServerPicker(!showServerPicker)}
              id="server-picker-button"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-black/80 hover:bg-black/95 border border-white/20 text-xs font-semibold text-slate-200 transition-colors shadow-lg"
            >
              <Server className="w-3.5 h-3.5 text-cyan-400" />
              <span>Servers ({resolution.availableSources.length})</span>
            </button>

            {showServerPicker && (
              <div className="absolute right-0 top-10 z-30 p-2 rounded-xl glass-panel w-72 space-y-1 shadow-2xl border border-white/15">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-2">
                  Select Playback Server
                </div>
                {resolution.availableSources.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setActiveSource(s);
                      setShowServerPicker(false);
                      failedSourceIdsRef.current.delete(s.id);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium flex flex-col gap-0.5 transition-colors ${
                      activeSource && s.id === activeSource.id
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-200 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold line-clamp-1">{s.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono ml-2">{s.quality}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      {s.isAdFree ? (
                        <span className="text-emerald-400 font-medium">✓ Zero Ads</span>
                      ) : (
                        <span className="text-amber-400/90">⚠️ Sponsor Ads / Tabs</span>
                      )}
                      <span>·</span>
                      <span>{s.supportsProgressTracking ? 'Tracks Resume' : 'Player controls resume'}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Embedded Player (Iframe) */}
      {activeSource && activeSource.type === 'embed' && (
        <iframe
          ref={iframeRef}
          src={activeSource.url}
          title={media.title}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      )}

      {/* HTML5 / HLS Native Video Player */}
      {activeSource && activeSource.type !== 'embed' && (
        <video
          ref={videoRef}
          onClick={togglePlay}
          onPlay={() => {
            setIsPlaying(true);
            setPlaybackState('playing');
          }}
          onPause={() => {
            setIsPlaying(false);
            if (playbackState === 'playing') setPlaybackState('ready');
          }}
          onWaiting={() => setPlaybackState('buffering')}
          onPlaying={() => setPlaybackState('playing')}
          onTimeUpdate={handleTimeUpdate}
          className="w-full h-full object-contain cursor-pointer"
          playsInline
        />
      )}

      {/* Autoplay blocked: 'Click to play' action */}
      {needsClickToPlay && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <button
            type="button"
            onClick={togglePlay}
            className="flex items-center gap-3 px-6 py-3 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-2xl shadow-cyan-500/40 hover:scale-105 active:scale-95 transition-all"
          >
            <Play className="w-6 h-6 fill-slate-950" />
            <span>Click to start playback</span>
          </button>
        </div>
      )}

      {/* Embedded Player Notice Banner (Bottom) */}
      {activeSource && activeSource.type === 'embed' && (
        <div className="absolute bottom-3 left-4 right-4 z-10 pointer-events-none flex items-center justify-between text-[11px] text-slate-400 bg-black/85 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span>
              {activeSource.supportsProgressTracking
                ? 'Accurate progress is synchronized with FJL TV history via player events.'
                : 'Resume is controlled by this player.'}
            </span>
          </div>
          {activeSource.adWarning && (
            <span className="text-amber-400 hidden sm:inline">{activeSource.adWarning}</span>
          )}
        </div>
      )}

      {/* Continue Watching / Resume Prompt Modal */}
      {showResumeModal && (
        <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl max-w-md w-full border border-cyan-500/30 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Continue watching?</h3>
              <p className="text-sm text-slate-300 mt-1">
                You stopped at{' '}
                <span className="font-mono text-cyan-400 font-bold">{formatTime(savedResumeTime)}</span>
                {media.mediaType !== 'movie' && initialSeason && initialEpisode && (
                  <span className="text-slate-400"> (S{initialSeason}:E{initialEpisode})</span>
                )}
                .
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleResume}
                className="flex-1 py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02]"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                Resume from {formatTime(savedResumeTime)}
              </button>

              <button
                type="button"
                onClick={handleStartFromBeginning}
                className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                Start from beginning
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Honest Error / Unavailable State with Retry */}
      {playbackState === 'failed' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-slate-950/95 backdrop-blur-md text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400 mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">Playback Error</h3>
          <p className="text-sm text-slate-300 max-w-md mb-6">{errorMessage}</p>
          <div className="flex gap-2 flex-wrap justify-center">
            {resolution.availableSources.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  failedSourceIdsRef.current.clear();
                  setActiveSource(s);
                  setPlaybackState('loading');
                }}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeSource && s.id === activeSource.id
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                Switch to {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Next Episode Auto-Play Countdown Overlay */}
      {showCountdown && nextEpisodeUrl && (
        <div className="absolute bottom-20 right-6 z-40 bg-black/90 backdrop-blur-md border border-cyan-500/40 p-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in fade-in duration-300">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">Next Episode</span>
            <span className="text-xs text-white font-medium max-w-[180px] line-clamp-1">
              {nextEpisodeTitle || 'Upcoming episode'}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5">Playing in {countdownSeconds}s</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={nextEpisodeUrl}
              className="px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 transition-colors flex items-center gap-1"
            >
              <SkipForward className="w-3.5 h-3.5 fill-current" />
              Play Now
            </a>
            <button
              onClick={() => {
                if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                setShowCountdown(false);
              }}
              aria-label="Cancel auto-play"
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Buffering Indicator */}
      {playbackState === 'buffering' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="p-3.5 rounded-full bg-black/75 backdrop-blur-md text-cyan-400 shadow-xl">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </div>
      )}

      {/* Overlay Controls for Direct HTML5/HLS Player */}
      {activeSource && activeSource.type !== 'embed' && (
        <div
          className={`absolute inset-0 z-10 flex flex-col justify-end p-4 bg-gradient-to-t from-black/85 via-black/20 to-transparent transition-opacity duration-300 ${
            showControls || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="space-y-2">
            {/* Progress Timeline Scrubber */}
            <div className="relative w-full flex items-center">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                aria-label="Seek timeline"
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:h-2.5 transition-all"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2.5 sm:gap-3">
                {/* Play/Pause */}
                <button
                  type="button"
                  onClick={togglePlay}
                  id="player-play-pause-btn"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  className="p-2 rounded-full bg-white/10 hover:bg-cyan-500 hover:text-slate-950 text-white transition-colors"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>

                {/* Start From Beginning */}
                <button
                  type="button"
                  onClick={handleStartFromBeginning}
                  title="Start from beginning (resets progress)"
                  aria-label="Start from beginning"
                  className="p-1.5 text-slate-300 hover:text-cyan-400 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                {/* Skip Controls */}
                <button
                  type="button"
                  onClick={() => skipTime(-10)}
                  aria-label="Rewind 10 seconds"
                  className="p-1.5 text-slate-300 hover:text-white transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => skipTime(10)}
                  aria-label="Fast forward 10 seconds"
                  className="p-1.5 text-slate-300 hover:text-white transition-colors"
                >
                  <FastForward className="w-4 h-4" />
                </button>

                {/* Volume Controls */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={toggleMute}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                    className="p-1.5 text-slate-300 hover:text-white transition-colors"
                  >
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    aria-label="Volume slider"
                    className="w-16 h-1 bg-white/20 rounded-lg appearance-none accent-cyan-400 cursor-pointer hidden sm:block"
                  />
                </div>

                {/* Timestamp & Remaining Time */}
                <div className="text-xs text-slate-300 font-mono flex items-center gap-1">
                  <span>{formatTime(currentTime)}</span>
                  <span className="text-slate-500">/</span>
                  <span>{formatTime(duration)}</span>
                  {duration > 0 && (
                    <span className="text-[11px] text-slate-400 hidden md:inline-block ml-1.5">
                      ({formatTime(remainingTime)} left)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                {/* Next Episode Button if series */}
                {nextEpisodeUrl && (
                  <a
                    href={nextEpisodeUrl}
                    title="Next Episode"
                    aria-label="Next Episode"
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-cyan-500 hover:text-slate-950 text-white transition-colors flex items-center gap-1 text-xs font-semibold px-2.5"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Next Ep</span>
                  </a>
                )}

                {/* Speed Switcher */}
                <div className="flex items-center gap-1 text-xs hidden sm:flex">
                  {[1, 1.25, 1.5].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => handleSpeedChange(spd)}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                        playbackSpeed === spd ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>

                {/* Quality Menu */}
                {qualities.length > 0 && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowQualityMenu(!showQualityMenu)}
                      aria-label="Video Quality"
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-medium"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>{currentQuality === -1 ? 'Auto' : `${qualities[currentQuality]?.height}p`}</span>
                    </button>

                    {showQualityMenu && (
                      <div className="absolute right-0 bottom-8 z-30 p-2 rounded-xl glass-panel w-32 space-y-1 shadow-2xl">
                        <button
                          onClick={() => handleQualityChange(-1)}
                          className={`w-full text-left px-2.5 py-1.5 rounded text-xs ${
                            currentQuality === -1 ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          Auto (Adaptive)
                        </button>
                        {qualities.map((q) => (
                          <button
                            key={q.id}
                            onClick={() => handleQualityChange(q.id)}
                            className={`w-full text-left px-2.5 py-1.5 rounded text-xs ${
                              currentQuality === q.id ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            {q.height}p ({Math.round(q.bitrate / 1000)}k)
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Fullscreen */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  id="player-fullscreen-btn"
                  aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                  className="p-1.5 text-slate-300 hover:text-white transition-colors"
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
