import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Match, Channel } from '../types';
import { ArrowLeft, Settings, Sun, Volume2, Maximize, Minimize, Tv2, PlayCircle, Radio, Server, RefreshCw, ExternalLink, ShieldAlert, Clock, ShieldCheck, PictureInPicture } from 'lucide-react';
import Hls from 'hls.js';

interface PlayerViewProps {
  match: Match | null;
  onBack: () => void;
  relatedChannels: Channel[]; 
  onSelectRelated: (channel: Channel) => void;
  isPlaylistMode?: boolean; 
}

type EngineType = 'default' | 'plyr' | 'super-proxy' | 'dplayer' | 'shaka' | 'shaka-drm' | 'jw-player' | 'hls-advanced' | 'clappr' | 'videojs';

const CF_PROXY = 'https://dartv-super-proxy.darajazb.workers.dev/?url=';

const PlayerView: React.FC<PlayerViewProps> = ({ match, onBack, relatedChannels, onSelectRelated, isPlaylistMode = false }) => {
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
  
  const [useProxy, setUseProxy] = useState(false);
  const [forceIframe, setForceIframe] = useState(false);
  
  const savedDefaultEngine = (localStorage.getItem('dartv_default_engine') as EngineType) || 'default';
  const [defaultEngine, setDefaultEngine] = useState<EngineType>(savedDefaultEngine);
  const [playerEngine, setPlayerEngine] = useState<EngineType>(savedDefaultEngine);
  
  const [customIframeHtml, setCustomIframeHtml] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const rawStreamUrl = String(currentStream || '');
  const cleanStreamUrl = rawStreamUrl.split('|')[0].trim();
  const isUpcomingMatch = cleanStreamUrl === 'upcoming' || cleanStreamUrl === '';
  const matchId = String(match?.id || '');

  const safeRelatedChannels = Array.isArray(relatedChannels) ? relatedChannels : [];

  const isStrictIframe = forceIframe || rawStreamUrl.includes('.html') || rawStreamUrl.includes('.php') || rawStreamUrl.includes('embed');

  const finalStreamUrl = useProxy && !isStrictIframe && cleanStreamUrl.startsWith('http') 
    ? `${CF_PROXY}${encodeURIComponent(cleanStreamUrl)}` 
    : cleanStreamUrl;

  useEffect(() => {
    if (match?.streamUrl) {
      setCurrentStream(match.streamUrl);
      const userDef = (localStorage.getItem('dartv_default_engine') as EngineType) || 'default';
      setPlayerEngine(userDef);
      setDefaultEngine(userDef);
      setError(null);
      setForceIframe(false);
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
      const engines: EngineType[] = ['default', 'plyr', 'super-proxy', 'dplayer', 'shaka', 'jw-player', 'shaka-drm', 'clappr', 'videojs'];
      const idx = engines.indexOf(prev);
      if (idx !== -1 && idx < engines.length - 1) {
        setError(`Stream Blocked. Auto-Switching to ${engines[idx + 1].toUpperCase()}...`);
        setLoading(true);
        return engines[idx + 1];
      } else {
        setError("Origin Blocked! Try External Player or Force Iframe Mode.");
        setLoading(false);
        return prev;
      }
    });
  }, []);

  const generatePlayerHtml = (engine: EngineType, url: string) => {
    const errorSpy = `<script>function sendErr() { window.parent.postMessage({action: 'STREAM_ERROR'}, '*'); }</script>`;
    
    if (engine === 'plyr') return `<!DOCTYPE html><html><head><meta charset="UTF-8"><link rel="stylesheet" href="https://cdn.plyr.io/3.5.6/plyr.css"><style>body { background: #000; margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; } .plyr { height: 100%; width: 100%; }</style></head><body><video id="player" controls playsinline class="js-player"></video>${errorSpy}<script src="https://cdn.plyr.io/3.5.6/plyr.js"></script><script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script><script>const video = document.getElementById("player"); const streamUrl = '${url}'; const myProxy = '${CF_PROXY}'; try { let player = new Plyr(video, { autoplay: true }); if (Hls.isSupported() && streamUrl.includes('.m3u8')) { const hls = new Hls({ xhrSetup: function(xhr, requestUrl) { if (requestUrl.startsWith('http://')) { requestUrl = myProxy + encodeURIComponent(requestUrl); } xhr.open('GET', requestUrl, true); } }); hls.loadSource(streamUrl); hls.attachMedia(video); hls.on(Hls.Events.ERROR, function(e, data) { if(data.fatal) { if(data.type === Hls.ErrorTypes.NETWORK_ERROR) { hls.startLoad(); } else { sendErr(); } } }); } else { video.src = streamUrl; } } catch(e) { sendErr(); }</script></body></html>`;

    if (engine === 'super-proxy') return `<!DOCTYPE html><html><head><script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script><style>body{margin:0;background:#000;overflow:hidden;} video{width:100%;height:100vh;outline:none;}</style></head><body><video id="hls-video" controls autoplay playsinline></video>${errorSpy}<script>if(Hls.isSupported()){ var video=document.getElementById('hls-video'); var myProxy = '${CF_PROXY}'; var hls=new Hls({ maxBufferLength: 30, xhrSetup: function(xhr, requestUrl) { if (requestUrl.startsWith('http')) { requestUrl = myProxy + encodeURIComponent(requestUrl); } xhr.open('GET', requestUrl, true); } }); hls.loadSource('${url}'); hls.attachMedia(video); hls.on(Hls.Events.ERROR,function(event,data){ if(data.fatal){ if(data.type === Hls.ErrorTypes.NETWORK_ERROR){ hls.startLoad(); } else { sendErr(); } } }); video.play().catch(e=>console.log(e)); } else { sendErr(); }</script></body></html>`;

    if (engine === 'dplayer') return `<!DOCTYPE html><html><head><script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script><script src="https://cdn.jsdelivr.net/npm/dashjs@latest/dist/dash.all.min.js"></script><script src="https://cdn.jsdelivr.net/npm/flv.js@latest/dist/flv.min.js"></script><script src="https://cdnjs.cloudflare.com/ajax/libs/dplayer/1.27.1/DPlayer.min.js"></script><style>body{margin:0;background:#000;overflow:hidden;width:100vw;height:100vh;} #dplayer{width:100%;height:100%;} .dplayer-theme-default .dplayer-controller .dplayer-bar-wrap .dplayer-bar .dplayer-played{background:#00b865 !important;} .dplayer-theme-default .dplayer-controller .dplayer-bar-wrap .dplayer-bar .dplayer-played .dplayer-thumb{background:#00b865 !important;} .dplayer-menu{display:none !important;}</style></head><body><div id="dplayer"></div>${errorSpy}<script>var streamUrl = '${url}'; var videoType = 'auto'; if (streamUrl.indexOf('.m3u8') !== -1) videoType = 'customHls'; else if (streamUrl.indexOf('.mpd') !== -1) videoType = 'dash'; else if (streamUrl.indexOf('.flv') !== -1) videoType = 'flv'; else if (streamUrl.indexOf('.mp4') !== -1) videoType = 'normal'; try { var dp = new DPlayer({ container: document.getElementById('dplayer'), autoplay: true, theme: '#00b865', loop: false, lang: 'en', hotkey: true, preload: 'auto', volume: 1.0, video: { url: streamUrl, type: videoType, customType: { customHls: function(video, player) { const hls = new Hls({ maxBufferLength: 45, maxMaxBufferLength: 600, liveSyncDurationCount: 3, liveMaxLatencyDurationCount: 10, enableWorker: true, lowLatencyMode: true }); hls.loadSource(video.src); hls.attachMedia(video); hls.on(Hls.Events.ERROR, function (event, data) { if (data.fatal) { if (data.type === Hls.ErrorTypes.NETWORK_ERROR) { hls.startLoad(); } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) { hls.recoverMediaError(); } else { sendErr(); } } }); } } } }); dp.on('error', function() { sendErr(); }); dp.video.addEventListener('stalled', function() { dp.play(); }); } catch(e) { sendErr(); }</script></body></html>`;
    
    if (engine === 'shaka') return `<!DOCTYPE html><html><head><script src="https://cdnjs.cloudflare.com/ajax/libs/mux.js/7.0.3/mux.min.js"></script><script src="https://cdnjs.cloudflare.com/ajax/libs/shaka-player/4.7.1/shaka-player.ui.min.js"></script><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/shaka-player/4.7.1/controls.min.css"><style>body{margin:0;background:#000;overflow:hidden;width:100vw;height:100vh;font-family:sans-serif;} .shaka-video-container{width:100%;height:100%;} .shaka-spinner-svg{fill:#00b865 !important;}</style></head><body><div data-shaka-player-container class="shaka-video-container"><video data-shaka-player id="shaka-video" style="width:100%;height:100%;" autoplay></video></div>${errorSpy}<script>window.muxjs = muxjs; async function init() { shaka.polyfill.installAll(); if (!shaka.Player.isBrowserSupported()) { sendErr(); return; } const video = document.getElementById('shaka-video'); const container = document.querySelector('[data-shaka-player-container]'); const player = new shaka.Player(video); const ui = new shaka.ui.Overlay(player, container, video); ui.configure({ controlPanelElements: ['play_pause', 'live_on', 'time_and_duration', 'spacer', 'mute', 'volume', 'picture_in_picture', 'fullscreen', 'overflow_menu'], overflowMenuButtons: ['quality', 'language', 'picture_in_picture', 'cast', 'playback_rate'], addBigPlayButton: true }); player.configure({ streaming: { bufferingGoal: 30, rebufferingGoal: 2, bufferBehind: 30 } }); player.addEventListener('error', function(e) { if(e.detail && e.detail.severity === 2) { if(e.detail.code === shaka.util.Error.Code.HTTP_ERROR) { player.retryStreaming(); } else { sendErr(); } } }); try { await player.load('${url}'); video.play().catch(e=>console.log(e)); } catch(e) { sendErr(); } } document.addEventListener('shaka-ui-loaded', init); document.addEventListener('shaka-ui-load-failed', sendErr);</script></body></html>`;
    
    if (engine === 'shaka-drm') return `<!DOCTYPE html><html><head><script src="https://cdnjs.cloudflare.com/ajax/libs/mux.js/7.0.3/mux.min.js"></script><script src="https://cdnjs.cloudflare.com/ajax/libs/shaka-player/4.7.1/shaka-player.ui.min.js"></script><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/shaka-player/4.7.1/controls.min.css"><style>body{margin:0;background:#000;overflow:hidden;width:100vw;height:100vh;font-family:sans-serif;} .shaka-video-container{width:100%;height:100%;} .shaka-spinner-svg{fill:#00b865 !important;}</style></head><body><div data-shaka-player-container class="shaka-video-container"><video data-shaka-player id="shaka-video" style="width:100%;height:100%;" autoplay muted></video></div>${errorSpy}<script>
    window.muxjs = muxjs; 
    async function init() { 
        shaka.polyfill.installAll(); 
        if (!shaka.Player.isBrowserSupported()) { sendErr(); return; } 
        
        const video = document.getElementById('shaka-video'); 
        const container = document.querySelector('[data-shaka-player-container]'); 
        const player = new shaka.Player(video); 
        const ui = new shaka.ui.Overlay(player, container, video); 
        
        const rawUrl = '${url}'; 
        const parts = rawUrl.split('|||'); 
        let mpdUrl = parts[0]; 
        const kid = parts[1]; 
        const key = parts[2]; 
        
        let tokenParams = "";
        if (mpdUrl.includes("?")) {
            tokenParams = mpdUrl.split("?")[1];
        }
        
        player.getNetworkingEngine().registerRequestFilter(function(type, request) {
            request.headers['Referer'] = 'https://www.jiotv.com/';
            
            if (tokenParams && request.uris[0].includes('jio')) {
                if (!request.uris[0].includes('__hdnea__')) {
                    const separator = request.uris[0].includes('?') ? '&' : '?';
                    request.uris[0] = request.uris[0] + separator + tokenParams;
                }
            }
        });

        if (kid && key) { 
            player.configure({ 
                drm: { clearKeys: { [kid]: key } } 
            }); 
        } 
        
        player.configure({
          streaming: {
            bufferingGoal: 30,
            rebufferingGoal: 2,
            bufferBehind: 30,
            retryParameters: { maxAttempts: 5, baseDelay: 1000, timeout: 10000 }
          }
        });

        ui.configure({ controlPanelElements: ['play_pause', 'time_and_duration', 'spacer', 'mute', 'volume', 'fullscreen', 'overflow_menu']}); 
        
        player.addEventListener('error', function(e) { 
            console.error('Shaka Error:', e);
            if(e.detail && e.detail.severity === 2) { sendErr(); }
        }); 
        
        try { 
            await player.load(mpdUrl); 
            video.play().catch(e=>console.log('Autoplay blocked:', e)); 
            
            setTimeout(() => {
                console.log("Unmuting Audio...");
                video.muted = false;
            }, 5000);

        } catch(e) { 
            console.error('Load Error:', e);
            sendErr(); 
        } 
    } 
    document.addEventListener('shaka-ui-loaded', init); 
    document.addEventListener('shaka-ui-load-failed', sendErr);
    </script></body></html>`;

    if (engine === 'jw-player') return `<!DOCTYPE html><html><head>
        <meta charset="UTF-8">
        <style>body { background: #000; margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; } #jwplayer_wrapper { height: 100%; width: 100%; }</style>
        <script src="https://content.jwplatform.com/libraries/KB5zFt7A.js"></script>
    </head><body>
        <div id="jwplayer_div"></div>
        ${errorSpy}
        <script>
            const rawUrl = '${url}';
            const parts = rawUrl.split('|||');
            const streamUrl = parts[0];
            const kid = parts[1];
            const key = parts[2];
            
            let playerSetup = {
                file: streamUrl,
                autostart: true,
                width: "100%",
                height: "100%",
                mute: false,
                cast: {}
            };

            if(kid && key) {
               playerSetup.drm = {
                   clearkey: {
                       keyId: kid,
                       key: key
                   }
               };
            }

            try {
                jwplayer("jwplayer_div").setup(playerSetup);
                jwplayer().on('error', function(e) {
                    console.error("JW Player Error:", e);
                    sendErr();
                });
            } catch(e) {
                console.error("JW Setup Error:", e);
                sendErr();
            }
        </script>
    </body></html>`;

    if (engine === 'hls-advanced') return `<!DOCTYPE html><html><head><script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script><style>body{margin:0;background:#000;overflow:hidden;} video{width:100%;height:100vh;outline:none;}</style></head><body><video id="hls-video" controls autoplay playsinline></video>${errorSpy}<script>if(Hls.isSupported()){var video=document.getElementById('hls-video');var hls=new Hls({maxBufferLength:60,maxMaxBufferLength:600,liveSyncDurationCount:3,liveMaxLatencyDurationCount:10,enableWorker:true,lowLatencyMode:true,backBufferLength:90,fragLoadingTimeOut:20000,manifestLoadingTimeOut:20000});hls.loadSource('${url}');hls.attachMedia(video);hls.on(Hls.Events.ERROR,function(event,data){if(data.fatal){switch(data.type){case Hls.ErrorTypes.NETWORK_ERROR:console.log('HLS Network Error, recovering...');hls.startLoad();break;case Hls.ErrorTypes.MEDIA_ERROR:console.log('HLS Media Error, recovering...');hls.recoverMediaError();break;default:sendErr();break;}}});video.play().catch(e=>console.log('Play blocked',e));}else if(document.getElementById('hls-video').canPlayType('application/vnd.apple.mpegurl')){var v=document.getElementById('hls-video');v.src='${url}';v.play();}else{sendErr();}</script></body></html>`;
    
    if (engine === 'clappr') return `<!DOCTYPE html><html><head><script src="https://cdn.jsdelivr.net/npm/@clappr/player@latest/dist/clappr.min.js"></script><script src="https://cdn.jsdelivr.net/npm/@clappr/hlsjs-playback@latest/dist/hlsjs-playback.min.js"></script></head><body style="margin:0;background:#000;overflow:hidden;"><div id="player"></div>${errorSpy}<script>try { var player = new Clappr.Player({source: "${url}", parentId: "#player", autoPlay: true, width: "100%", height: "100vh", plugins: [window.HlsjsPlayback] }); player.core.getCurrentContainer().on(Clappr.Events.CONTAINER_ERROR, sendErr); } catch(e){ sendErr(); }</script></body></html>`;
    
    if (engine === 'videojs') return `<!DOCTYPE html><html><head><link href="https://vjs.zencdn.net/8.3.0/video-js.css" rel="stylesheet" /><script src="https://vjs.zencdn.net/8.3.0/video.min.js"></script><script src="https://cdn.jsdelivr.net/npm/videojs-contrib-quality-levels@2.1.0/dist/videojs-contrib-quality-levels.min.js"></script><script src="https://cdn.jsdelivr.net/npm/videojs-hls-quality-selector@1.1.4/dist/videojs-hls-quality-selector.min.js"></script></head><body style="margin:0;background:#000;overflow:hidden;"><video id="my-video" class="video-js vjs-default-skin vjs-fill vjs-big-play-centered" controls autoplay preload="auto" style="width:100%;height:100vh;"><source src="${url}" type="application/x-mpegURL" /></video>${errorSpy}<script>try { var player = videojs('my-video'); player.hlsQualitySelector({ displayCurrentQuality: true }); player.on('error', sendErr); } catch(e){ sendErr(); }</script></body></html>`;
    return '';
  };

  useEffect(() => {
    let isMounted = true;
    if (!finalStreamUrl || isUpcomingMatch) return; 
    
    hasPlayedRef.current = false;
    retryCount.current = 0;
    clearFallbackTimer();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.action === 'STREAM_ERROR' && isMounted) {
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
            if (error?.includes("Switching")) setError(null);
        }
    };

    if (playerEngine !== 'default') {
        setCustomIframeHtml(generatePlayerHtml(playerEngine, finalStreamUrl));
        return () => { isMounted = false; clearFallbackTimer(); window.removeEventListener('message', handleMessage); };
    } else { 
        setCustomIframeHtml(''); 
    }

    const video = videoRef.current;
    if (!video) { clearFallbackTimer(); window.removeEventListener('message', handleMessage); return; }

    video.volume = volume;
    video.addEventListener('playing', handleSuccess);
    video.addEventListener('loadeddata', handleSuccess);

    if (Hls.isSupported() && finalStreamUrl.includes('.m3u8')) {
      const hls = new Hls({ 
          maxMaxBufferLength: 30, 
          liveSyncDurationCount: 3,
          xhrSetup: function(xhr, requestUrl) {
              if (requestUrl.startsWith('http://')) {
                  requestUrl = CF_PROXY + encodeURIComponent(requestUrl);
              }
              xhr.open('GET', requestUrl, true);
          }
      });
      hlsRef.current = hls;
      
      hls.loadSource(finalStreamUrl); 
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => { 
          if (data.levels && data.levels.length > 0) setQualityLevels(data.levels);
          setCurrentQuality(-1);
          video.play().catch(() => { if(isMounted) setLoading(false); }); 
      });
      
      hls.on(Hls.Events.ERROR, (e, data) => {
        if (data.fatal && isMounted) {
          if (data.details === Hls.ErrorDetails.BUFFER_INCOMPATIBLE_CODECS_ERROR) {
              setError("HEVC Format Blocked. Please click 'External Player' or enable Force Iframe Mode.");
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
      video.src = finalStreamUrl; 
      video.play().catch(() => { if(isMounted) setLoading(false); }); 
      video.addEventListener('error', () => { if (isMounted && !hasPlayedRef.current) { clearFallbackTimer(); handleFallback(); } });
    } else {
      video.src = finalStreamUrl; 
      video.play().catch(() => { if(isMounted) setLoading(false); }); 
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
  }, [currentStream, finalStreamUrl, playerEngine, match, handleFallback, isStrictIframe, isUpcomingMatch]);

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
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
        if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
          await window.screen.orientation.lock('landscape').catch(e => console.warn("Orientation lock ignored by browser", e));
        }
      } catch (e) { console.warn("Fullscreen request failed", e); }
    } else {
      try {
        if (document.exitFullscreen) await document.exitFullscreen();
        setIsFullscreen(false);
        if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
          window.screen.orientation.unlock();
        }
      } catch (e) { console.warn("Exit fullscreen failed", e); }
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
      {/* PLAYER AREA */}
      <div ref={containerRef} key={match.id} className={`relative w-full bg-black flex flex-col justify-center select-none flex-shrink-0 ${isFullscreen && !isStrictIframe ? 'h-screen fixed inset-0 z-50' : 'aspect-video z-40'}`}>
        
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
                   <div className="flex flex-col gap-3 items-center">
                       <button onClick={() => { setError(null); setLoading(true); setForceIframe(true); }} className="px-6 py-2 bg-purple-600 rounded-lg font-bold text-white shadow-lg flex items-center gap-2"><PictureInPicture size={16}/> Force Iframe Embed</button>
                       <div className="flex gap-3">
                           <button onClick={() => { setError(null); setLoading(true); setPlayerEngine('plyr'); }} className="px-6 py-2 bg-blue-600 rounded-lg font-bold text-white shadow-lg">Try Plyr Player</button>
                           <button onClick={openInExternalPlayer} className="px-6 py-2 bg-[#00b865] rounded-lg font-bold text-black shadow-lg flex items-center gap-2"><ExternalLink size={16}/> External Player</button>
                       </div>
                   </div>
                )}
              </div>
            )}

            {!isStrictIframe && playerEngine === 'default' && (
               <div className="absolute inset-0 bg-black pointer-events-none z-20" style={{ opacity: 1 - brightness }}></div>
            )}

            {indicator.show && !isStrictIframe && playerEngine === 'default' && (
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
                <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-50 bg-gradient-to-b from-black/80 to-transparent pointer-events-none transition-opacity duration-300 hover:opacity-100 opacity-0">
                  <button onClick={onBack} className="p-2 bg-black/50 rounded-full hover:bg-[#00b865] transition pointer-events-auto"><ArrowLeft className="w-6 h-6 text-white" /></button>
                </div>
                <iframe 
                    key={`iframe-${rawStreamUrl}`}
                    src={rawStreamUrl} 
                    className="w-full h-full border-none absolute inset-0 z-10 bg-black" 
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture; display-capture; web-share" 
                    allowFullScreen 
                    referrerPolicy="no-referrer"
                    onLoad={() => setLoading(false)}
                />
              </>
            )}

            {!isStrictIframe && customIframeHtml !== '' && (
              <>
                 <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-50 bg-gradient-to-b from-black/50 to-transparent pointer-events-none hover:opacity-100 opacity-0 transition-opacity">
                  <button onClick={onBack} className="p-2 bg-black/50 rounded-full hover:bg-[#00b865] transition pointer-events-auto"><ArrowLeft className="w-6 h-6 text-white" /></button>
                  <button onClick={() => setShowSettings(!showSettings)} className="p-2 bg-black/50 rounded-full hover:bg-[#00b865] transition pointer-events-auto"><Settings className="w-6 h-6 text-white" /></button>
                </div>
                <iframe 
                   key={`custom-${finalStreamUrl}-${playerEngine}`} 
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

                {/* 🔥 HIDES WHEN PLAYING & APPEARS ON TOUCH (showControls) */}
                <div className={`absolute inset-0 flex flex-col justify-between bg-gradient-to-b from-black/80 via-transparent to-black/80 transition-opacity duration-300 z-40 pointer-events-none ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="flex items-center justify-between p-4 pointer-events-auto">
                    <button onClick={isFullscreen ? toggleFullscreen : onBack} className="p-2 bg-black/50 rounded-full hover:bg-[#00b865] transition"><ArrowLeft className="w-6 h-6 text-white" /></button>
                    <h1 className="font-bold text-sm md:text-lg truncate px-4">{match.team1}</h1>
                    <div className="flex gap-2">
                       <button onClick={openInExternalPlayer} className="p-2 bg-[#00b865]/20 border border-[#00b865]/50 rounded-full hover:bg-[#00b865] transition" title="Play in MX Player / VLC"><ExternalLink className="w-5 h-5 text-white" /></button>
                       <button onClick={() => setShowSettings(!showSettings)} className="p-2 bg-black/50 rounded-full hover:bg-[#00b865] transition"><Settings className="w-6 h-6 text-white" /></button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col pointer-events-auto w-full">
                      {/* 🔥 NEW: Landscape Only Layover - Appears Below Player Content on Touch */}
                      {safeRelatedChannels.length > 0 && (
                        <div className="hidden landscape:flex flex-col w-full px-4 pb-2 transition-transform duration-300">
                           <h3 className="text-[10px] font-black uppercase tracking-widest text-white/80 mb-2 drop-shadow-md">Playlist Channels</h3>
                           {/* No slice() to show all channels */}
                           <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 w-full snap-x">
                               {safeRelatedChannels.map((channel, idx) => (
                                   <button
                                       key={idx}
                                       onClick={(e) => { e.stopPropagation(); setLoading(true); setError(null); onSelectRelated(channel); }}
                                       className={`flex-shrink-0 snap-start flex items-center gap-2 bg-black/60 backdrop-blur-md border rounded-xl p-2 w-52 hover:bg-[#00b865]/30 transition-colors ${match.id === channel.id ? 'border-[#00b865] bg-[#00b865]/20 shadow-[0_0_10px_rgba(0,184,101,0.3)]' : 'border-white/20'}`}
                                   >
                                        <img src={channel.logo} className="w-10 h-10 rounded-lg bg-black object-contain" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://ui-avatars.com/api/?name=TV` }} />
                                        <div className="flex flex-col text-left overflow-hidden w-full">
                                            <span className="text-xs font-bold text-white truncate w-full">{channel.name}</span>
                                            <span className="text-[9px] text-[#00b865] uppercase tracking-wider mt-0.5">Play Now</span>
                                        </div>
                                   </button>
                               ))}
                           </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between p-4 bg-gradient-to-t from-black/90 to-transparent">
                        <span className="flex items-center gap-2 text-xs font-bold text-red-500 bg-red-500/20 px-2 py-1 rounded"><span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span> LIVE</span>
                        <button onClick={toggleFullscreen} className="p-2 hover:bg-white/20 rounded-full transition">{isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}</button>
                      </div>
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

            <div className="mb-6 pb-6 border-b border-white/10">
                <div className="flex justify-between items-center mb-2">
                    <p className="text-xs text-gray-500 font-bold uppercase flex items-center gap-2"><PictureInPicture size={14}/> Force Iframe</p>
                    <button 
                        onClick={() => { setLoading(true); setForceIframe(!forceIframe); }}
                        className={`w-11 h-6 rounded-full flex items-center px-1 transition-colors ${forceIframe ? 'bg-purple-600' : 'bg-gray-700'}`}
                    >
                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${forceIframe ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </button>
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed mt-2">
                    Forces the stream to embed as a webpage. Useful for streams that refuse to load normally.
                </p>
            </div>

            <div className="mb-6 pb-6 border-b border-white/10">
                <div className="flex justify-between items-center mb-2">
                    <p className="text-xs text-gray-500 font-bold uppercase flex items-center gap-2"><Server size={14}/> Network Proxy</p>
                    <button 
                        onClick={() => { setLoading(true); setUseProxy(!useProxy); }}
                        className={`w-11 h-6 rounded-full flex items-center px-1 transition-colors ${useProxy ? 'bg-[#00b865]' : 'bg-gray-700'}`}
                    >
                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${useProxy ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </button>
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed mt-2">
                    Bypass CORS & Cloudflare restrictions. Enable if a channel fails to play.
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
                  
                  <button onClick={() => setPlayerEngine('plyr')} className={`px-2 py-2 rounded text-[10px] font-bold flex flex-col items-center gap-1 ${playerEngine === 'plyr' ? 'bg-blue-600 text-white' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}>
                      <span>Plyr.io</span>
                      <span className="text-[7px] bg-black/30 px-1 rounded uppercase text-[#00b865]">Clean UI</span>
                  </button>

                  <button onClick={() => setPlayerEngine('super-proxy')} className={`px-2 py-2 rounded text-[10px] font-bold flex flex-col items-center gap-1 ${playerEngine === 'super-proxy' ? 'bg-blue-600 text-white' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}>
                      <span>Super Proxy</span>
                      <span className="text-[7px] bg-black/30 px-1 rounded uppercase text-yellow-500">HTTP Fix</span>
                  </button>

                  <button onClick={() => setPlayerEngine('dplayer')} className={`px-2 py-2 rounded text-[10px] font-bold flex flex-col items-center gap-1 ${playerEngine === 'dplayer' ? 'bg-blue-600 text-white' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}>
                      <span>DPlayer Pro</span>
                      <span className="text-[7px] bg-black/30 px-1 rounded uppercase text-green-400">All Formats</span>
                  </button>
                  
                  <button onClick={() => setPlayerEngine('shaka-drm')} className={`px-2 py-2 rounded text-[10px] font-bold flex flex-col items-center gap-1 ${playerEngine === 'shaka-drm' ? 'bg-blue-600 text-white' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}>
                      <span>Shaka DRM</span>
                      <span className="text-[7px] bg-black/30 px-1 rounded uppercase">Token Fix</span>
                  </button>

                  <button onClick={() => setPlayerEngine('jw-player')} className={`px-2 py-2 rounded text-[10px] font-bold flex flex-col items-center gap-1 border border-[#00b865]/30 ${playerEngine === 'jw-player' ? 'bg-blue-600 text-white' : 'bg-[#00b865]/10 hover:bg-[#00b865]/20 text-gray-300'}`}>
                      <span>JW Player Engine</span>
                      <span className="text-[7px] bg-[#00b865] px-1.5 py-0.5 rounded text-black uppercase">JioTV VIP</span>
                  </button>

                  <button onClick={() => setPlayerEngine('hls-advanced')} className={`px-2 py-2 rounded text-[10px] font-bold flex flex-col items-center gap-1 ${playerEngine === 'hls-advanced' ? 'bg-blue-600 text-white' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}>
                      <span>HLS Advanced</span>
                      <span className="text-[7px] bg-black/30 px-1 rounded uppercase">Anti-Buffer</span>
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

      {/* 🔥 Standard Vertical Scroll List Below Player (Portrait / Non-Fullscreen) */}
      {!isFullscreen && (
        <div className="flex-1 overflow-y-auto bg-[#0f1115] pb-24 p-4 portrait:block landscape:hidden">
          <h2 className="text-xs font-black text-[#00b865] uppercase tracking-widest mb-4 flex items-center gap-2 sticky top-0 bg-[#0f1115] py-2 z-10 shadow-sm border-b border-white/5">
              <Tv2 size={16} /> {isPlaylistMode ? 'Channels from this Playlist' : 'Related Channels'}
          </h2>
          
          <div className="flex flex-col gap-2">
            {safeRelatedChannels.map((channel, idx) => (
              <button 
                key={idx} 
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  onSelectRelated(channel);
                }} 
                className={`flex items-center gap-4 p-3 border rounded-xl text-left transition-colors w-full ${match.id === channel.id ? 'bg-[#00b865]/10 border-[#00b865]/50 shadow-[0_0_15px_rgba(0,184,101,0.15)]' : 'bg-[#1a1d23] border-white/5 hover:bg-white/10'}`}
              >
                <img src={channel.logo} className="w-12 h-12 rounded-lg object-contain bg-black" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://ui-avatars.com/api/?name=TV` }} />
                
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <span className={`text-sm font-bold truncate block ${match.id === channel.id ? 'text-[#00b865]' : 'text-gray-200'}`}>{channel.name}</span>
                  <span className="text-[10px] text-gray-500 uppercase mt-0.5 tracking-wider truncate">
                      {channel.categoryId.replace('cat-', '').replace('repo-', '').replace(/-/g, ' ')}
                  </span>
                </div>
                
                <PlayCircle className={`w-6 h-6 shrink-0 transition-colors ${match.id === channel.id ? 'text-[#00b865] animate-pulse' : 'text-gray-600'}`} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerView;