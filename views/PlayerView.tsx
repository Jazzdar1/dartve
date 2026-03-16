import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Match, Channel } from '../types';
import { ArrowLeft, AlertCircle, Settings, Sun, Volume2, Maximize, Minimize, Tv2, PlayCircle, Radio, Server, RefreshCw, ExternalLink, ShieldAlert, Clock } from 'lucide-react';
import Hls from 'hls.js';

interface PlayerViewProps {
  match: Match | null;
  onBack: () => void;
  relatedChannels: Channel[];
  onSelectRelated: (channel: Channel) => void;
}

type EngineType = 'default' | 'dplayer' | 'shaka' | 'hls-advanced' | 'clappr' | 'videojs';

const PlayerView: React.FC<PlayerViewProps> = ({ match, onBack, relatedChannels, onSelectRelated }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  const retryCount = useRef(0);
  const fallbackTimerRef = useRef<any>(null); 
  const hasPlayedRef = useRef(false); 

  const [volume, setVolume] = useState(1);
  const [brightness, setBrightness] = useState(1);
  const [qualityLevels, setQualityLevels] = useState<any[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1);
  const [indicator, setIndicator] = useState<{show: boolean, type: 'vol'|'bri', val: number}>({show: false, type: 'vol', val: 0});
  
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const isLeftHalf = useRef(false);
  const initialVal = useRef(0);
  const isDragging = useRef(false);
  const indicatorTimer = useRef<any>(null);

  const [currentStream, setCurrentStream] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const savedDefaultEngine = (localStorage.getItem('dartv_default_engine') as EngineType) || 'default';
  const [defaultEngine, setDefaultEngine] = useState<EngineType>(savedDefaultEngine);
  const [playerEngine, setPlayerEngine] = useState<EngineType>(savedDefaultEngine);
  
  const [customIframeHtml, setCustomIframeHtml] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const cleanStreamUrl = String(currentStream || '').split('|')[0].trim();
  const isUpcomingMatch = cleanStreamUrl === 'upcoming' || cleanStreamUrl === '';
  const matchId = String(match?.id || '');

  const multiLinks = (match as any)?.multiLinks || [];
  const currentLinkData = multiLinks.find((l:any) => l.url === currentStream);
  
  const isStrictIframe = 
      matchId.includes('cat-sultan') || 
      match?.type === 'Iframe' || 
      currentLinkData?.type === 'Iframe' || 
      currentLinkData?.isSultan ||
      cleanStreamUrl.includes('.html') || 
      cleanStreamUrl.includes('.php');

  useEffect(() => {
    if (match?.streamUrl) {
      setCurrentStream(match.streamUrl);
      const userDef = (localStorage.getItem('dartv_default_engine') as EngineType) || 'default';
      setPlayerEngine(userDef);
      setDefaultEngine(userDef);
      setError(null);
      setQualityLevels([]);
      setCurrentQuality(-1);
      setLoading(!isUpcomingMatch);
    }
  }, [match?.id, match?.streamUrl, isUpcomingMatch]);

  const clearFallbackTimer = () => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  };

  const handleFallback = useCallback(() => {
    setPlayerEngine(prev => {
      // Switched sequence to prioritize DPlayer after Default
      const engines: EngineType[] = ['default', 'dplayer', 'hls-advanced', 'shaka', 'clappr', 'videojs'];
      const idx = engines.indexOf(prev);
      if (idx < engines.length - 1) {
        setError(`Stream Failed. Switching to ${engines[idx + 1].toUpperCase()}...`);
        setLoading(true);
        return engines[idx + 1];
      } else {
        setError("Origin Blocked! Connect System VPN (e.g. 1.1.1.1) or use External Player.");
        setLoading(false);
        return prev;
      }
    });
  }, []);

  const generatePlayerHtml = (engine: EngineType, url: string) => {
    const errorSpy = `<script>function sendErr() { window.parent.postMessage({action: 'STREAM_ERROR'}, '*'); }</script>`;
    
    // 🔥 ULTIMATE DPLAYER: Multi-Format (HLS, DASH, FLV, MP4) + Custom Auto-Healing
    if (engine === 'dplayer') return `<!DOCTYPE html><html><head>
      <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
      <script src="https://cdn.jsdelivr.net/npm/dashjs@latest/dist/dash.all.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/flv.js@latest/dist/flv.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/dplayer/1.27.1/DPlayer.min.js"></script>
      <style>
        body { margin:0; background:#000; overflow:hidden; width:100vw; height:100vh; }
        #dplayer { width:100%; height:100%; }
        /* DarTV Theme Customization for DPlayer */
        .dplayer-theme-default .dplayer-controller .dplayer-bar-wrap .dplayer-bar .dplayer-played { background: #00b865 !important; }
        .dplayer-theme-default .dplayer-controller .dplayer-bar-wrap .dplayer-bar .dplayer-played .dplayer-thumb { background: #00b865 !important; }
        .dplayer-menu { display: none !important; } /* Hide default right-click menu */
      </style>
      </head><body>
      <div id="dplayer"></div>
      ${errorSpy}
      <script>
        var streamUrl = '${url}';
        var videoType = 'auto'; // Let DPlayer try to guess first
        
        // Force specific engines based on extension for better reliability
        if (streamUrl.indexOf('.m3u8') !== -1) videoType = 'customHls';
        else if (streamUrl.indexOf('.mpd') !== -1) videoType = 'dash';
        else if (streamUrl.indexOf('.flv') !== -1) videoType = 'flv';
        else if (streamUrl.indexOf('.mp4') !== -1) videoType = 'normal';

        try {
          var dp = new DPlayer({
            container: document.getElementById('dplayer'),
            autoplay: true,
            theme: '#00b865',
            loop: false,
            lang: 'en',
            hotkey: true,
            preload: 'auto',
            volume: 1.0,
            video: {
              url: streamUrl,
              type: videoType,
              customType: {
                customHls: function(video, player) {
                  const hls = new Hls({
                    maxBufferLength: 45,
                    maxMaxBufferLength: 600,
                    liveSyncDurationCount: 3,
                    liveMaxLatencyDurationCount: 10,
                    enableWorker: true,
                    lowLatencyMode: true
                  });
                  hls.loadSource(video.src);
                  hls.attachMedia(video);
                  
                  // Auto-Healing Logic Built Into DPlayer
                  hls.on(Hls.Events.ERROR, function (event, data) {
                    if (data.fatal) {
                      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                        console.log("DPlayer Network Drop - Auto-recovering...");
                        hls.startLoad();
                      } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                        console.log("DPlayer Media Drop - Auto-recovering...");
                        hls.recoverMediaError();
                      } else {
                        sendErr();
                      }
                    }
                  });
                }
              }
            }
          });

          dp.on('error', function() {
            sendErr();
          });
          
          // Force play if stalled
          dp.video.addEventListener('stalled', function() {
              dp.play();
          });

        } catch(e) {
          sendErr();
        }
      </script></body></html>`;

    if (engine === 'shaka') return `<!DOCTYPE html><html><head><script src="https://cdnjs.cloudflare.com/ajax/libs/mux.js/7.0.3/mux.min.js"></script><script src="https://cdnjs.cloudflare.com/ajax/libs/shaka-player/4.7.1/shaka-player.ui.min.js"></script><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/shaka-player/4.7.1/controls.min.css"><style>body{margin:0;background:#000;overflow:hidden;width:100vw;height:100vh;font-family:sans-serif;} .shaka-video-container{width:100%;height:100%;} .shaka-spinner-svg{fill:#00b865 !important;}</style></head><body><div data-shaka-player-container class="shaka-video-container"><video data-shaka-player id="shaka-video" style="width:100%;height:100%;" autoplay></video></div>${errorSpy}<script>window.muxjs = muxjs; async function init() { shaka.polyfill.installAll(); if (!shaka.Player.isBrowserSupported()) { sendErr(); return; } const video = document.getElementById('shaka-video'); const container = document.querySelector('[data-shaka-player-container]'); const player = new shaka.Player(video); const ui = new shaka.ui.Overlay(player, container, video); ui.configure({ controlPanelElements: ['play_pause', 'live_on', 'time_and_duration', 'spacer', 'mute', 'volume', 'picture_in_picture', 'fullscreen', 'overflow_menu'], overflowMenuButtons: ['quality', 'language', 'picture_in_picture', 'cast', 'playback_rate'], addBigPlayButton: true }); player.configure({ streaming: { bufferingGoal: 30, rebufferingGoal: 2, bufferBehind: 30, lowLatencyMode: true, inaccurateManifestTolerance: 2, ignoreTextStreamFailures: true, retryParameters: { maxAttempts: 5, baseDelay: 1000 } } }); player.addEventListener('error', function(e) { if(e.detail && e.detail.severity === 2) { if(e.detail.code === shaka.util.Error.Code.HTTP_ERROR) { player.retryStreaming(); } else { sendErr(); } } }); try { await player.load('${url}'); video.play().catch(e=>console.log(e)); } catch(e) { sendErr(); } } document.addEventListener('shaka-ui-loaded', init); document.addEventListener('shaka-ui-load-failed', sendErr);</script></body></html>`;
    if (engine === 'hls-advanced') return `<!DOCTYPE html><html><head><script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script><style>body{margin:0;background:#000;overflow:hidden;} video{width:100%;height:100vh;outline:none;}</style></head><body><video id="hls-video" controls autoplay playsinline></video>${errorSpy}<script>if(Hls.isSupported()){var video=document.getElementById('hls-video');var hls=new Hls({maxBufferLength:60,maxMaxBufferLength:600,liveSyncDurationCount:3,liveMaxLatencyDurationCount:10,enableWorker:true,lowLatencyMode:true,backBufferLength:90,fragLoadingTimeOut:20000,manifestLoadingTimeOut:20000});hls.loadSource('${url}');hls.attachMedia(video);hls.on(Hls.Events.ERROR,function(event,data){if(data.fatal){switch(data.type){case Hls.ErrorTypes.NETWORK_ERROR:console.log('HLS Network Error, recovering...');hls.startLoad();break;case Hls.ErrorTypes.MEDIA_ERROR:console.log('HLS Media Error, recovering...');hls.recoverMediaError();break;default:sendErr();break;}}});video.play().catch(e=>console.log('Play blocked',e));}else if(document.getElementById('hls-video').canPlayType('application/vnd.apple.mpegurl')){var v=document.getElementById('hls-video');v.src='${url}';v.play();}else{sendErr();}</script></body></html>`;
    if (engine === 'clappr') return `<!DOCTYPE html><html><head><script src="https://cdn.jsdelivr.net/npm/clappr@latest/dist/clappr.min.js"></script><script src="https://cdn.jsdelivr.net/npm/clappr-level-selector@latest/dist/level-selector.min.js"></script></head><body style="margin:0;background:#000;overflow:hidden;"><div id="player"></div>${errorSpy}<script>try { var player = new Clappr.Player({source: "${url}", parentId: "#player", autoPlay: true, width: "100%", height: "100vh", plugins: [LevelSelector], levelSelectorConfig: { title: 'Quality', labels: { 2: 'High', 1: 'Med', 0: 'Low' } }}); player.core.getCurrentContainer().on(Clappr.Events.CONTAINER_ERROR, sendErr); } catch(e){ sendErr(); }</script></body></html>`;
    if (engine === 'videojs') return `<!DOCTYPE html><html><head><link href="https://vjs.zencdn.net/8.3.0/video-js.css" rel="stylesheet" /><script src="https://vjs.zencdn.net/8.3.0/video.min.js"></script><script src="https://cdn.jsdelivr.net/npm/videojs-contrib-quality-levels@2.1.0/dist/videojs-contrib-quality-levels.min.js"></script><script src="https://cdn.jsdelivr.net/npm/videojs-hls-quality-selector@1.1.4/dist/videojs-hls-quality-selector.min.js"></script></head><body style="margin:0;background:#000;overflow:hidden;"><video id="my-video" class="video-js vjs-default-skin vjs-fill vjs-big-play-centered" controls autoplay preload="auto" style="width:100%;height:100vh;"><source src="${url}" type="application/x-mpegURL" /></video>${errorSpy}<script>try { var player = videojs('my-video'); player.hlsQualitySelector({ displayCurrentQuality: true }); player.on('error', sendErr); } catch(e){ sendErr(); }</script></body></html>`;
    return '';
  };

  useEffect(() => {
    let isMounted = true;
    if (!cleanStreamUrl || isUpcomingMatch) return; 
    
    hasPlayedRef.current = false;
    retryCount.current = 0;
    clearFallbackTimer();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.action === 'STREAM_ERROR' && isMounted) {
         console.log("Player Engine Failed, triggering instant fallback...");
         clearFallbackTimer();
         handleFallback();
      }
    };
    window.addEventListener('message', handleMessage);

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    if (isStrictIframe) {
        setCustomIframeHtml(''); 
        return () => { isMounted = false; clearFallbackTimer(); window.removeEventListener('message', handleMessage); };
    }

    fallbackTimerRef.current = setTimeout(() => {
        if (isMounted && !hasPlayedRef.current) handleFallback();
    }, 25000);

    const handleSuccess = () => {
        if (isMounted) {
            clearFallbackTimer(); 
            hasPlayedRef.current = true; 
            setLoading(false);
            if (error?.includes("Switching") || error?.includes("Failed")) setError(null);
        }
    };

    if (playerEngine !== 'default') {
        setCustomIframeHtml(generatePlayerHtml(playerEngine, cleanStreamUrl));
        return () => { isMounted = false; clearFallbackTimer(); window.removeEventListener('message', handleMessage); };
    } else { 
        setCustomIframeHtml(''); 
    }

    const video = videoRef.current;
    if (!video) { clearFallbackTimer(); window.removeEventListener('message', handleMessage); return; }

    video.addEventListener('playing', handleSuccess);
    video.addEventListener('loadeddata', handleSuccess);
    video.volume = volume;

    if (Hls.isSupported()) {
      const hls = new Hls({ maxMaxBufferLength: 30, liveSyncDurationCount: 3 });
      hlsRef.current = hls;
      
      hls.loadSource(cleanStreamUrl); 
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => { 
          if (data.levels && data.levels.length > 0) setQualityLevels(data.levels);
          setCurrentQuality(-1);
          video.play().catch(() => { if(isMounted) setLoading(false); }); 
      });
      
      hls.on(Hls.Events.ERROR, (e, data) => {
        if (data.fatal && isMounted) {
          if (data.details === Hls.ErrorDetails.BUFFER_INCOMPATIBLE_CODECS_ERROR) {
              setError("HEVC Format Blocked. Please click 'External Player'.");
              setLoading(false); clearFallbackTimer(); return;
          }
          if (hasPlayedRef.current) {
              if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
              else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          } else {
              if (data.type === Hls.ErrorTypes.NETWORK_ERROR && retryCount.current < 2) { 
                  retryCount.current++; hls.startLoad(); 
              } else { clearFallbackTimer(); handleFallback(); }
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = cleanStreamUrl; 
      video.play().catch(() => { if(isMounted) setLoading(false); }); 
      video.addEventListener('error', () => { if (isMounted && !hasPlayedRef.current) { clearFallbackTimer(); handleFallback(); } });
    }

    return () => { 
        isMounted = false;
        clearFallbackTimer();
        window.removeEventListener('message', handleMessage);
        if (video) {
           video.removeEventListener('playing', handleSuccess);
           video.removeEventListener('loadeddata', handleSuccess);
        }
        if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [currentStream, cleanStreamUrl, playerEngine, match, handleFallback, isStrictIframe, isUpcomingMatch]);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
     if (isStrictIframe || playerEngine !== 'default' || isUpcomingMatch) return; 
     isDragging.current = true;
     touchStartY.current = e.touches[0].clientY;
     touchStartX.current = e.touches[0].clientX;
     isLeftHalf.current = touchStartX.current < window.innerWidth / 2;
     initialVal.current = isLeftHalf.current ? brightness : volume;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
     if (!isDragging.current || isStrictIframe || playerEngine !== 'default' || isUpcomingMatch) return;
     const deltaY = touchStartY.current - e.touches[0].clientY;
     if (Math.abs(deltaY) < 5) return; 

     const sensitivity = 0.005; 
     let newVal = initialVal.current + (deltaY * sensitivity);
     newVal = Math.max(0, Math.min(1, newVal));

     if (isLeftHalf.current) {
        setBrightness(newVal);
        showInd('bri', newVal);
     } else {
        setVolume(newVal);
        if (videoRef.current) videoRef.current.volume = newVal;
        showInd('vol', newVal);
     }
  };

  const handleTouchEnd = () => {
     isDragging.current = false;
     if (videoRef.current && videoRef.current.paused && playerEngine === 'default' && !isStrictIframe && !isUpcomingMatch) {
         videoRef.current.play().catch(e => console.log("Override play block", e));
     }
  };

  const showInd = (type: 'vol'|'bri', val: number) => {
      setIndicator({show: true, type, val});
      if (indicatorTimer.current) clearTimeout(indicatorTimer.current);
      indicatorTimer.current = setTimeout(() => setIndicator(prev => ({...prev, show: false})), 1500);
  };

  const changeQuality = (index: number) => {
      if (hlsRef.current) {
          hlsRef.current.currentLevel = index;
          setCurrentQuality(index);
          setShowSettings(false);
      }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen().catch(e => console.log(e));
      setIsFullscreen(true);
      try {
        if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
          await window.screen.orientation.lock('landscape');
        }
      } catch (e) {}
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
      try {
        if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
          window.screen.orientation.unlock();
        }
      } catch (e) {}
    }
  };

  const handleSetDefaultEngine = () => {
    localStorage.setItem('dartv_default_engine', playerEngine);
    setDefaultEngine(playerEngine);
    setShowSettings(false);
  };

  const openInExternalPlayer = () => {
    if (!cleanStreamUrl || isUpcomingMatch) return;
    const isHttps = cleanStreamUrl.startsWith('https');
    const urlWithoutScheme = cleanStreamUrl.replace(/^https?:\/\//, '');
    const title = encodeURIComponent(match?.team1 || 'DarTV Stream');
    const intentUrl = `intent://${urlWithoutScheme}#Intent;action=android.intent.action.VIEW;scheme=${isHttps ? 'https' : 'http'};type=video/*;S.title=${title};end`;
    window.location.href = intentUrl;
  };

  if (!match) return null;

  return (
    <div className="flex flex-col h-screen bg-[#0f1115] overflow-hidden text-white">
      <div ref={containerRef} key={match.id} className={`relative w-full bg-black flex flex-col justify-center select-none ${isFullscreen && !isStrictIframe ? 'h-screen fixed inset-0 z-50' : 'aspect-video'}`}>
        
        {isUpcomingMatch ? (
           <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f1115] z-50 p-6 text-center">
             <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-50 pointer-events-auto">
               <button onClick={onBack} className="p-2 bg-white/10 rounded-full hover:bg-[#00b865] transition"><ArrowLeft className="w-6 h-6 text-white" /></button>
             </div>
             <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mb-6 border border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.2)]">
                 <Clock className="w-10 h-10 text-yellow-500 animate-pulse" />
             </div>
             <h2 className="text-2xl font-black text-white mb-3 tracking-wide">{match.team1}</h2>
             <span className="bg-yellow-500/20 text-yellow-500 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6">Match is Upcoming</span>
             <p className="text-gray-400 text-xs max-w-sm mb-8 leading-relaxed">The streaming link is not available yet. Please check back when the match goes live!</p>
             <button onClick={onBack} className="px-8 py-3 bg-[#00b865] rounded-xl font-bold text-black shadow-[0_0_15px_rgba(0,184,101,0.3)] hover:scale-105 transition-transform">Browse Other Channels</button>
           </div>
        ) : (
          <>
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-black/80 backdrop-blur-sm pointer-events-none">
                <div className="w-12 h-12 border-4 border-[#00b865] border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_#00b865]"></div>
                <p className="text-[#00b865] font-bold text-[10px] uppercase tracking-widest animate-pulse">Loading Stream...</p>
              </div>
            )}
            
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-50 p-4 text-center">
                {error.includes("Switching") ? <RefreshCw className="w-10 h-10 text-yellow-500 mb-4 animate-spin" /> : <ShieldAlert className="w-10 h-10 text-red-500 mb-4" />}
                <p className="text-gray-200 font-bold text-sm mb-4 max-w-sm">{error}</p>
                {!error.includes("Switching") && (
                   <div className="flex gap-3">
                       <button onClick={() => { setError(null); setLoading(true); setPlayerEngine('default'); }} className="px-6 py-2 bg-gray-700 rounded-lg font-bold text-white shadow-lg">Retry</button>
                       <button onClick={openInExternalPlayer} className="px-6 py-2 bg-[#00b865] rounded-lg font-bold text-black shadow-lg flex items-center gap-2"><ExternalLink size={16}/> External Player</button>
                   </div>
                )}
              </div>
            )}

            {!isStrictIframe && playerEngine === 'default' && (
               <div className="absolute inset-0 bg-black pointer-events-none z-20" style={{ opacity: 1 - brightness }}></div>
            )}

            {indicator.show && (
               <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/60 text-white px-6 py-4 rounded-xl flex flex-col items-center gap-2 z-50">
                   {indicator.type === 'vol' ? <Volume2 className="w-8 h-8 text-[#00b865]" /> : <Sun className="w-8 h-8 text-yellow-500" />}
                   <span className="font-bold text-lg">{Math.round(indicator.val * 100)}%</span>
                   <div className="w-24 h-1.5 bg-gray-600 rounded-full mt-1 overflow-hidden">
                       <div className={`h-full ${indicator.type === 'vol' ? 'bg-[#00b865]' : 'bg-yellow-500'}`} style={{ width: `${indicator.val * 100}%` }}></div>
                   </div>
               </div>
            )}

            {isStrictIframe && (
              <>
                <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-50 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                  <button onClick={onBack} className="p-2 bg-black/50 rounded-full hover:bg-[#00b865] transition pointer-events-auto"><ArrowLeft className="w-6 h-6 text-white" /></button>
                </div>
                <iframe 
                    key={`iframe-${cleanStreamUrl}`}
                    src={cleanStreamUrl} 
                    className="w-full h-full border-none absolute inset-0 z-10 bg-black" 
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture; display-capture; web-share" 
                    allowFullScreen 
                    onLoad={() => setLoading(false)}
                />
              </>
            )}

            {!isStrictIframe && customIframeHtml !== '' && (
              <>
                 <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-50 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                  <button onClick={onBack} className="p-2 bg-black/50 rounded-full hover:bg-[#00b865] transition pointer-events-auto"><ArrowLeft className="w-6 h-6 text-white" /></button>
                  <button onClick={() => setShowSettings(!showSettings)} className="p-2 bg-black/50 rounded-full hover:bg-[#00b865] transition pointer-events-auto"><Settings className="w-6 h-6 text-white" /></button>
                </div>
                <iframe 
                   key={`custom-${cleanStreamUrl}-${playerEngine}`} 
                   srcDoc={customIframeHtml} 
                   className="w-full h-full border-none absolute inset-0 z-10 bg-black" 
                   allow="autoplay; fullscreen" 
                   allowFullScreen 
                   onLoad={() => { setLoading(false); clearFallbackTimer(); }} 
                />
              </>
            )}

            <div className={`absolute inset-0 w-full h-full z-10 ${(isStrictIframe || customIframeHtml !== '') ? 'hidden' : 'block'}`}>
                <video 
                   ref={videoRef} 
                   className="w-full h-full object-contain bg-black" 
                   playsInline 
                   autoPlay 
                />
                
                <div 
                   className="absolute inset-0 z-30 cursor-pointer" 
                   style={{ touchAction: 'none' }} 
                   onClick={(e) => {
                      if (Math.abs(touchStartY.current - e.touches[0].clientY) < 10) setShowControls(!showControls);
                   }}
                   onTouchStart={handleTouchStart}
                   onTouchMove={handleTouchMove}
                   onTouchEnd={handleTouchEnd}
                ></div>

                <div className={`absolute inset-0 flex flex-col justify-between bg-gradient-to-b from-black/80 via-transparent to-black/80 transition-opacity duration-300 z-40 pointer-events-none ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="flex items-center justify-between p-4 pointer-events-auto">
                    <button onClick={isFullscreen ? toggleFullscreen : onBack} className="p-2 bg-black/50 rounded-full hover:bg-[#00b865] transition"><ArrowLeft className="w-6 h-6 text-white" /></button>
                    <h1 className="font-bold text-sm md:text-lg truncate px-4">{match.team1}</h1>
                    <div className="flex gap-2">
                       <button onClick={openInExternalPlayer} className="p-2 bg-[#00b865]/20 border border-[#00b865]/50 rounded-full hover:bg-[#00b865] transition" title="Play in MX Player / VLC"><ExternalLink className="w-5 h-5 text-white" /></button>
                       <button onClick={() => setShowSettings(!showSettings)} className="p-2 bg-black/50 rounded-full hover:bg-[#00b865] transition"><Settings className="w-6 h-6 text-white" /></button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 pointer-events-auto">
                    <span className="flex items-center gap-2 text-xs font-bold text-red-500 bg-red-500/20 px-2 py-1 rounded"><span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span> LIVE</span>
                    <button onClick={toggleFullscreen} className="p-2 hover:bg-white/20 rounded-full transition">{isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}</button>
                  </div>
                </div>
            </div>
          </>
        )}

        {showSettings && !isUpcomingMatch && !isStrictIframe && (
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-black/95 border-l border-white/10 z-[100] p-4 flex flex-col overflow-y-auto animate-in slide-in-from-right pointer-events-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-white/10">
                <h3 className="font-black text-sm uppercase tracking-widest text-[#00b865]">Player Settings</h3>
                <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white font-bold text-xl p-1">×</button>
            </div>

            <div className="mb-6 pb-6 border-b border-white/10 text-center">
                <div className="flex justify-center items-center mb-3">
                    <ShieldAlert size={28} className="text-[#00b865] opacity-80"/>
                </div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider mb-2">Network Assistant</h4>
                <p className="text-[10px] text-gray-400 leading-relaxed">
                   If a channel provides Audio only, it may be a HEVC format stream. 
                   <br/><br/>
                   Please click the <b>External Player (↗)</b> button in the top bar to play it in full HD using VLC or MX Player.
                </p>
            </div>
            
            {playerEngine === 'default' && (
                <div className="mb-6">
                    <p className="text-xs text-gray-500 font-bold mb-2 uppercase">Video Quality</p>
                    <div className="flex flex-col gap-1.5">
                        {qualityLevels.length > 0 ? (
                            <>
                                <button onClick={() => changeQuality(-1)} className={`text-left px-3 py-2 rounded text-xs font-bold transition ${currentQuality === -1 ? 'bg-[#00b865] text-white' : 'bg-white/5 hover:bg-white/10 text-gray-300'}`}>Auto</button>
                                {qualityLevels.map((level, index) => (
                                    <button key={index} onClick={() => changeQuality(index)} className={`text-left px-3 py-2 rounded text-xs font-bold transition flex justify-between items-center ${currentQuality === index ? 'bg-[#00b865] text-white' : 'bg-white/5 hover:bg-white/10 text-gray-300'}`}>
                                        <span className="flex items-center">
                                            {level.height ? `${level.height}p` : `Stream ${index + 1}`}
                                            {level.height >= 720 && <span className="bg-blue-600 text-white text-[8px] px-1.5 py-0.5 rounded font-black ml-2 uppercase tracking-wider">HD</span>}
                                        </span>
                                        {level.bitrate ? <span className="text-[10px] opacity-60">{Math.round(level.bitrate / 1000)} kbps</span> : null}
                                    </button>
                                ))}
                            </>
                        ) : (
                            <button className="text-left px-3 py-2 rounded text-xs font-bold bg-[#00b865] text-white cursor-default">Native Player (Auto)</button>
                        )}
                    </div>
                </div>
            )}

            <div>
                <div className="flex justify-between items-center mb-2">
                    <p className="text-xs text-gray-500 font-bold uppercase">Change Player</p>
                    <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded text-gray-400">Default: {defaultEngine.toUpperCase()}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button onClick={() => setPlayerEngine('default')} className={`px-2 py-2 rounded text-[10px] font-bold ${playerEngine === 'default' ? 'bg-blue-600 text-white' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}>Native</button>
                  <button onClick={() => setPlayerEngine('dplayer')} className={`px-2 py-2 rounded text-[10px] font-bold flex flex-col items-center gap-1 ${playerEngine === 'dplayer' ? 'bg-blue-600 text-white' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}>
                      <span>DPlayer Pro</span>
                      <span className="text-[7px] bg-black/30 px-1 rounded uppercase text-green-400">All Formats</span>
                  </button>
                  <button onClick={() => setPlayerEngine('hls-advanced')} className={`px-2 py-2 rounded text-[10px] font-bold flex flex-col items-center gap-1 ${playerEngine === 'hls-advanced' ? 'bg-blue-600 text-white' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}>
                      <span>HLS Advanced</span>
                      <span className="text-[7px] bg-black/30 px-1 rounded uppercase text-yellow-500">Anti-Buffer</span>
                  </button>
                  <button onClick={() => setPlayerEngine('shaka')} className={`px-2 py-2 rounded text-[10px] font-bold flex flex-col items-center gap-1 ${playerEngine === 'shaka' ? 'bg-blue-600 text-white' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}>
                      <span>Shaka Player</span>
                      <span className="text-[7px] bg-black/30 px-1 rounded uppercase">Strict DRM</span>
                  </button>
                  <button onClick={() => setPlayerEngine('clappr')} className={`px-2 py-2 rounded text-[10px] font-bold flex flex-col items-center gap-1 ${playerEngine === 'clappr' ? 'bg-blue-600 text-white' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}>
                      <span>Clappr</span>
                      <span className="text-[7px] bg-black/30 px-1 rounded uppercase">w/ Quality UI</span>
                  </button>
                  <button onClick={() => setPlayerEngine('videojs')} className={`px-2 py-2 rounded text-[10px] font-bold flex flex-col items-center gap-1 ${playerEngine === 'videojs' ? 'bg-blue-600 text-white' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}>
                      <span>VideoJS Player</span>
                      <span className="text-[7px] bg-black/30 px-1 rounded uppercase">w/ Quality UI</span>
                  </button>
                </div>
                
                {playerEngine !== defaultEngine && (
                  <button 
                      onClick={handleSetDefaultEngine}
                      className="w-full mt-3 py-2 bg-[#00b865]/20 text-[#00b865] rounded text-[11px] font-bold border border-[#00b865]/30 hover:bg-[#00b865] hover:text-black transition-colors"
                  >
                      Set as Default Player
                  </button>
                )}
            </div>
          </div>
        )}
      </div>

      {!isFullscreen && (
        <div className="flex-1 overflow-y-auto bg-[#0f1115] pb-24">
          
          {multiLinks.length > 0 && !isUpcomingMatch && (
            <div className="p-4 border-b border-white/5 bg-[#1a1d24]">
              <h2 className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Server size={14} /> Available Streams ({multiLinks.length})</h2>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                {multiLinks.map((link: any, idx: number) => (
                  <button 
                    key={`svr-${idx}`} 
                    onClick={() => setCurrentStream(link.url)} 
                    className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${currentStream === link.url ? 'bg-[#00b865] text-white shadow-[0_0_15px_rgba(0,184,101,0.3)]' : 'bg-black/40 text-gray-400 border border-white/5 hover:border-white/20 hover:text-white'}`}
                  >
                    <Radio className={`w-3.5 h-3.5 ${currentStream === link.url ? 'animate-pulse text-white' : 'text-gray-500'}`} />
                    {link.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="p-4">
            <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Tv2 size={16} /> All Channels</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {relatedChannels.map((channel, idx) => (
                <button key={idx} onClick={() => onSelectRelated(channel)} className={`flex items-center gap-4 p-3 border rounded-xl transition-all text-left ${match.id === channel.id ? 'bg-[#00b865]/10 border-[#00b865]/50' : 'bg-[#1a1d23] border-white/5 hover:border-white/20'}`}><img src={channel.logo} loading="lazy" className="w-10 h-10 rounded-lg object-contain bg-white/5" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://ui-avatars.com/api/?name=TV` }} /><div className="flex-1 min-w-0"><span className={`text-sm font-bold truncate block ${match.id === channel.id ? 'text-[#00b865]' : 'text-gray-200'}`}>{channel.name}</span></div><PlayCircle className="w-6 h-6 text-gray-600 shrink-0" /></button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerView;