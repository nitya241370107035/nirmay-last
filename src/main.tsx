import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker with automatic updates & offline cache handling
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('A new version of Nirāmay is available. Reload to update?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('Nirāmay is ready to work offline.');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Dismiss splash loader immediately upon mount
requestAnimationFrame(() => {
  const splash = document.getElementById('splash-loader');
  if (splash) {
    splash.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    splash.style.opacity = '0';
    splash.style.transform = 'scale(0.98)';
    setTimeout(() => splash.remove(), 250);
  }
});

