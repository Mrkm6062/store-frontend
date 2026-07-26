import React from 'react';
import { useInstallPrompt } from './useInstallPrompt';
import { useStore } from '../../services/useStore';
import { Download } from 'lucide-react';

export const InstallButton = ({ className = "" }) => {
  const { deferredPrompt, handleInstall } = useInstallPrompt();
  const { store } = useStore();

  if (!deferredPrompt) return null;

  const themeColor = store?.pwa?.themeColor || '#76b900';

  return (
    <button
      onClick={handleInstall}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm hover:brightness-95 transition-all duration-200 ${className}`}
      style={{ backgroundColor: themeColor }}
    >
      <Download size={14} />
      <span>Install App</span>
    </button>
  );
};
export default InstallButton;
