import { useContext } from 'react';
import { InstallPromptContext } from './InstallProvider';

export const useInstallPrompt = () => {
  const context = useContext(InstallPromptContext);
  if (!context) {
    throw new Error('useInstallPrompt must be used within an InstallProvider');
  }
  return context;
};
