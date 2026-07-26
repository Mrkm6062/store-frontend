import React from 'react';
import { useInstallPrompt } from './useInstallPrompt';
import { useStore } from '../../services/useStore';

export const InstallPopup = () => {
  const { showInstallPopup, handleInstall, handleLater } = useInstallPrompt();
  const { store } = useStore();

  if (!showInstallPopup) return null;
  if (!store?.pwa?.enabled) return null;

  // Utilize dynamic branding color tokens if defined, fallback to default green
  const themeColor = store?.pwa?.themeColor || '#76b900';
  const appName = store?.pwa?.appName || store?.name || 'Store';
  const appIcon = store?.pwa?.icon192 || '/logo.png';

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-sm px-4">
      <div 
        className="bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 p-5 flex flex-col gap-4 animate-[slideUp_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]"
        style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
      >
        <div className="flex items-start gap-4">
          <img 
            src={appIcon} 
            alt={appName} 
            className="w-14 h-14 rounded-xl object-cover shadow-sm bg-slate-50 border border-slate-100"
            onError={(e) => { e.target.src = '/logo.png'; }}
          />
          <div className="flex-1">
            <h3 className="font-extrabold text-slate-800 text-base leading-tight">Install {appName} App</h3>
            <p className="text-slate-500 text-xs mt-1 font-medium leading-relaxed">
              Install our shop for faster loading, offline catalog access and a premium native browsing experience.
            </p>
          </div>
        </div>
        
        <div className="flex gap-2.5 mt-1">
          <button 
            onClick={handleLater}
            className="flex-1 py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-600 font-bold text-xs rounded-xl transition-colors duration-200"
          >
            Later
          </button>
          <button 
            onClick={handleInstall}
            className="flex-1 py-2.5 px-4 text-white font-bold text-xs rounded-xl shadow-md transition-all duration-200 hover:brightness-95 active:scale-95"
            style={{ backgroundColor: themeColor }}
          >
            Install
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            transform: translate3d(0, 100%, 0) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
export default InstallPopup;
