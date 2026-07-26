import React, { createContext, useEffect, useState } from 'react';

export const InstallPromptContext = createContext(null);

// Module-level variable to hold the deferred prompt event securely
let deferredPrompt = null;

export const InstallProvider = ({ children }) => {
  const [showInstallPopup, setShowInstallPopup] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);

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
      e.preventDefault();          // Prevent Chrome's default mini-infobar
      deferredPrompt = e;          // Save the event
      setIsInstallable(true);
      
      // Delay showing the popup for a premium user experience (10 seconds)
      setTimeout(() => {
        if (localStorage.getItem('pwa-installed') !== 'true') {
          setShowInstallPopup(true);
        }
      }, 10000);
    };

    const handleAppInstalled = () => {
      console.log('PWA Installed');
      localStorage.setItem('pwa-installed', 'true');
      setIsInstalled(true);
      setShowInstallPopup(false);
      setIsInstallable(false);
      deferredPrompt = null;
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

    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User installed the app');
      localStorage.setItem('pwa-installed', 'true');
      setIsInstalled(true);
    } else {
      console.log('User dismissed the install prompt');
    }

    deferredPrompt = null;
    setIsInstallable(false);
    setShowInstallPopup(false);
  };

  const handleLater = () => {
    setShowInstallPopup(false);
  };

  return (
    <InstallPromptContext.Provider value={{
      deferredPrompt: isInstallable, // Map to isInstallable so buttons can check it
      isInstallable,
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
export default InstallProvider;
