import React from 'react';
import ThemeRenderer from './themeLoader/themeRenderer.jsx';
import { InstallProvider } from './components/pwa/InstallProvider';
import { InstallPopup } from './components/pwa/InstallPopup';

function App() {
  return (
    <InstallProvider>
      <ThemeRenderer />
      <InstallPopup />
    </InstallProvider>
  );
}

export default App;