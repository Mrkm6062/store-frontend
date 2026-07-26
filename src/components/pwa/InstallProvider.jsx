import React, { createContext, useEffect, useState } from 'react';

export const InstallPromptContext = createContext(null);

export const InstallProvider = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPopup, setShowInstallPopup] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already marked installed
    if (localStorage.getItem('pwa-installed') === 'true') {
      setIsInstalled(true);
      return;
    }

    // Check if running in standalone mode (already launched from Home screen)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      localStorage.setItem('pwa-installed', 'true');
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Delay showing the popup for a premium user experience (10 seconds)
      setTimeout(() => {
        if (localStorage.getItem('pwa-installed') !== 'true') {
          setShowInstallPopup(true);
        }
      }, 10000);
    };

    const handleAppInstalled = () => {
      console.log('[PWA] Installed successfully');
      localStorage.setItem('pwa-installed', 'true');
      setIsInstalled(true);
      setShowInstallPopup(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setShowInstallPopup(false);
    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      console.log('[PWA] User accepted installation');
      localStorage.setItem('pwa-installed', 'true');
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleLater = () => {
    setShowInstallPopup(false);
  };

  return (
    <InstallPromptContext.Provider value={{
      deferredPrompt,
      showInstallPopup,
      setShowInstallPopup,
      isInstalled,
      handleInstall,
      handleLater
    }}>
      {children}
    </InstallPromptContext.Provider>
  );
};
