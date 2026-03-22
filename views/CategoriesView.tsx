import React, { useState } from 'react';
import { Category } from '../types';
import { CATEGORIES } from '../constants';
import { Globe, Star, Tv, Trophy, Music, Film, Newspaper, Heart, Plus, CloudDownload, Trash2, X, Copy, CheckCircle, ListPlus } from 'lucide-react';

interface CategoriesViewProps {
  onSelectCategory: (category: Category) => void;
  favoritesCount: number;
  cloudCategories: Category[];
  customCategories: Category[];
  onAddCustom: (name: string, url: string) => void;
  onDeleteCustom: (id: string) => void;
}

// 🔥 SPECIAL VIP PLAYLISTS DIRECTORY COMPONENT
const SPECIAL_PLAYLISTS = [
  { 
    name: "🏏 Fancode Live Sports", 
    url: "https://raw.githubusercontent.com/dartv-ajaz/tataplay/main/dartv_fancode.m3u" 
  },
  { 
    name: "📺 Tata Play Premium", 
    url: "https://raw.githubusercontent.com/dartv-ajaz/tataplay/main/tata_play.m3u" 
  }
];

const PlaylistDirectory = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (url: string, index: number) => {
    navigator.clipboard.writeText(url);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  return (
    <div className="p-5 bg-gradient-to-br from-[#1a1d24] to-[#121419] rounded-2xl border border-[#00b865]/20 w-full mb-8 shadow-lg">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
        <ListPlus className="w-5 h-5 text-[#00b865]" />
        <h2 className="text-lg font-black text-white uppercase tracking-wider">
          Special VIP Links
        </h2>
      </div>
      
      <p className="text-xs text-gray-400 mb-5 leading-relaxed">
        Copy these secure links and paste them in the <b>"Add M3U Playlist"</b> section below to unlock Fancode and Tata Play.
      </p>

      <div className="flex flex-col md:flex-row gap-3">
        {SPECIAL_PLAYLISTS.map((playlist, index) => (
          <div 
            key={index} 
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-black/40 rounded-xl border border-white/5 flex-1 hover:border-[#00b865]/30 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-200 text-sm mb-1">{playlist.name}</h3>
              <p className="text-[10px] text-gray-500 truncate font-mono bg-black/50 p-1.5 rounded">
                {playlist.url}
              </p>
            </div>
            
            <button
              onClick={() => handleCopy(playlist.url, index)}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                copiedIndex === index 
                  ? 'bg-[#00b865] text-black shadow-[0_0_10px_rgba(0,184,101,0.3)]' 
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {copiedIndex === index ? (
                <><CheckCircle size={14} /> Copied!</>
              ) : (
                <><Copy size={14} /> Copy</>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// 🔥 MAIN CATEGORIES VIEW
const CategoriesView: React.FC<CategoriesViewProps> = ({ 
    onSelectCategory, favoritesCount, cloudCategories, customCategories, onAddCustom, onDeleteCustom 
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const handleSaveCustom = () => {
    if (newName.trim() && newUrl.trim()) {
      onAddCustom(newName.trim(), newUrl.trim());
      setShowAddModal(false);
      setNewName('');
      setNewUrl('');
    }
  };

  const getCategoryIcon = (cat: Category) => {
    const id = cat.id.toLowerCase();
    const name = cat.name.toLowerCase();

    if (id.includes('wc2026') || name.includes('sports')) return <Trophy className="w-8 h-8 text-green-500" />;
    if (id.includes('reg-') || id.includes('cloud-')) return <Globe className="w-8 h-8 text-blue-500" />;
    if (id.includes('movie') || name.includes('movie')) return <Film className="w-8 h-8 text-purple-500" />;
    if (id.includes('custom-')) return <Tv className="w-8 h-8 text-orange-500" />;
    if (id.includes('combined')) return <Star className="w-8 h-8 text-yellow-500" />;
    return <Tv className="w-8 h-8 text-gray-400" />;
  };

  // Group default categories
  const premium = CATEGORIES.filter(c => c.id.includes('combined') || c.id.includes('wc2026') || c.id.includes('worldcup'));
  const content = CATEGORIES.filter(c => c.id.startsWith('cat-') && !premium.includes(c));
  const regions = CATEGORIES.filter(c => c.id.startsWith('reg-'));

  const CategorySection = ({ title, items, isCustom }: { title: string, items: Category[], isCustom?: boolean }) => {
    if (!items.length && !isCustom) return null;
    return (
      <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-white font-black uppercase tracking-[3px] text-sm mb-4 px-3 border-l-4 border-green-500 flex items-center justify-between">
            {title}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-2">
          
          {/* Custom Playlists List */}
          {items.map((cat) => (
            <div key={cat.id} className="relative group">
                <button onClick={() => onSelectCategory(cat)} className="w-full h-full bg-[#1a1d23] border border-white/5 p-5 rounded-2xl flex flex-col items-center justify-center gap-4 hover:border-green-500/50 hover:bg-[#252a33] hover:scale-[1.03] transition-all duration-300 shadow-xl overflow-hidden">
                  <div className="bg-[#0f1115] p-4 rounded-full border border-white/5 shadow-inner z-10">
                    {getCategoryIcon(cat)}
                  </div>
                  <span className="text-gray-200 group-hover:text-white font-bold text-xs sm:text-sm tracking-wide z-10 text-center truncate w-full px-2">
                      {cat.name}
                  </span>
                </button>
                
                {/* Delete button for user's custom playlists */}
                {isCustom && (
                    <button onClick={(e) => { e.stopPropagation(); onDeleteCustom(cat.id); }} className="absolute top-2 right-2 p-2 bg-red-500/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg z-20">
                        <Trash2 size={14} />
                    </button>
                )}
            </div>
          ))}

          {/* ADD NEW BUTTON (Only in the Custom section) */}
          {isCustom && (
             <button onClick={() => setShowAddModal(true)} className="bg-green-500/10 border border-green-500/30 border-dashed p-5 rounded-2xl flex flex-col items-center justify-center gap-4 hover:border-green-500 hover:bg-green-500/20 hover:scale-[1.03] transition-all duration-300 group min-h-[140px]">
                <div className="bg-green-500/20 p-3 rounded-full group-hover:bg-green-500/40 transition-colors">
                  <Plus className="w-8 h-8 text-green-500" />
                </div>
                <span className="text-green-500 font-bold text-xs sm:text-sm tracking-wide text-center">Add M3U Playlist</span>
             </button>
          )}

        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 pb-24 max-w-7xl mx-auto relative">
      
      {/* Favorites Banner */}
      <div className="mb-8 px-2">
        <button onClick={() => onSelectCategory({ id: 'cat-favorites', name: 'My Favorites', playlistUrl: '' })} className="w-full bg-gradient-to-r from-red-600/20 to-[#1a1d23] border border-red-500/30 p-5 rounded-2xl flex items-center gap-5 hover:scale-[1.02] transition-all shadow-xl group">
          <div className="bg-red-500/10 p-4 rounded-full border border-red-500/20 group-hover:bg-red-500/20 transition-colors">
             <Heart className="w-8 h-8 text-red-500 fill-red-500" />
          </div>
          <div className="text-left flex-1">
             <h3 className="text-white font-black text-lg tracking-wide group-hover:text-red-400 transition-colors">My Favorites</h3>
             <p className="text-gray-400 text-xs font-bold mt-1">{favoritesCount > 0 ? `${favoritesCount} Saved Channels` : 'No favorites yet.'}</p>
          </div>
        </button>
      </div>

      {/* 🔥 NAYA PLAYLIST DIRECTORY DABBA YAHAN HAI */}
      <div className="px-2">
        <PlaylistDirectory />
      </div>

      {/* DYNAMIC SECTIONS */}
      <CategorySection title="My Custom Playlists" items={customCategories} isCustom={true} />
      {cloudCategories.length > 0 && <CategorySection title="Cloud Playlists (New)" items={cloudCategories} />}

      {/* DEFAULT SECTIONS */}
      <CategorySection title="Premium M3U Playlists" items={premium} />
      <CategorySection title="Content Genres" items={content} />
      <CategorySection title="Global Regions" items={regions} />

      {/* ADD PLAYLIST MODAL */}
      {showAddModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-50 p-4">
              <div className="bg-[#1a1d23] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#252a33]">
                      <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                          <Plus size={18} className="text-green-500" /> Add Playlist
                      </h3>
                      <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10"><X size={20}/></button>
                  </div>
                  <div className="p-6 flex flex-col gap-4">
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase">Playlist Name</label>
                          <input type="text" placeholder="e.g., Fancode Live" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full bg-[#0f1115] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500" />
                      </div>
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase">M3U URL</label>
                          <input type="text" placeholder="Paste link here..." value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className="w-full bg-[#0f1115] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500" />
                      </div>
                      <button onClick={handleSaveCustom} className="mt-2 w-full bg-green-500 hover:bg-green-600 text-black font-black uppercase tracking-widest py-3 rounded-xl transition-all active:scale-95 shadow-lg">
                          Save Playlist
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default CategoriesView;