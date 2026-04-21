import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { View, Match, Category, Channel } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import LinkModal from './components/LinkModal';
import FloatingPlayer from './components/FloatingPlayer';
import { WifiOff, RefreshCw, Loader2, Activity } from 'lucide-react';

const MoviesView = lazy(() => import('./views/MoviesView'));
const LiveEventsView = lazy(() => import('./views/LiveEvents'));
const CategoriesView = lazy(() => import('./views/CategoriesView'));
const ChannelListView = lazy(() => import('./views/ChannelList'));
const PlayerView = lazy(() => import('./views/PlayerView'));
const AboutView = lazy(() => import('./views/AboutView'));
const PrivacyPolicyView = lazy(() => import('./views/PrivacyPolicyView'));
const RadioView = lazy(() => import('./views/RadioView'));

type AppScreen = View | 'radio' | 'movies' | 'channel-detail' | 'player' | 'about' | 'privacy';

const BASE_GITHUB = 'https://raw.githubusercontent.com/FunctionError/PiratesTv/main';
const DEFAULT_M3U = `${BASE_GITHUB}/combined_playlist.m3u`;

const LIVE_EVENTS_JSON_URL = 'https://raw.githubusercontent.com/dartv-ajaz/Live-Sports-Group-A/main/dartv_live_matches.json';
const MOVIES_URL = 'https://raw.githubusercontent.com/dartv-ajaz/Live-Sports-Group-A/main/dartv_movies.json';

const API_BASE = 'https://raw.githubusercontent.com/dartv-ajaz/Live-Sports-Group-A/main';

const JIOTV_DRM_URL = 'https://raw.githubusercontent.com/dartv-ajaz/Live-Sports-Group-A/main/dartv_jiotv.m3u';
const CRICKET_URL = `${API_BASE}/cricket_channels.json`;
const VIP_URL = `${API_BASE}/vip_cricket.json`; 
const VAST_URL = 'https://raw.githubusercontent.com/dartv-ajaz/Live-Sports-Group-A/refs/heads/main/dartv_vast_channels.json';
const GROUP_B_URL = 'https://raw.githubusercontent.com/dartv-ajaz/Live-Sports-Group-B/main/live_matches_B.json';
const FANCODE_URL = 'https://raw.githubusercontent.com/dartv-ajaz/Fancode-Live-API/main/live_matches.json';

const TSPORTS_JSON_URL = 'https://raw.githubusercontent.com/abusaeeidx/T-Sports-Playlist-Auto-Update/refs/heads/main/channels_data.json';
const TSPORTS_COMBINE_URL = 'https://raw.githubusercontent.com/abusaeeidx/T-Sports-Playlist-Auto-Update/refs/heads/main/combine_playlist.m3u';
const LX_URL = 'https://raw.githubusercontent.com/raid35/channel-links/main/LX.m3u';
const BEIN_URL = 'https://is.gd/xdFAu6.m3u'; 

const INDIAN_URL = 'https://raw.githubusercontent.com/praneshpaulose/Kerala/af18ac3b046b0121c5429c898a2db197ceaeee0a/FMall.m3u';
const FANCODE_M3U_URL = 'https://raw.githubusercontent.com/dartv-ajaz/tataplay/main/dartv_fancode.m3u';

// 🔥 GLOBAL LINKS FROM INDEX.HTML
const GLOBAL_SPORTS_URL = 'https://iptv-org.github.io/iptv/categories/sports.m3u';
const GLOBAL_MOVIES_URL = 'https://iptv-org.github.io/iptv/categories/movies.m3u';
const GLOBAL_ENTERTAINMENT_URL = 'https://iptv-org.github.io/iptv/categories/entertainment.m3u';
const PIRATES_URL = 'https://raw.githubusercontent.com/FunctionError/PiratesTv/refs/heads/main/combined_playlist.m3u';

// Helper to robustly extract arrays from various JSON structures (Deep Scan for Chaupal & others)
const extractArrayFromJson = (obj: any, preferredKey?: string): any[] => {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  if (preferredKey && Array.isArray(obj[preferredKey])) return obj[preferredKey];
  
  const commonKeys = ['channels', 'matches', 'data', 'list', 'result', 'streams', 'events', 'items', 'playlist', 'response', 'msg', 'message'];
  for (const key of commonKeys) {
    if (obj[key] && Array.isArray(obj[key])) return obj[key];
  }
  
  // Fallback: look for any array inside the object
  for (const key in obj) {
    if (Array.isArray(obj[key])) return obj[key];
  }
  
  // 1-Level Deep Fallback (e.g. { "data": { "channels": [...] } })
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        for (const subKey in obj[key]) {
            if (Array.isArray(obj[key][subKey])) return obj[key][subKey];
        }
    }
  }
  return [];
};

// Universal DRM & Standard M3U Parser
const parseDrmM3u = (text: string) => {
  const lines = text.split('\n');
  const chs = [];
  let currentInfo: any = null;
  let currentKid = '';
  let currentKey = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#EXTINF:')) {
      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      const nameSplit = line.split(',');
      const name = nameSplit.length > 1 ? nameSplit.pop()?.trim() || 'Unknown' : 'Unknown';
      currentInfo = { 
        title: name, 
        src: logoMatch ? logoMatch[1] : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2E8B57&color=fff` 
      };
    } else if (line.startsWith('#KODIPROP:inputstream.adaptive.license_key=')) {
      try {
        const jsonStr = line.split('license_key=')[1];
        const keyObj = JSON.parse(jsonStr);
        currentKid = Object.keys(keyObj)[0];
        currentKey = keyObj[currentKid];
      } catch (e) {}
    } else if (line.length > 0 && !line.startsWith('#') && currentInfo) {
      const packedUrl = (currentKid && currentKey) ? `${line}|||${currentKid}|||${currentKey}` : line;
      chs.push({ title: currentInfo.title, src: currentInfo.src, url: packedUrl });
      
      currentInfo = null;
      currentKid = '';
      currentKey = '';
    }
  }
  return chs;
};

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<AppScreen>('live-events');
  const [lastMainView, setLastMainView] = useState<AppScreen>('live-events');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  
  const [matches, setMatches] = useState<Match[]>([]);
  const [allChannels, setAllChannels] = useState<Channel[]>([]);
  const [categoryChannels, setCategoryChannels] = useState<Channel[]>([]);
  const [playlistCache, setPlaylistCache] = useState<Record<string, Channel[]>>({});
  
  const [vodMovies, setVodMovies] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<Channel[]>([]);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  
  const [cloudCategories, setCloudCategories] = useState<Category[]>([]);
  const [customCategories, setCustomCategories] = useState<Category[]>([]);

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [floatingMatch, setFloatingMatch] = useState<Match | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [globalMultiLinks, setGlobalMultiLinks] = useState<any[]>([]);

  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const handleBackButton = () => {
      if (activeView === 'player' || activeView === 'channel-detail' || activeView === 'radio' || activeView === 'movies') {
        setActiveView(lastMainView);
        window.history.pushState(null, '', window.location.href);
      } else if (isSidebarOpen) {
        setSidebarOpen(false);
        window.history.pushState(null, '', window.location.href);
      }
    };
    window.addEventListener('popstate', handleBackButton);
    return () => window.removeEventListener('popstate', handleBackButton);
  }, [activeView, lastMainView, isSidebarOpen]);

  useEffect(() => {
    const savedFavs = localStorage.getItem('dartv_favorites');
    if (savedFavs) try { setFavorites(JSON.parse(savedFavs)); } catch (e) {}
    
    const savedCustom = localStorage.getItem('dartv_custom_playlists');
    if (savedCustom) try { setCustomCategories(JSON.parse(savedCustom)); } catch (e) {}
  }, []);

  const handleAddCustomPlaylist = (name: string, url: string) => {
    const newCategory: Category = { id: `cat-custom-${Date.now()}`, name: name, playlistUrl: url };
    setCustomCategories(prev => {
      const updated = [...prev, newCategory];
      localStorage.setItem('dartv_custom_playlists', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteCustomPlaylist = (id: string) => {
    setCustomCategories(prev => {
      const updated = prev.filter(cat => cat.id !== id);
      localStorage.setItem('dartv_custom_playlists', JSON.stringify(updated));
      return updated;
    });
    setPlaylistCache(prev => {
      const newCache = { ...prev };
      delete newCache[id];
      return newCache;
    });
  };

  const fetchM3UText = async (originalUrl: string) => {
    try {
      const myProxy = "https://dartv-super-proxy.darajazb.workers.dev/?url=";
      const finalUrl = (originalUrl.includes('raw.githubusercontent.com') || originalUrl.includes('github') || originalUrl.startsWith('http://')) 
         ? myProxy + encodeURIComponent(originalUrl) 
         : originalUrl;

      const res = await fetch(finalUrl);
      if (!res.ok) throw new Error('Direct fetch blocked');
      return await res.text();
    } catch (e) {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(originalUrl)}`;
      const proxyRes = await fetch(proxyUrl);
      if (!proxyRes.ok) throw new Error('Proxy fetch failed');
      return await proxyRes.text();
    }
  };

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      try {
        const moviesRes = await fetch(`${MOVIES_URL}?t=${Date.now()}`);
        if (moviesRes.ok) {
           const moviesData = await moviesRes.json();
           setVodMovies(moviesData);
        }
      } catch (e) { console.log("Could not load movies"); }

      let currentChannels: Channel[] = [];
      let newCache: Record<string, Channel[]> = {};
      let newCloudCats: Category[] = [];

      newCloudCats.push({ id: 'cat-combined', name: '📺 All Live TV (Pirates)', playlistUrl: DEFAULT_M3U });
      newCloudCats.push({ id: 'cat-master-hub', name: '👑 All-In-One VIP Players', playlistUrl: 'internal' });

      // 🔥 XCHANNELS DIRECT FETCHER
      try {
          const xText = await fetchM3UText('https://allinonereborn.online/iptv-web/xchannels.json');
          const xData = JSON.parse(xText);
          const parsedXChannels: Channel[] = [];
          
          Object.keys(xData).forEach(groupName => {
              if (Array.isArray(xData[groupName])) {
                  xData[groupName].forEach((ch: any, idx: number) => {
                      parsedXChannels.push({
                          id: `ch-xchan-${groupName.replace(/\\s+/g, '-')}-${idx}`,
                          name: `[${groupName}] ${ch.name}`,
                          logo: ch.logo || `https://ui-avatars.com/api/?name=TV&background=00b865&color=fff`,
                          categoryId: 'cat-xchannels',
                          streamUrl: ch.url
                      });
                  });
              }
          });

          if (parsedXChannels.length > 0) {
              newCache['cat-xchannels'] = parsedXChannels;
              currentChannels = [...currentChannels, ...parsedXChannels];
              newCloudCats.push({ id: 'cat-xchannels', name: '🌟 X-Channels Global (All)', playlistUrl: 'internal' });
          }
      } catch (err) { console.log("Failed to fetch XChannels direct JSON"); }

      const apiConfigs: any[] = [
        { id: 'cat-jiotv-premium', name: '💎 JioTV Premium (DRM)', url: JIOTV_DRM_URL, type: 'm3u', key: 'channels' },
        { id: 'cat-group-b', name: 'Hotstar LIVE', url: GROUP_B_URL, type: 'json', key: 'matches' },
        { id: 'cat-fancode', name: '🏏 Fancode Live (Events)', url: FANCODE_URL, type: 'json', key: 'matches' },
        { id: 'cat-vip', name: '⚡ VIP Cricket', url: VIP_URL, type: 'json', key: 'channels' },
        { id: 'cat-lx', name: '🔥 LX Premium', url: LX_URL, type: 'm3u', key: 'channels' }, 
        { id: 'cat-bein', name: '⚽ Bein Sports', url: BEIN_URL, type: 'm3u', key: 'channels' }, 
        { id: 'cat-indian', name: '🇮🇳 Indian', url: INDIAN_URL, type: 'm3u', key: 'channels' }, 
        { id: 'cat-fancode-m3u', name: '🏏 Fancode (M3U)', url: FANCODE_M3U_URL, type: 'm3u', key: 'channels' }, 
        { id: 'cat-tsports-json', name: '🏆 T-Sports Data', url: TSPORTS_JSON_URL, type: 'json', key: 'channels' },
        { id: 'cat-tsports-comb', name: '🏆 T-Sports Combine', url: TSPORTS_COMBINE_URL, type: 'm3u', key: 'channels' },
        { id: 'cat-cricket', name: 'Cricket TV', url: CRICKET_URL, type: 'json', key: 'channels' },
        { id: 'cat-vast', name: '📺 Vast Channels', url: VAST_URL, type: 'json', key: 'channels' },
        // 🔥 GLOBAL LINKS ADDED HERE
        { id: 'cat-global-sports', name: '⚽ Global Sports', url: GLOBAL_SPORTS_URL, type: 'm3u', key: 'channels' },
        { id: 'cat-global-movies', name: '🎬 Global Movies', url: GLOBAL_MOVIES_URL, type: 'm3u', key: 'channels' },
        { id: 'cat-global-ent', name: '🎭 Global Entertainment', url: GLOBAL_ENTERTAINMENT_URL, type: 'm3u', key: 'channels' },
        { id: 'cat-pirates', name: '🏴‍☠️ Custom: Pirates TV', url: PIRATES_URL, type: 'm3u', key: 'channels' }
      ];

      // 🔥 GITHUB REPOS AUTO-FETCHER LOGIC WAPAS ADD KIYA GAYA HAI 🔥
      const githubRepos = [
          { name: "Crichd Special", repo: "srhady/crichd-speical-live-event" },
          { name: "Data Playlists", repo: "srhady/data" },
          { name: "Fancode BD", repo: "srhady/Fancode-bd" },
          { name: "SonyLiv", repo: "srhady/SonyLiv" },
          { name: "Chaupal", repo: "dartv-ajaz/chaupal" },
          { name: "Sports", repo: "srhady/Sports" }
      ];

      for (const repoObj of githubRepos) {
          try {
              const res = await fetch(`https://api.github.com/repos/${repoObj.repo}/contents/`);
              if (res.ok) {
                  const files = await res.json();
                  files.forEach((file: any, idx: number) => {
                      if (file.download_url) {
                          const ext = file.name.split('.').pop()?.toLowerCase();
                          if (['m3u', 'm3u8', 'json', 'txt'].includes(ext || '')) {
                              const cleanName = file.name.split('.')[0].replace(/_/g, " ").replace(/-/g, " ");
                              const catId = `cat-repo-${repoObj.name.replace(/\s+/g, '')}-${idx}`;
                              
                              // Push to apiConfigs seamlessly
                              apiConfigs.push({ 
                                  id: catId, 
                                  name: `📁 ${repoObj.name}: ${cleanName}`, 
                                  url: file.download_url, 
                                  type: ext === 'json' ? 'json' : 'm3u', 
                                  key: 'channels' 
                              });
                          }
                      }
                  });
              }
          } catch (e) { console.log(`Failed to load repo: ${repoObj.repo}`); }
      }

      try {
          const adminUrl = `https://raw.githubusercontent.com/dartv-ajaz/Live-Sports-Group-A/main/admin_playlists.json?t=${Date.now()}`;
          const adminRes = await fetch(adminUrl);
          if (adminRes.ok) {
              const externalPlaylists = await adminRes.json();
              externalPlaylists.forEach((list: any, idx: number) => {
                  apiConfigs.push({ id: `cat-admin-${idx}`, name: list.name, url: list.url, type: 'auto', key: 'channels' });
              });
          }
      } catch (err) {}

      apiConfigs.forEach(c => newCloudCats.push({ id: c.id, name: c.name, playlistUrl: c.url }));
      newCloudCats.push({ id: 'cat-global-radio', name: '📻 Global FM Radio', playlistUrl: '' });
      setCloudCategories(newCloudCats);

      const apiResults = await Promise.all(
        apiConfigs.map(async (config) => {
          try {
            const text = await fetchM3UText(config.url);
            let parsedData = null;
            if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
                parsedData = JSON.parse(text);
            } else {
                parsedData = { channels: parseDrmM3u(text) };
            }
            return { config, data: parsedData };
          } catch (err) {
            return { config, data: null };
          }
        })
      );

      let rawMatches: any[] = [];

      apiResults.forEach(({ config, data: apiData }) => {
        if (!apiData) return;
        const items = extractArrayFromJson(apiData, config.key);

        if (items.length > 0) {
            const apiChannels: Channel[] = items.map((m: any, idx: number) => {
                const statusRaw = String(m.status || m.match_status || '').toUpperCase();
                const isUpcoming = statusRaw.includes('UPCOMING') || statusRaw.includes('SCHEDULE');
                const isLive = statusRaw.includes('LIVE');
                let prefix = isUpcoming ? '⏳ (Upcoming) ' : isLive ? '🔴 ' : '';
                const matchName = String(m.title || m.name || m.channel_name || m.match_name || m.event_name || `Match ${idx}`);
                const streamUrl = String(m.adfree_url || m.dai_url || m.url || m.URL || m.streamUrl || m.stream_url || m.playUrl || m.play_url || m.link || m.file || m.source || m.stream || m.video_url || m.videoUrl || m.channel_url || m.m3u8 || m.hls || m.src || '');

                return {
                    id: `ch-${config.id}-${m.match_id || m.id || idx}`,
                    name: prefix + matchName,
                    logo: String(m.src || m.logo || m.banner || m.icon || m.tvg_logo || m.team_1_flag || m.image || m.poster || m.thumbnail || `https://ui-avatars.com/api/?name=${encodeURIComponent(matchName)}&background=00b865&color=fff`),
                    categoryId: config.id,
                    streamUrl: streamUrl || 'upcoming'
                };
            });
            newCache[config.id] = apiChannels;
            currentChannels = [...currentChannels, ...apiChannels];
            if (config.key === 'matches') rawMatches = [...rawMatches, ...items.map((m:any) => ({...m, configName: config.name}))];
        }
      });

      const masterHubChannels: Channel[] = [
        { id: `ch-master-jtvplus`, name: '🔴 JioTV+ (Worldwide)', logo: 'https://ui-avatars.com/api/?name=Jio+TV&background=000&color=fff', categoryId: 'cat-master-hub', streamUrl: 'https://allinonereborn-jtv.pages.dev/' },
        { id: `ch-master-jtvind`, name: '🔴 JioTV IND (CatchUp)', logo: 'https://ui-avatars.com/api/?name=Jio+IND&background=ff0000&color=fff', categoryId: 'cat-master-hub', streamUrl: 'https://allinonereborn.online/jio-ind/' },
        { id: `ch-master-jtvww`, name: '🔴 JioTV Worldwide', logo: 'https://ui-avatars.com/api/?name=Jio+WW&background=ff0000&color=fff', categoryId: 'cat-master-hub', streamUrl: 'https://allinonereborn.online/jio-ww/' },
        { id: `ch-master-sonyliv`, name: '🌟 SonyLiv (Worldwide)', logo: 'https://ui-avatars.com/api/?name=Sony+Liv&background=000&color=00ffff', categoryId: 'cat-master-hub', streamUrl: 'https://allinonereborn.online/sonyliv/' },
        { id: `ch-master-sonyevents`, name: '🌟 SonyLiv Events', logo: 'https://ui-avatars.com/api/?name=SL+Events&background=000&color=ffb100', categoryId: 'cat-master-hub', streamUrl: 'https://allinonereborn.online/sonyliv-events/' },
        { id: `ch-master-zee5`, name: '🎬 Zee5 SD (Worldwide)', logo: 'https://ui-avatars.com/api/?name=Z5&background=000&color=fff', categoryId: 'cat-master-hub', streamUrl: 'https://allinonereborn.online/zee5/' },
        { id: `ch-master-fancode`, name: '🏏 Fancode (Worldwide)', logo: 'https://ui-avatars.com/api/?name=FC&background=ff5500&color=fff', categoryId: 'cat-master-hub', streamUrl: 'https://allinonereborn.online/fcww/' },
        { id: `ch-master-airtel`, name: '📺 AirtelTV Web (Worldwide)', logo: 'https://ui-avatars.com/api/?name=Airtel&background=ff0000&color=fff', categoryId: 'cat-master-hub', streamUrl: 'https://allinonereborn.online/airteltv-web/' },
        { id: `ch-master-tata`, name: '📺 TataTV Web (Worldwide)', logo: 'https://ui-avatars.com/api/?name=Tata&background=0000ff&color=fff', categoryId: 'cat-master-hub', streamUrl: 'https://allinonereborn.online/tataplay/' },
        { id: `ch-master-iptv`, name: '📡 IPTV Web (Worldwide)', logo: 'https://ui-avatars.com/api/?name=IPTV&background=b100ff&color=fff', categoryId: 'cat-master-hub', streamUrl: 'https://allinonereborn.online/iptv-web/' }
      ];
      newCache['cat-master-hub'] = masterHubChannels;
      currentChannels = [...currentChannels, ...masterHubChannels];

      const sportsKeywords = ['sports', 'ptv', 'willow', 'ten', 'astro', 'sony', 'a sports', 'geo super', 'espn', 'fox', 'supersport', 'bein', 'tsports', 't-sports', 'cricket', 'cric', 'star sports', 'fancode', 'ipl', 'wpl', 'psl', 'bbl', 't20', 'world cup', 'sky sports', 'bt sport', 'euro sport'];
      const blockKeywords = ['movie', 'max', 'gold', 'cinema', 'action', 'entertainment', 'jalsha', 'pravah', 'colors', 'star plus', 'zee tv', 'news', 'music', 'kids', 'cartoon', 'comedy', 'drama', 'nat geo', 'discovery'];

      const allSportsLinks: any[] = [];
      
      currentChannels.forEach(ch => {
          const nameLow = String(ch.name || '').toLowerCase();
          if (blockKeywords.some(badWord => nameLow.includes(badWord))) return;

          if (sportsKeywords.some(kw => nameLow.includes(kw)) && ch.streamUrl !== 'upcoming') {
             const isM3u8 = String(ch.streamUrl || '').includes('.m3u8');
             const isMasterHub = ch.categoryId === 'cat-master-hub';
             if (!allSportsLinks.find(p => p.url === ch.streamUrl)) {
                 let catName = isMasterHub ? 'Master Hub' : ch.categoryId.replace('cat-', '').toUpperCase();
                 allSportsLinks.push({ name: isMasterHub ? `⭐ ${ch.name} (VIP)` : `${ch.name} (${catName})`, url: ch.streamUrl, type: isMasterHub ? 'Iframe' : (isM3u8 ? 'Video' : 'Iframe'), isMasterHub: isMasterHub });
             }
          }
      });
      allSportsLinks.sort((a, b) => { if (a.isMasterHub && !b.isMasterHub) return -1; if (!a.isMasterHub && b.isMasterHub) return 1; return 0; });
      
      setGlobalMultiLinks(allSportsLinks);

      const genericMatches = rawMatches.map((m: any, idx: number) => {
          const statusRaw = String(m.status || m.match_status || '').toUpperCase();
          let status = 'Live'; let isHot = true;
          if (statusRaw.includes('UPCOMING') || statusRaw.includes('SCHEDULE')) { status = 'Upcoming'; isHot = false; } 
          else if (statusRaw.includes('END') || statusRaw.includes('COMPLET')) { status = 'Completed'; isHot = false; }
          const team1Name = String(m.team_1 || m.team_1_name || m.team1 || m.title || m.name || 'Team 1');
          const finalStreamUrl = m.adfree_url || m.dai_url || m.url || m.streamUrl || m.stream_url || 'upcoming';

          return {
              id: m.match_id || m.id || `live-gen-${idx}`, sport: m.event_category || m.sport || m.category || 'Sports', league: m.event_name || m.series_name || m.configName || 'Live Event', team1: team1Name, team2: String(m.team_2 || 'TBA'),
              team1Logo: String(m.src || m.logo || m.team_1_flag || m.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(team1Name)}`), team2Logo: String(m.team_2_flag || m.team2_logo || `https://ui-avatars.com/api/?name=VS`),
              status: status, time: m.startTime || m.start_time || m.time || 'Live Now', isHot: isHot, streamUrl: finalStreamUrl, multiLinks: allSportsLinks 
          };
      });

      let finalMatches = [...genericMatches];

      try {
          const evRes = await fetch(`${LIVE_EVENTS_JSON_URL}?t=${Date.now()}`);
          if (evRes.ok) {
              const pyEventsData = await evRes.json();
              const pyMatches = pyEventsData.map((e: any, idx: number) => ({
                  id: e.id || `match-py-${idx}`, sport: e.sport || 'Sports', league: e.league || 'Live Event', team1: e.team1 || 'Team A', team2: e.team2 || 'Team B',
                  team1Logo: e.team1Logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(e.team1 || 'T1')}&background=1e2024&color=fff`,
                  team2Logo: e.team2Logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(e.team2 || 'T2')}&background=1e2024&color=fff`,
                  status: e.status || 'Live', time: e.time || 'Live Now', isHot: e.isHot !== undefined ? e.isHot : true, type: e.type || 'Video',
                  streamUrl: e.streamUrl || 'upcoming', multiLinks: (e.multiLinks && e.multiLinks.length > 0) ? e.multiLinks : allSportsLinks 
              }));
              finalMatches = [...pyMatches, ...finalMatches];
          }
      } catch(e) {}

      // 🔥 LIVE EVENTS FILTER: Load ONLY Sports & Cricket Channels into the Dashboard
      const liveChannelMatches = currentChannels
          .filter(c => {
              if (!c.streamUrl || c.streamUrl === 'upcoming') return false;
              
              const nameLow = String(c.name || '').toLowerCase();
              const catLow = String(c.categoryId || '').toLowerCase();
              
              // 1. Block explicit non-sports channels
              if (blockKeywords.some(badWord => nameLow.includes(badWord))) return false;
              
              // 2. Allow if it matches sports/cricket keywords OR is from a known sports category
              const isSportsCat = catLow.includes('sport') || catLow.includes('cricket') || catLow.includes('fancode') || catLow.includes('bein');
              const hasSportsName = sportsKeywords.some(kw => nameLow.includes(kw));
              
              return isSportsCat || hasSportsName;
          })
          .map((ch, idx) => {
              const isIframeCat = ch.categoryId === 'cat-master-hub';
              return {
                  id: `dash-ch-${idx}-${ch.id}`,
                  sport: 'Live Sports',
                  league: ch.categoryId.replace('cat-', '').replace('repo-', '').toUpperCase(),
                  team1: ch.name,
                  team2: 'LIVE',
                  team1Logo: ch.logo,
                  team2Logo: 'https://ui-avatars.com/api/?name=TV&background=00b865&color=fff',
                  status: 'Live',
                  time: 'Live Now',
                  isHot: false,
                  type: isIframeCat ? 'Iframe' : 'Video',
                  streamUrl: ch.streamUrl,
                  multiLinks: isIframeCat ? [] : allSportsLinks
              };
          });

      // Append all mapped SPORTS channels to the finalMatches array
      finalMatches = [...finalMatches, ...liveChannelMatches];

      setMatches(finalMatches);
      setAllChannels(currentChannels);
      setPlaylistCache(newCache);
      setIsLoading(false);
    } catch (error: any) {
      console.error(error);
      setIsLoading(false);
      setFetchError("Please check your internet connection.");
    }
  }, []); 

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  const handleCategorySelect = async (category: Category) => {
    if (category.id === 'cat-global-radio') { handleNavChange('radio'); return; }

    setSelectedCategory(category);
    handleNavChange('channel-detail');
    
    if (category.id === 'cat-favorites') { setCategoryChannels(favorites); return; }
    if (playlistCache[category.id] && playlistCache[category.id].length > 0) { setCategoryChannels(playlistCache[category.id]); return; }
    
    if (category.playlistUrl && category.playlistUrl !== 'internal') {
      setIsCategoryLoading(true); setCategoryChannels([]); 
      try {
        const text = await fetchM3UText(category.playlistUrl);
        let parsedChannels: Channel[] = [];
        if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
            const apiData = JSON.parse(text);
            const items = extractArrayFromJson(apiData);
            parsedChannels = items.map((m: any, idx: number) => ({ 
                id: `ch-${category.id}-${m.match_id || m.id || idx}`, 
                name: String(m.title || m.name || m.channel_name || `Channel ${idx}`), 
                logo: String(m.src || m.logo || m.banner || m.icon || m.tvg_logo || m.image || m.poster || `https://ui-avatars.com/api/?name=TV`), 
                categoryId: category.id, 
                streamUrl: String(m.adfree_url || m.dai_url || m.url || m.URL || m.streamUrl || m.stream_url || m.playUrl || m.play_url || m.link || m.file || m.source || m.stream || m.video_url || m.videoUrl || m.channel_url || m.m3u8 || m.hls || 'upcoming') 
            }));
        } else {
            const chs = parseDrmM3u(text);
            parsedChannels = chs.map((m: any, idx: number) => ({
              id: `ch-${category.id}-${idx}`,
              name: String(m.title),
              logo: String(m.src),
              categoryId: category.id,
              streamUrl: String(m.url)
            }));
        }
        if (parsedChannels.length > 0) { 
            setPlaylistCache(prev => ({ ...prev, [category.id]: parsedChannels })); 
            setCategoryChannels(parsedChannels); 
        }
      } catch (error) { console.error(error); } finally { setIsCategoryLoading(false); }
    }
  };

  const playChannel = (ch: Channel) => {
    const isIframeCat = ch.categoryId === 'cat-master-hub';
    setSelectedMatch({ 
        id: ch.id, 
        team1: ch.name, 
        team2: 'VIP Server', 
        team1Logo: ch.logo, 
        team2Logo: ch.logo, 
        league: selectedCategory?.name || 'Live TV', 
        status: 'Live', 
        time: 'Live', 
        sport: 'Other', 
        streamUrl: ch.streamUrl, 
        type: isIframeCat ? 'Iframe' : undefined, 
        multiLinks: isIframeCat ? [] : globalMultiLinks 
    });
    setFloatingMatch(null);
    setActiveView('player');
  };

  const handlePlayMovie = (movie: any) => {
    setSelectedMatch({
        id: movie.id,
        team1: movie.title,
        team2: movie.year,
        team1Logo: movie.poster,
        team2Logo: movie.poster,
        league: movie.genre,
        status: 'Live',
        time: movie.rating + ' ⭐',
        sport: 'Movie',
        streamUrl: movie.streamUrl,
        type: movie.type || 'Video',
        multiLinks: [] 
    });
    setLastMainView('movies');
    setActiveView('player');
  };

  const handleNavChange = (v: any) => {
    setActiveView(v); 
    setLastMainView(v); 
  };

  const renderView = () => {
    if (isLoading) return (
      <div className="flex flex-col items-center justify-center h-full bg-[#121212] z-50 fixed inset-0">
        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-700">
           <div className="w-20 h-20 bg-[#00b865]/10 rounded-full flex items-center justify-center mb-4 border border-[#00b865]/30 shadow-[0_0_30px_rgba(0,184,101,0.2)]">
             <Activity className="w-10 h-10 text-[#00b865] animate-pulse" />
           </div>
           <h1 className="text-4xl font-black tracking-widest text-white mb-8 shadow-black drop-shadow-lg">DAR<span className="text-[#00b865]">TV</span></h1>
           <div className="w-48 h-1.5 bg-white/5 rounded-full overflow-hidden relative"><div className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#00b865] to-green-400 w-full animate-[progress_1.5s_ease-in-out_infinite] origin-left"></div></div>
        </div>
      </div>
    );

    if (fetchError) return <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-6"><WifiOff className="w-10 h-10 text-red-500" /><p className="text-white">{fetchError}</p><button onClick={fetchInitialData} className="bg-white text-black px-8 py-4 rounded-2xl"><RefreshCw className="w-4 h-4 inline" /> Reconnect</button></div>;

    if (globalSearchQuery.trim().length > 0) {
      const searchResults = allChannels.filter(c => String(c.name || '').toLowerCase().includes(globalSearchQuery.toLowerCase())).slice(0, 100);
      return <Suspense fallback={<div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-[#00b865]" /></div>}><ChannelListView channels={searchResults} category={{ id: 'search', name: `Search Results`, playlistUrl: '' }} loading={false} onBack={() => setGlobalSearchQuery('')} onSelectChannel={(ch) => { setGlobalSearchQuery(''); setLastMainView('categories'); playChannel(ch); }} /></Suspense>;
    }

    return (
      <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="w-10 h-10 animate-spin text-[#00b865]" /></div>}>
        {activeView === 'about' && <AboutView />}
        {activeView === 'privacy' && <PrivacyPolicyView />}
        {activeView === 'radio' && <RadioView onBack={() => handleNavChange('categories')} />}
        {activeView === 'movies' && <MoviesView movies={vodMovies} onPlay={handlePlayMovie} />}
        {activeView === 'live-events' && <LiveEventsView matches={matches} onSelectMatch={(m) => { setLastMainView('live-events'); setSelectedMatch(m); setActiveView('player'); }} />}
        
        {activeView === 'categories' && <CategoriesView onSelectCategory={handleCategorySelect} favoritesCount={favorites.length} cloudCategories={cloudCategories} customCategories={customCategories} onAddCustom={handleAddCustomPlaylist} onDeleteCustom={handleDeleteCustomPlaylist} />}
        
        {activeView === 'channel-detail' && <ChannelListView channels={categoryChannels} category={selectedCategory} loading={isCategoryLoading} onBack={() => handleNavChange('categories')} onSelectChannel={(ch) => { setLastMainView('channel-detail'); playChannel(ch); }} />}
        
        {activeView === 'player' && <PlayerView match={selectedMatch} onBack={() => setActiveView(lastMainView)} relatedChannels={categoryChannels.length > 0 ? categoryChannels.slice(0, 40) : allChannels.slice(0, 40)} onSelectRelated={playChannel} />}
      </Suspense>
    );
  };

  const isFullPlayer = activeView === 'player';

  return (
    <div className="flex flex-row h-screen overflow-hidden bg-[#121212] text-white">
      {!isFullPlayer && <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} activeView={activeView as any} onNavigate={handleNavChange} />}
      <div className="flex flex-col flex-1 relative min-w-0">
        {!isFullPlayer && (
          <Header 
            title={activeView === 'categories' ? 'Playlists' : activeView === 'movies' ? 'Movies & VOD' : activeView === 'channel-detail' ? (selectedCategory?.name || 'Channels') : activeView === 'radio' ? 'Virtual Radio' : 'DAR TEVE'} 
            onOpenSidebar={() => setSidebarOpen(true)} showBack={activeView === 'channel-detail' || activeView === 'radio'} onBack={() => handleNavChange('categories')} searchQuery={globalSearchQuery} onSearchChange={setGlobalSearchQuery} 
          />
        )}
        <main className={`flex-1 overflow-y-auto scrollbar-hide ${!isFullPlayer ? 'pb-24 md:pb-6' : ''}`}>
          <div className={`${!isFullPlayer ? 'max-w-[1600px] mx-auto' : 'w-full h-full'}`}>{renderView()}</div>
        </main>
        {!isFullPlayer && <BottomNav activeView={(activeView === 'channel-detail' || activeView === 'radio') ? 'categories' : activeView} onViewChange={handleNavChange} />}
      </div>
      {floatingMatch && <FloatingPlayer match={floatingMatch} onExpand={() => { setSelectedMatch(floatingMatch); setFloatingMatch(null); setActiveView('player'); }} onClose={() => setFloatingMatch(null)} />}
      <style>{`@keyframes progress { 0% { transform: scaleX(0); opacity: 1; } 50% { transform: scaleX(1); opacity: 1; } 100% { transform: scaleX(1); opacity: 0; } }`}</style>
    </div>
  );
};

export default App;