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

// 🔥 STRICTLY ONLY PLAYLISTS FROM UPLOADED IPTV.TXT (ZERO EXTERNAL FETCHERS) 🔥
const UPLOADED_PLAYLISTS = [
  { id: 'cat-0', name: 'Africa', url: 'https://iptv-org.github.io/iptv/regions/afr.m3u' },
  { id: 'cat-1', name: 'Americas', url: 'https://iptv-org.github.io/iptv/regions/amer.m3u' },
  { id: 'cat-2', name: 'Arab', url: 'https://iptv-org.github.io/iptv/regions/arab.m3u' },
  { id: 'cat-3', name: 'Asia', url: 'https://iptv-org.github.io/iptv/regions/asia.m3u' },
  { id: 'cat-4', name: 'Asia APAC', url: 'https://iptv-org.github.io/iptv/regions/apac.m3u' },
  { id: 'cat-5', name: 'Asian N', url: 'https://iptv-org.github.io/iptv/regions/asean.m3u' },
  { id: 'cat-6', name: 'Balkan', url: 'https://iptv-org.github.io/iptv/regions/balkan.m3u' },
  { id: 'cat-7', name: 'Benelux', url: 'https://iptv-org.github.io/iptv/regions/benelux.m3u' },
  { id: 'cat-8', name: 'Caribbean', url: 'https://iptv-org.github.io/iptv/regions/carib.m3u' },
  { id: 'cat-9', name: 'Central A', url: 'https://iptv-org.github.io/iptv/regions/cenamer.m3u' },
  { id: 'cat-10', name: 'Central U', url: 'https://iptv-org.github.io/iptv/regions/cee.m3u' },
  { id: 'cat-11', name: 'C Asia', url: 'https://iptv-org.github.io/iptv/regions/cas.m3u' },
  { id: 'cat-12', name: 'C Europe', url: 'https://iptv-org.github.io/iptv/regions/ceu.m3u' },
  { id: 'cat-13', name: 'Common', url: 'https://iptv-org.github.io/iptv/regions/cis.m3u' },
  { id: 'cat-14', name: 'East Afr', url: 'https://iptv-org.github.io/iptv/regions/eaf.m3u' },
  { id: 'cat-15', name: 'East Asia', url: 'https://iptv-org.github.io/iptv/regions/eas.m3u' },
  { id: 'cat-16', name: 'Europe', url: 'https://iptv-org.github.io/iptv/regions/eur.m3u' },
  { id: 'cat-17', name: 'Europe EMEA', url: 'https://iptv-org.github.io/iptv/regions/emea.m3u' },
  { id: 'cat-18', name: 'European', url: 'https://iptv-org.github.io/iptv/regions/eu.m3u' },
  { id: 'cat-19', name: 'Gulf', url: 'https://iptv-org.github.io/iptv/regions/gcc.m3u' },
  { id: 'cat-20', name: 'Hispan', url: 'https://iptv-org.github.io/iptv/regions/hispam.m3u' },
  { id: 'cat-21', name: 'Latin', url: 'https://iptv-org.github.io/iptv/regions/latam.m3u' },
  { id: 'cat-22', name: 'Latin LAC', url: 'https://iptv-org.github.io/iptv/regions/lac.m3u' },
  { id: 'cat-23', name: 'Maghreb', url: 'https://iptv-org.github.io/iptv/regions/maghreb.m3u' },
  { id: 'cat-24', name: 'Middle', url: 'https://iptv-org.github.io/iptv/regions/mideast.m3u' },
  { id: 'cat-25', name: 'Middle Ea', url: 'https://iptv-org.github.io/iptv/regions/mena.m3u' },
  { id: 'cat-26', name: 'Nordics', url: 'https://iptv-org.github.io/iptv/regions/nord.m3u' },
  { id: 'cat-27', name: 'North America', url: 'https://iptv-org.github.io/iptv/regions/noram.m3u' },
  { id: 'cat-28', name: 'Northern America', url: 'https://iptv-org.github.io/iptv/regions/nam.m3u' },
  { id: 'cat-29', name: 'Northern Europe', url: 'https://iptv-org.github.io/iptv/regions/neu.m3u' },
  { id: 'cat-30', name: 'Oceania', url: 'https://iptv-org.github.io/iptv/regions/oce.m3u' },
  { id: 'cat-31', name: 'South America', url: 'https://iptv-org.github.io/iptv/regions/southam.m3u' },
  { id: 'cat-32', name: 'South Asia', url: 'https://iptv-org.github.io/iptv/regions/sas.m3u' },
  { id: 'cat-33', name: 'Southeast Asia', url: 'https://iptv-org.github.io/iptv/regions/sea.m3u' },
  { id: 'cat-34', name: 'Southern Africa', url: 'https://iptv-org.github.io/iptv/regions/saf.m3u' },
  { id: 'cat-35', name: 'Southern Europe', url: 'https://iptv-org.github.io/iptv/regions/ser.m3u' },
  { id: 'cat-36', name: 'Sub-Saharan Africa', url: 'https://iptv-org.github.io/iptv/regions/ssa.m3u' },
  { id: 'cat-37', name: 'United Nations', url: 'https://iptv-org.github.io/iptv/regions/un.m3u' },
  { id: 'cat-38', name: 'West Africa', url: 'https://iptv-org.github.io/iptv/regions/waf.m3u' },
  { id: 'cat-39', name: 'West Asia', url: 'https://iptv-org.github.io/iptv/regions/was.m3u' },
  { id: 'cat-40', name: 'Western Europe', url: 'https://iptv-org.github.io/iptv/regions/wer.m3u' },
  { id: 'cat-41', name: 'Worldwide', url: 'https://iptv-org.github.io/iptv/regions/ww.m3u' },
  { id: 'cat-42', name: 'Animation', url: 'https://iptv-org.github.io/iptv/categories/animation.m3u' },
  { id: 'cat-43', name: 'Auto', url: 'https://iptv-org.github.io/iptv/categories/auto.m3u' },
  { id: 'cat-44', name: 'Business', url: 'https://iptv-org.github.io/iptv/categories/business.m3u' },
  { id: 'cat-45', name: 'Classic', url: 'https://iptv-org.github.io/iptv/categories/classic.m3u' },
  { id: 'cat-46', name: 'Comedy', url: 'https://iptv-org.github.io/iptv/categories/comedy.m3u' },
  { id: 'cat-47', name: 'Cooking', url: 'https://iptv-org.github.io/iptv/categories/cooking.m3u' },
  { id: 'cat-48', name: 'Culture', url: 'https://iptv-org.github.io/iptv/categories/culture.m3u' },
  { id: 'cat-49', name: 'Documentary', url: 'https://iptv-org.github.io/iptv/categories/documentary.m3u' },
  { id: 'cat-50', name: 'Education', url: 'https://iptv-org.github.io/iptv/categories/education.m3u' },
  { id: 'cat-51', name: 'Entertainment', url: 'https://iptv-org.github.io/iptv/categories/entertainment.m3u' },
  { id: 'cat-52', name: 'Family', url: 'https://iptv-org.github.io/iptv/categories/family.m3u' },
  { id: 'cat-53', name: 'General', url: 'https://iptv-org.github.io/iptv/categories/general.m3u' },
  { id: 'cat-54', name: 'Interactive', url: 'https://iptv-org.github.io/iptv/categories/interactive.m3u' },
  { id: 'cat-55', name: 'Kids', url: 'https://iptv-org.github.io/iptv/categories/kids.m3u' },
  { id: 'cat-56', name: 'Legislative', url: 'https://iptv-org.github.io/iptv/categories/legislative.m3u' },
  { id: 'cat-57', name: 'Lifestyle', url: 'https://iptv-org.github.io/iptv/categories/lifestyle.m3u' },
  { id: 'cat-58', name: 'Movies', url: 'https://iptv-org.github.io/iptv/categories/movies.m3u' },
  { id: 'cat-59', name: 'Music', url: 'https://iptv-org.github.io/iptv/categories/music.m3u' },
  { id: 'cat-60', name: 'News', url: 'https://iptv-org.github.io/iptv/categories/news.m3u' },
  { id: 'cat-61', name: 'Outdoor', url: 'https://iptv-org.github.io/iptv/categories/outdoor.m3u' },
  { id: 'cat-62', name: 'Public', url: 'https://iptv-org.github.io/iptv/categories/public.m3u' },
  { id: 'cat-63', name: 'Relax', url: 'https://iptv-org.github.io/iptv/categories/relax.m3u' },
  { id: 'cat-64', name: 'Religious', url: 'https://iptv-org.github.io/iptv/categories/religious.m3u' },
  { id: 'cat-65', name: 'Science', url: 'https://iptv-org.github.io/iptv/categories/science.m3u' },
  { id: 'cat-66', name: 'Series', url: 'https://iptv-org.github.io/iptv/categories/series.m3u' },
  { id: 'cat-67', name: 'Shop', url: 'https://iptv-org.github.io/iptv/categories/shop.m3u' },
  { id: 'cat-68', name: 'Sports', url: 'https://iptv-org.github.io/iptv/categories/sports.m3u' },
  { id: 'cat-69', name: 'Travel', url: 'https://iptv-org.github.io/iptv/categories/travel.m3u' },
  { id: 'cat-70', name: 'Weather', url: 'https://iptv-org.github.io/iptv/categories/weather.m3u' },
  { id: 'cat-71', name: 'Undefined', url: 'https://iptv-org.github.io/iptv/categories/undefined.m3u' },
  { id: 'cat-72', name: 'Combined 500', url: 'https://raw.githubusercontent.com/FunctionError/PiratesTv/refs/heads/main/combined_playlist.m3u' },
  { id: 'cat-73', name: 'WC-2026', url: 'https://raw.githubusercontent.com/Jazzdar1/darfree.tv/refs/heads/main/Subirmaxpro.m3u' },
  { id: 'cat-74', name: 'CRICHD', url: 'https://raw.githubusercontent.com/srhady/crichd-speical-live-event/refs/heads/main/Live_Events.m3u' },
  { id: 'cat-75', name: 'GLOBAL SPORTS', url: 'https://iptv-org.github.io/iptv/categories/sports.m3u' },
  { id: 'cat-76', name: 'GLOBAL MOVIES', url: 'https://iptv-org.github.io/iptv/categories/movies.m3u' },
  { id: 'cat-77', name: 'GLOBAL ENTERTAINMENT', url: 'https://iptv-org.github.io/iptv/categories/entertainment.m3u' },
  { id: 'cat-78', name: 'PIRATES TV', url: 'https://raw.githubusercontent.com/FunctionError/PiratesTv/refs/heads/main/combined_playlist.m3u' },
  { id: 'cat-79', name: 'VAST', url: 'https://raw.githubusercontent.com/dartv-ajaz/Live-Sports-Group-A/refs/heads/main/dartv_vast_channels.json' },
  { id: 'cat-80', name: 'Sports Events', url: 'https://raw.githubusercontent.com/srhady/crichd-speical-live-event/refs/heads/main/Footy_Live.json' },
  { id: 'cat-81', name: 'Ax Sports', url: 'https://raw.githubusercontent.com/srhady/axsports/refs/heads/main/playlist.m3u' },
  { id: 'cat-82', name: 'All Sports', url: 'https://raw.githubusercontent.com/srhady/axsports/refs/heads/main/live_sports.json' },
  { id: 'cat-83', name: 'Playlist', url: 'https://raw.githubusercontent.com/srhady/bingstream/refs/heads/main/playlist.m3u' },
  { id: 'cat-84', name: 'FC 1', url: 'https://raw.githubusercontent.com/srhady/Fancode-bd/refs/heads/main/main_playlist.m3u' },
  { id: 'cat-85', name: 'live', url: 'https://raw.githubusercontent.com/srhady/data/refs/heads/main/playlist.json' },
  { id: 'cat-86', name: 'HDCRIC', url: 'https://raw.githubusercontent.com/abusaeeidx/CricHd-playlists-Auto-Update-permanent/refs/heads/main/ALL.m3u' },
  { id: 'cat-87', name: 'bang', url: 'https://raw.githubusercontent.com/abusaeeidx/Mrgify-BDIX-IPTV/refs/heads/main/playlist.m3u' },
  { id: 'cat-88', name: 'all', url: 'https://raw.githubusercontent.com/abusaeeidx/BDxTV/refs/heads/main/full_channels.m3u' },
  { id: 'cat-89', name: 'Playlist 2', url: 'https://raw.githubusercontent.com/IPTVFlixBD/RynoCast-IPTV-M3u-Playlist/refs/heads/main/5startv_live.m3u' },
  { id: 'cat-90', name: 'Movie', url: 'https://raw.githubusercontent.com/IPTVFlixBD/RynoCast-IPTV-M3u-Playlist/refs/heads/main/51_live.m3u' },
  { id: 'cat-91', name: 'Chaupal Drama', url: 'https://raw.githubusercontent.com/dartv-ajaz/chaupal/refs/heads/main/CHAUPAL.m3u' },
  { id: 'cat-92', name: 'Bangladesh Dish', url: 'https://raw.githubusercontent.com/dartv-ajaz/chaupal/refs/heads/main/Bangladesh%20Dish.m3u' },
  { id: 'cat-93', name: 'Pakistani News', url: 'https://raw.githubusercontent.com/dartv-ajaz/chaupal/refs/heads/main/Pak.m3u8' },
  { id: 'cat-94', name: 'Airtel', url: 'https://raw.githubusercontent.com/dartv-ajaz/chaupal/refs/heads/main/xchannels%20(Airtel).json' },
  { id: 'cat-95', name: 'IPTV', url: 'https://raw.githubusercontent.com/dartv-ajaz/chaupal/refs/heads/main/xchannels%20IPTV.json' },
  { id: 'cat-96', name: 'TATA Sky', url: 'https://raw.githubusercontent.com/dartv-ajaz/chaupal/refs/heads/main/xchannelsTata).json' }
];

// Deep Recursive JSON Array Extractor (Bulletproof for all nested structures)
const extractArrayFromJson = (obj: any): any[] => {
  const results: any[] = [];
  const seen = new Set();
  
  const extract = (data: any) => {
    if (!data || typeof data !== 'object') return;
    
    if (Array.isArray(data)) {
      data.forEach(item => {
        if (item && typeof item === 'object') {
          const keys = Object.keys(item).map(k => k.toLowerCase());
          if (keys.some(k => k.includes('url') || k.includes('link') || k.includes('stream') || k.includes('title') || k.includes('name') || k.includes('file'))) {
              const id = item.url || item.link || item.stream || item.name || item.title || item.Url || item.Title || item.VideoUrl;
              if (id && !seen.has(id)) {
                  seen.add(id);
                  results.push(item);
              }
          }
          extract(item); 
        }
      });
    } else {
      Object.values(data).forEach(extract);
    }
  };
  
  extract(obj);
  return results;
};

// Universal Standard M3U Parser
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
  // App opens directly to Categories to prevent startup hanging
  const [activeView, setActiveView] = useState<AppScreen>('categories');
  const [lastMainView, setLastMainView] = useState<AppScreen>('categories');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  
  const [matches, setMatches] = useState<Match[]>([]);
  const [allChannels, setAllChannels] = useState<Channel[]>([]);
  const [categoryChannels, setCategoryChannels] = useState<Channel[]>([]);
  const [playlistCache, setPlaylistCache] = useState<Record<string, Channel[]>>({});
  
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

  // 🔥 Fetch Initial Metadata + Fetch specific Default Playlists for Live Events
  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const newCloudCats: Category[] = UPLOADED_PLAYLISTS.map(p => ({
          id: p.id,
          name: p.name,
          playlistUrl: p.url
      }));
      setCloudCategories(newCloudCats);

      // Identify the exact default playlists user requested to be pre-loaded
      const defaultPlaylists = UPLOADED_PLAYLISTS.filter(p => 
          p.name === 'CRICHD' || 
          p.name === 'Ax Sports' || 
          p.name === 'All Sports'
      );

      let initialMatches: Match[] = [];
      let initialChannels: Channel[] = [];

      await Promise.all(defaultPlaylists.map(async (cat) => {
          try {
              const text = await fetchM3UText(cat.url);
              let parsedChannels: Channel[] = [];
              
              if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
                  const apiData = JSON.parse(text);
                  const items = extractArrayFromJson(apiData);
                  parsedChannels = items.map((m: any, idx: number) => ({
                       id: `ch-${cat.id}-${idx}`,
                       name: String(m.title || m.name || m.channel_name || `Channel ${idx}`),
                       logo: String(m.src || m.logo || m.banner || m.image || `https://ui-avatars.com/api/?name=TV`),
                       categoryId: cat.id,
                       streamUrl: String(m.adfree_url || m.url || m.streamUrl || m.link || m.playUrl || '')
                  })).filter(ch => ch.streamUrl && ch.streamUrl !== 'upcoming');
              } else {
                  const chs = parseDrmM3u(text);
                  parsedChannels = chs.map((m: any, idx: number) => ({
                       id: `ch-${cat.id}-${idx}`,
                       name: String(m.title),
                       logo: String(m.src),
                       categoryId: cat.id,
                       streamUrl: String(m.url)
                  })).filter(ch => ch.streamUrl);
              }

              initialChannels = [...initialChannels, ...parsedChannels];

              // Push to Live Dashboard if they match sports criteria
              const sportsKeywords = ['sports', 'ptv', 'willow', 'ten', 'astro', 'sony', 'cricket', 'cric', 'fancode', 'live'];
              parsedChannels.forEach((ch, idx) => {
                  const nameLow = ch.name.toLowerCase();
                  if (sportsKeywords.some(kw => nameLow.includes(kw))) {
                      initialMatches.push({
                          id: `dash-${cat.id}-${idx}`,
                          sport: 'Live Sports',
                          league: cat.name.toUpperCase(),
                          team1: ch.name,
                          team2: 'LIVE',
                          team1Logo: ch.logo,
                          team2Logo: 'https://ui-avatars.com/api/?name=TV&background=00b865&color=fff',
                          status: 'Live',
                          time: 'Live Now',
                          isHot: true,
                          type: 'Video',
                          streamUrl: ch.streamUrl,
                          multiLinks: []
                      });
                  }
              });

              setPlaylistCache(prev => ({ ...prev, [cat.id]: parsedChannels }));
          } catch (e) {
              console.error(`Failed loading default playlist ${cat.name}`, e);
          }
      }));

      setAllChannels(initialChannels);
      setMatches(initialMatches);
      setIsLoading(false);
    } catch (error: any) {
      console.error(error);
      setIsLoading(false);
      setFetchError("Application startup failed.");
    }
  }, []); 

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  // 🔥 PLAYLIST IS ONLY LOADED WHEN CLICKED
  const handleCategorySelect = async (category: Category) => {
    if (category.id === 'cat-global-radio') { handleNavChange('radio'); return; }

    setSelectedCategory(category);
    handleNavChange('channel-detail');
    
    if (category.id === 'cat-favorites') { setCategoryChannels(favorites); return; }
    if (playlistCache[category.id] && playlistCache[category.id].length > 0) { setCategoryChannels(playlistCache[category.id]); return; }
    
    if (category.playlistUrl) {
      setIsCategoryLoading(true); setCategoryChannels([]); 
      try {
        let parsedChannels: Channel[] = [];
        
        const text = await fetchM3UText(category.playlistUrl);
        if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
            const apiData = JSON.parse(text);
            const items = extractArrayFromJson(apiData); 
            parsedChannels = items.map((m: any, idx: number) => ({ 
                id: `ch-${category.id}-${m.match_id || m.id || idx}`, 
                name: String(m.title || m.name || m.channel_name || m.Title || m.Name || `Channel ${idx}`), 
                logo: String(m.src || m.logo || m.banner || m.icon || m.tvg_logo || m.image || m.poster || m.Logo || m.Image || `https://ui-avatars.com/api/?name=TV`), 
                categoryId: category.id, 
                streamUrl: String(m.adfree_url || m.dai_url || m.url || m.URL || m.streamUrl || m.stream_url || m.playUrl || m.play_url || m.link || m.file || m.source || m.stream || m.video_url || m.videoUrl || m.channel_url || m.m3u8 || m.hls || m.Url || m.VideoUrl || m.STREAM || 'upcoming') 
            })).filter(ch => ch.streamUrl !== 'upcoming' && ch.streamUrl !== '');
        } else {
            const chs = parseDrmM3u(text);
            parsedChannels = chs.map((m: any, idx: number) => ({
              id: `ch-${category.id}-${idx}`,
              name: String(m.title),
              logo: String(m.src),
              categoryId: category.id,
              streamUrl: String(m.url)
            })).filter(ch => ch.streamUrl !== 'upcoming' && ch.streamUrl !== '');
        }
        
        if (parsedChannels.length > 0) { 
            setPlaylistCache(prev => ({ ...prev, [category.id]: parsedChannels })); 
            setCategoryChannels(parsedChannels); 
            
            setAllChannels(prev => {
                const newAll = [...prev];
                parsedChannels.forEach(pc => {
                    if (!newAll.some(c => c.id === pc.id)) newAll.push(pc);
                });
                return newAll;
            });

            const sportsKeywords = ['sports', 'ptv', 'willow', 'ten', 'astro', 'sony', 'cricket', 'cric', 'fancode'];
            const blockKeywords = ['movie', 'max', 'gold', 'cinema', 'action', 'entertainment', 'jalsha', 'pravah', 'colors', 'star plus', 'zee tv', 'news', 'kids', 'drama'];
            
            const liveChannelMatches = parsedChannels
                .filter(c => {
                    const nameLow = String(c.name || '').toLowerCase();
                    const catLow = String(category.name || '').toLowerCase();
                    if (blockKeywords.some(badWord => nameLow.includes(badWord))) return false;
                    const isSportsCat = catLow.includes('sport') || catLow.includes('cricket') || catLow.includes('fancode') || catLow.includes('bein') || catLow.includes('hdcric');
                    const hasSportsName = sportsKeywords.some(kw => nameLow.includes(kw));
                    return isSportsCat || hasSportsName;
                })
                .map((ch, idx) => ({
                    id: `dash-ch-${idx}-${ch.id}`,
                    sport: 'Live Sports',
                    league: category.name.toUpperCase(),
                    team1: ch.name,
                    team2: 'LIVE',
                    team1Logo: ch.logo,
                    team2Logo: 'https://ui-avatars.com/api/?name=TV&background=00b865&color=fff',
                    status: 'Live',
                    time: 'Live Now',
                    isHot: true,
                    type: 'Video',
                    streamUrl: ch.streamUrl,
                    multiLinks: []
                }));

            setMatches(prev => {
                const newMatches = [...prev];
                liveChannelMatches.forEach(lm => {
                    if (!newMatches.some(m => m.streamUrl === lm.streamUrl)) newMatches.push(lm);
                });
                return newMatches;
            });
        }
      } catch (error) { console.error(error); } finally { setIsCategoryLoading(false); }
    }
  };

  const playChannel = (ch: Channel) => {
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
        type: undefined, 
        multiLinks: [] 
    });
    setFloatingMatch(null);
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
        {activeView === 'live-events' && <LiveEventsView matches={matches} onSelectMatch={(m) => { setLastMainView('live-events'); setSelectedMatch(m); setActiveView('player'); }} />}
        
        {activeView === 'categories' && <CategoriesView onSelectCategory={handleCategorySelect} favoritesCount={favorites.length} cloudCategories={cloudCategories} customCategories={customCategories} onAddCustom={handleAddCustomPlaylist} onDeleteCustom={handleDeleteCustomPlaylist} />}
        
        {activeView === 'channel-detail' && <ChannelListView channels={categoryChannels} category={selectedCategory} loading={isCategoryLoading} onBack={() => handleNavChange('categories')} onSelectChannel={(ch) => { setLastMainView('channel-detail'); playChannel(ch); }} />}
        
        {activeView === 'player' && <PlayerView match={selectedMatch} onBack={() => setActiveView(lastMainView)} relatedChannels={categoryChannels.length > 0 ? categoryChannels : matches.map(m => ({ id: m.id, name: m.team1, logo: m.team1Logo, categoryId: m.league, streamUrl: m.streamUrl }))} onSelectRelated={playChannel} isPlaylistMode={categoryChannels.length > 0} />}
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