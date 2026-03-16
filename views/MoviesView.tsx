import React, { useState, useEffect } from 'react';
import { Play, Star, Search, Activity, Film, Calendar, Clock, ArrowRight, Server } from 'lucide-react';

interface MoviesViewProps {
  onPlay: (movieMatchObject: any) => void;
}

interface MovieSection {
    title: string;
    movies: any[];
}

const OMDB_API_KEY = '135b470e';
const BASE_URL = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}`;

// 🔥 PREMIUM FEATURE: Multi-Server System to bypass ISP Blocks
const STREAMING_SERVERS = [
    { id: 'vidsrcme', name: 'Server 1 (Fast)', getUrl: (id: string) => `https://vidsrc.me/embed/movie?imdb=${id}` },
    { id: 'vidsrcpro', name: 'Server 2 (Pro HD)', getUrl: (id: string) => `https://vidsrc.pro/embed/movie/${id}` },
    { id: 'multiembed', name: 'Server 3 (Multi)', getUrl: (id: string) => `https://multiembed.mov/?video_id=${id}&tmdb=1` },
    { id: 'autoembed', name: 'Server 4 (Backup)', getUrl: (id: string) => `https://autoembed.to/movie/imdb/${id}` }
];

export default function MoviesView({ onPlay }: MoviesViewProps) {
    const [sections, setSections] = useState<MovieSection[]>([]);
    const [heroMovie, setHeroMovie] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [searchMode, setSearchMode] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    
    // Default server index
    const [selectedServerIndex, setSelectedServerIndex] = useState(0);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Hero Movie
            const heroRes = await fetch(`${BASE_URL}&i=tt3896198&plot=full`);
            const heroData = await heroRes.json();
            if (heroData.Response === "True") {
                setHeroMovie(heroData);
            }

            // 2. Fetch Netflix-style sections
            const categories = [
                { title: '💥 Marvel Cinematic Universe', query: 'Marvel' },
                { title: '🦇 DC Extended Universe', query: 'Batman' },
                { title: '🚀 Epic Sci-Fi', query: 'Star Wars' },
                { title: '🏎️ Action Blockbusters', query: 'Fast' },
                { title: '🪄 Magical Worlds', query: 'Harry Potter' }
            ];

            const promises = categories.map(async (cat) => {
                const res = await fetch(`${BASE_URL}&s=${encodeURIComponent(cat.query)}&type=movie`);
                const data = await res.json();
                return {
                    title: cat.title,
                    movies: data.Response === "True" ? data.Search : []
                };
            });

            const results = await Promise.all(promises);
            setSections(results.filter(s => s.movies.length > 0));

        } catch (err) {
            console.error("OMDB API Error:", err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const searchOMDB = async (query: string) => {
        if (!query.trim()) {
            setSearchMode(false);
            return;
        }
        
        setIsSearching(true);
        setSearchMode(true);
        setSearchResults([]);

        try {
            const res = await fetch(`${BASE_URL}&s=${encodeURIComponent(query)}&type=movie`);
            const data = await res.json();
            
            if (data.Response === "True") {
                setSearchResults(data.Search);
            } else {
                setSearchResults([]);
            }
        } catch (e) {
            console.error("Search failed:", e);
        }
        setIsSearching(false);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        searchOMDB(searchQuery);
    };

    const handlePlayMovie = (movie: any) => {
        const imdbId = movie.imdbID;
        // Dynamically get the URL from the currently selected server
        const embedUrl = STREAMING_SERVERS[selectedServerIndex].getUrl(imdbId);
        
        const hqPoster = movie.Poster !== 'N/A' ? movie.Poster.replace('SX300', 'SX1080') : '';

        onPlay({
            id: `movie-${imdbId}`,
            team1: movie.Title,
            name: movie.Title,
            streamUrl: embedUrl,
            url: embedUrl,
            type: 'Iframe',
            logo: hqPoster
        });
    };

    return (
        <div className="flex flex-col w-full min-h-screen bg-[#0f1115] text-white overflow-y-auto pb-24">
            
            {/* 🔍 SEARCH BAR SECTION */}
            <div className="sticky top-0 z-50 bg-[#0f1115]/90 backdrop-blur-md p-4 border-b border-white/10 shadow-lg">
                <form onSubmit={handleSearchSubmit} className="relative max-w-4xl mx-auto flex gap-2">
                    <div className="relative flex-1">
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (e.target.value === '') setSearchMode(false);
                            }}
                            placeholder="Search the Global OMDB Movie Database..." 
                            className="w-full bg-[#1a1d24] border border-white/10 text-white rounded-2xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-[#00b865] focus:ring-1 focus:ring-[#00b865] transition-all"
                        />
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#00b865] w-5 h-5" />
                    </div>
                    <button type="submit" className="bg-[#00b865] text-black px-8 py-1.5 rounded-xl font-black text-sm hover:bg-white hover:scale-105 transition-all shadow-[0_0_15px_rgba(0,184,101,0.3)]">
                        Search
                    </button>
                </form>
            </div>

            {/* 🎬 SEARCH RESULTS MODE */}
            {searchMode ? (
                <div className="p-4 md:p-8 max-w-[1600px] mx-auto w-full">
                    <h3 className="text-xl font-black text-white mb-6 uppercase tracking-widest border-l-4 border-[#00b865] pl-3 flex items-center gap-2">
                        Search Results for "{searchQuery}"
                    </h3>
                    
                    {isSearching ? (
                        <div className="flex flex-col items-center justify-center h-[50vh]">
                            <Activity className="w-12 h-12 text-[#00b865] animate-spin mb-4" />
                            <p className="text-[#00b865] font-bold tracking-widest uppercase text-sm animate-pulse">Searching OMDB...</p>
                        </div>
                    ) : searchResults.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[50vh] text-gray-500">
                            <Film className="w-16 h-16 mb-4 opacity-30" />
                            <h2 className="text-xl font-bold">No movies found</h2>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {searchResults.map((movie, idx) => (
                                <div 
                                    key={idx} 
                                    onClick={() => handlePlayMovie(movie)} 
                                    className="group cursor-pointer bg-[#1a1d24] rounded-xl overflow-hidden hover:ring-2 hover:ring-[#00b865] transition-all shadow-lg hover:shadow-[0_0_20px_rgba(0,184,101,0.3)] hover:-translate-y-1"
                                >
                                    <div className="relative aspect-[2/3] overflow-hidden bg-gray-900">
                                        <img 
                                            src={movie.Poster !== 'N/A' ? movie.Poster.replace('SX300', 'SX700') : `https://ui-avatars.com/api/?name=${encodeURIComponent(movie.Title)}&background=00b865&color=fff&size=512`} 
                                            alt={movie.Title} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                                            <div className="flex items-center justify-center w-10 h-10 bg-[#00b865] rounded-full mb-2 shadow-lg mx-auto">
                                                <Play fill="black" className="w-5 h-5 text-black ml-1" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        <h4 className="font-bold text-sm text-white line-clamp-1 mb-1 group-hover:text-[#00b865] transition-colors">{movie.Title}</h4>
                                        <span className="text-xs font-bold text-gray-400">{movie.Year}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                /* 🎬 DEFAULT MODE (Netflix Style with OMDB) */
                <>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-[70vh]">
                            <Activity className="w-12 h-12 text-[#00b865] animate-spin mb-4" />
                            <p className="text-[#00b865] font-bold tracking-widest uppercase text-sm animate-pulse">Connecting to OMDB...</p>
                        </div>
                    ) : (
                        <>
                            {/* 🌟 HERO BANNER */}
                            {heroMovie && (
                                <div className="relative w-full h-auto min-h-[60vh] md:min-h-[75vh] bg-black shrink-0 flex flex-col justify-end pb-8">
                                    <div className="absolute inset-0">
                                        <img 
                                            src={heroMovie.Poster.replace('SX300', 'SX1080')} 
                                            alt={heroMovie.Title} 
                                            className="w-full h-full object-cover opacity-30 blur-sm scale-105" 
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1115] via-[#0f1115]/80 to-transparent" />
                                        <div className="absolute inset-0 bg-gradient-to-r from-[#0f1115] via-[#0f1115]/50 to-transparent" />
                                    </div>
                                    
                                    <div className="relative z-10 px-6 md:px-16 w-full md:w-3/4 animate-in slide-in-from-bottom duration-1000 pt-32">
                                        <div className="flex items-end gap-8 mb-6">
                                            <img 
                                                src={heroMovie.Poster.replace('SX300', 'SX700')} 
                                                alt="Poster" 
                                                className="hidden lg:block w-48 rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.8)] border border-white/10" 
                                            />
                                            <div>
                                                <span className="bg-[#00b865] text-black px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-4 inline-block">Official OMDB Source</span>
                                                <h2 className="text-4xl md:text-6xl font-black mb-4 drop-shadow-2xl leading-tight text-white">{heroMovie.Title}</h2>
                                                <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-gray-300 mb-6">
                                                    <span className="flex items-center gap-1 bg-black/50 px-3 py-1.5 rounded-lg backdrop-blur-md border border-white/5"><Star size={16} className="text-yellow-500" fill="currentColor"/> {heroMovie.imdbRating}/10</span>
                                                    <span className="flex items-center gap-1 bg-black/50 px-3 py-1.5 rounded-lg backdrop-blur-md border border-white/5"><Calendar size={16}/> {heroMovie.Year}</span>
                                                    <span className="flex items-center gap-1 bg-black/50 px-3 py-1.5 rounded-lg backdrop-blur-md border border-white/5"><Clock size={16}/> {heroMovie.Runtime}</span>
                                                    <span className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/5">{heroMovie.Rated}</span>
                                                </div>
                                                <p className="text-gray-300 text-sm md:text-base leading-relaxed line-clamp-3 max-w-3xl drop-shadow-md mb-2">{heroMovie.Plot}</p>
                                                <p className="text-[#00b865] text-xs font-bold uppercase tracking-widest">{heroMovie.Genre}</p>
                                            </div>
                                        </div>
                                        
                                        {/* ⚡ SERVER SELECTOR */}
                                        <div className="bg-black/40 backdrop-blur-md border border-white/5 p-4 rounded-2xl mb-6 max-w-2xl">
                                            <div className="flex items-center gap-2 mb-3 text-gray-400 text-xs font-bold uppercase tracking-widest">
                                                <Server size={14} /> Select Streaming Server
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {STREAMING_SERVERS.map((server, idx) => (
                                                    <button
                                                        key={server.id}
                                                        onClick={() => setSelectedServerIndex(idx)}
                                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${selectedServerIndex === idx ? 'bg-[#00b865] text-black border-[#00b865] shadow-[0_0_15px_rgba(0,184,101,0.4)]' : 'bg-black/50 text-gray-400 border-white/10 hover:border-white/30 hover:text-white'}`}
                                                    >
                                                        {server.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => handlePlayMovie(heroMovie)} 
                                            className="flex items-center justify-center gap-3 bg-[#00b865] text-black px-10 py-4 rounded-xl font-black text-lg hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,184,101,0.4)] hover:bg-white"
                                        >
                                            <Play fill="currentColor" size={24}/> WATCH NOW
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* 🎬 SECTION ROWS */}
                            <div className="p-4 md:p-8 space-y-10 max-w-[1800px] mx-auto overflow-hidden mt-4">
                                {sections.map((section, sectionIdx) => (
                                    <div key={sectionIdx} className="relative">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider">{section.title}</h3>
                                            <ArrowRight className="text-gray-500 hover:text-white cursor-pointer transition-colors" />
                                        </div>
                                        
                                        <div className="flex gap-4 overflow-x-auto pb-6 pt-2 [&::-webkit-scrollbar]:hidden" style={{ scrollSnapType: 'x mandatory' }}>
                                            {section.movies.map((movie, idx) => (
                                                <div 
                                                    key={`${sectionIdx}-${idx}`} 
                                                    onClick={() => handlePlayMovie(movie)}
                                                    className="relative shrink-0 w-36 sm:w-44 md:w-48 group cursor-pointer rounded-xl overflow-hidden transition-all duration-300 hover:scale-110 hover:z-50 shadow-lg border border-white/5"
                                                    style={{ scrollSnapAlign: 'start' }}
                                                >
                                                    <img 
                                                        src={movie.Poster !== 'N/A' ? movie.Poster.replace('SX300', 'SX700') : `https://ui-avatars.com/api/?name=${encodeURIComponent(movie.Title)}&background=00b865&color=fff&size=512`} 
                                                        alt={movie.Title} 
                                                        loading="lazy"
                                                        className="w-full aspect-[2/3] object-cover bg-[#1a1d24]" 
                                                    />
                                                    
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                                        <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                                            <div className="flex items-center justify-center w-10 h-10 bg-[#00b865] rounded-full mb-3 shadow-[0_0_15px_rgba(0,184,101,0.5)]">
                                                                <Play fill="black" className="w-5 h-5 text-black ml-1" />
                                                            </div>
                                                            <h4 className="font-bold text-sm text-white line-clamp-2 leading-tight drop-shadow-md">{movie.Title}</h4>
                                                            <div className="flex items-center gap-2 mt-2 text-xs font-bold">
                                                                <span className="text-[#00b865]">{movie.Year}</span>
                                                                <span className="text-gray-400 border border-gray-600 px-1 rounded uppercase text-[9px]">{movie.Type}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}