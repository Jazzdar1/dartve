import React, { useState } from 'react';
import { RefreshCw, ExternalLink, ShieldCheck } from 'lucide-react';

const MasterHubView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const hubUrl = "https://allinonereborn.online/livetv-hub/";

  return (
    <div className="flex flex-col h-full bg-black">
      {/* 🟢 Status Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1a1d24] border-b border-white/5">
         <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#00b865]" />
            <span className="text-xs text-gray-300 font-bold uppercase tracking-wider">Secure Sandbox Active</span>
         </div>
         <div className="flex gap-4">
            <button 
                onClick={() => { 
                    setLoading(true); 
                    const iframe = document.getElementById('master-iframe') as HTMLIFrameElement; 
                    if(iframe) iframe.src = iframe.src; 
                }} 
                className="text-gray-400 hover:text-[#00b865] transition flex items-center gap-1 text-xs font-bold"
            >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Reload
            </button>
            <a href={hubUrl} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-400 transition flex items-center gap-1 text-xs font-bold">
                <ExternalLink size={14} /> Open in Browser
            </a>
         </div>
      </div>

      {/* 📺 Iframe Container */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f1115] z-40">
            <div className="w-12 h-12 border-4 border-[#00b865] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-[#00b865] font-bold text-xs uppercase tracking-widest animate-pulse">Connecting to Master Hub...</p>
          </div>
        )}
        
        <iframe
          id="master-iframe"
          src={hubUrl}
          className="w-full h-full border-none"
          title="Master Hub"
          // 🔥 FIX: 'allow-popups' aur 'allow-popups-to-escape-sandbox' dono add kar diye gaye hain
          sandbox="allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-top-navigation allow-popups allow-popups-to-escape-sandbox"
          allow="autoplay; fullscreen; encrypted-media"
          onLoad={() => setLoading(false)}
        />
      </div>
    </div>
  );
};

export default MasterHubView;