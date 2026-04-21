import React, { useEffect, useRef } from 'react';
// Import shaka-player. We use the uncompiled version for React
import shaka from 'shaka-player/dist/shaka-player.ui.js';
import 'shaka-player/dist/controls.css';

interface DrmPlayerProps {
  mpdUrl: string;
  drmKeyId: string;
  drmKey: string;
}

const DrmPlayer: React.FC<DrmPlayerProps> = ({ mpdUrl, drmKeyId, drmKey }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Install built-in polyfills to patch browser incompatibilities
    shaka.polyfill.installAll();

    if (!shaka.Player.isBrowserSupported()) {
      console.error('Browser not supported for DRM playback!');
      return;
    }

    const video = videoRef.current;
    const container = videoContainerRef.current;
    if (!video || !container) return;

    // Initialize the Shaka Player
    const player = new shaka.Player(video);
    const ui = new shaka.ui.Overlay(player, container, video);

    // 🔐 THE MAGIC: Pass the decryption keys to the player
    player.configure({
      drm: {
        clearKeys: {
          // Shaka expects the format { 'key-id': 'key' }
          [drmKeyId]: drmKey
        }
      }
    });

    // Load the encrypted stream
    player.load(mpdUrl).then(() => {
      console.log('🔓 Stream decrypted and loaded successfully!');
      video.play();
    }).catch((error: any) => {
      console.error('❌ Error loading stream', error);
    });

    // Cleanup when you change channels
    return () => {
      player.destroy();
      ui.destroy();
    };
  }, [mpdUrl, drmKeyId, drmKey]);

  return (
    <div ref={videoContainerRef} style={{ width: '100%', maxWidth: '900px', margin: '0 auto', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
      <video 
        ref={videoRef} 
        style={{ width: '100%', height: '100%' }} 
        autoPlay 
        controls={false} // Shaka UI handles controls
      />
    </div>
  );
};

export default DrmPlayer;