'use client';

import React, { useEffect, useRef, useState } from 'react';
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
} from 'lucide-react';
import { StreamSource, MediaItem, PlaybackResolution } from '@/lib/types';
import { saveWatchProgress } from '@/lib/storage';

interface VideoPlayerProps {
  media: MediaItem;
  resolution: PlaybackResolution;
  initialSeason?: number;
  initialEpisode?: number;
}

export default function VideoPlayer({ media, resolution, initialSeason, initialEpisode }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [activeSource, setActiveSource] = useState<StreamSource | null>(resolution.activeSource);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.9);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError, setHasError] = useState(!resolution.isPlayable);
  const [errorMessage, setErrorMessage] = useState(resolution.unavailabilityReason || '');
  const [showControls, setShowControls] = useState(true);
  const [showServerPicker, setShowServerPicker] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [qualities, setQualities] = useState<{ id: number; height: number; bitrate: number }[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!activeSource) {
      setHasError(true);
      setErrorMessage(resolution.unavailabilityReason || 'No playback source available.');
      return;
    }

    setHasError(false);
    setErrorMessage('');
    setQualities([]);

    // If source is an embedded player, video tag logic is bypassed
    if (activeSource.type === 'embed') {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const streamUrl = activeSource.url;

    if (activeSource.type === 'hls') {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });

        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          setQualities(data.levels.map((lvl, index) => ({
            id: index,
            height: lvl.height,
            bitrate: lvl.bitrate,
          })));
          video.play().catch(() => setIsPlaying(false));
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            setHasError(true);
            setErrorMessage(`Playback error encountered on ${activeSource.name}. Please select an alternate stream server.`);
          }
        });

        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.play().catch(() => setIsPlaying(false));
      }
    } else {
      video.src = streamUrl;
      video.play().catch(() => setIsPlaying(false));
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeSource, resolution.unavailabilityReason]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 0;
    setCurrentTime(curr);
    setDuration(dur);

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
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
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

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 select-none group"
    >
      {/* Top Header Controls / Server Switcher Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-black/75 backdrop-blur-md text-emerald-400 border border-emerald-500/30 shadow-md">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified Source
          </span>
          {activeSource && (
            <span className="text-xs text-slate-300 px-3 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/10 hidden sm:inline-block">
              {activeSource.name}
            </span>
          )}
        </div>

        {/* Server Picker Dropdown Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowServerPicker(!showServerPicker)}
            id="server-picker-button"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-black/75 hover:bg-black/90 border border-white/15 text-xs font-semibold text-slate-200 transition-colors shadow-lg"
          >
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            <span>Servers ({resolution.availableSources.length})</span>
          </button>

          {showServerPicker && (
            <div className="absolute right-0 top-10 z-30 p-2 rounded-xl glass-panel w-56 space-y-1 shadow-2xl">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-2">Select Server Source</div>
              {resolution.availableSources.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveSource(s);
                    setShowServerPicker(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                    activeSource && s.id === activeSource.id ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <span className="line-clamp-1">{s.name}</span>
                  <span className="text-[10px] text-slate-400 ml-2">{s.quality}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Embedded Player Source (Iframe with sandbox security) */}
      {activeSource && activeSource.type === 'embed' && (
        <iframe
          src={activeSource.url}
          title={media.title}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      )}

      {/* Native / HLS Player */}
      {activeSource && activeSource.type !== 'embed' && (
        <video
          ref={videoRef}
          onClick={togglePlay}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          className="w-full h-full object-contain cursor-pointer"
          playsInline
        />
      )}

      {/* Honest Error / Unavailable State */}
      {hasError && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-slate-950/95 backdrop-blur-md text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400 mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">Content Source Unavailable</h3>
          <p className="text-sm text-slate-300 max-w-md mb-6">{errorMessage}</p>
          <div className="flex gap-2 flex-wrap justify-center">
            {resolution.availableSources.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSource(s)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeSource && s.id === activeSource.id
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                Try {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Overlay Controls for HTML5/HLS video sources */}
      {activeSource && activeSource.type !== 'embed' && (
        <div
          className={`absolute inset-0 z-10 flex flex-col justify-end p-4 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300 ${
            showControls || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="space-y-2">
            <div className="relative w-full flex items-center">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:h-2.5 transition-all"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={togglePlay}
                  id="player-play-pause-btn"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  className="p-2 rounded-full bg-white/10 hover:bg-cyan-500 hover:text-slate-950 text-white transition-colors"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>

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

                <div className="flex items-center gap-2">
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
                    className="w-16 h-1 bg-white/20 rounded-lg appearance-none accent-cyan-400 cursor-pointer hidden sm:block"
                  />
                </div>

                <div className="text-xs text-slate-300 font-mono">
                  <span>{formatTime(currentTime)}</span>
                  <span className="text-slate-500 mx-1">/</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-xs">
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
