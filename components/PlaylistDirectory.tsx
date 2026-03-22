import React, { useState } from 'react';
import { Copy, CheckCircle, ListPlus } from 'lucide-react';

// 🔥 Yahan sirf Fancode aur Tata Play ke links rahenge
const SPECIAL_PLAYLISTS = [
  { 
    name: "🏏 Fancode Live Sports", 
    url: "https://raw.githubusercontent.com/dartv-ajaz/tataplay/main/dartv_fancode.m3u" 
  },
  { 
    name: "📺 Tata Play Premium", 
    url: "https://raw.githubusercontent.com/dartv-ajaz/tataplay/main/tata_play.m3u" // Agar Tata Play ka link alag hai toh yahan update kar lein
  }
];

const PlaylistDirectory: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (url: string, index: number) => {
    navigator.clipboard.writeText(url);
    setCopiedIndex(index);
    
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  return (
    <div className="p-5 bg-gradient-to-br from-[#1a1d24] to-[#121419] rounded-2xl border border-[#00b865]/20 max-w-3xl mx-auto my-6 shadow-lg">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
        <ListPlus className="w-5 h-5 text-[#00b865]" />
        <h2 className="text-lg font-black text-white uppercase tracking-wider">
          Special VIP Links
        </h2>
      </div>
      
      <p className="text-xs text-gray-400 mb-5 leading-relaxed">
        Copy these secure links and paste them in the <b>"Add Custom Playlist"</b> section below to unlock Fancode and Tata Play.
      </p>

      <div className="flex flex-col gap-3">
        {SPECIAL_PLAYLISTS.map((playlist, index) => (
          <div 
            key={index} 
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-black/40 rounded-xl border border-white/5"
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

export default PlaylistDirectory;