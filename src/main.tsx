import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const isExtensionRuntime = window.location.protocol === 'chrome-extension:';

if (isExtensionRuntime) {
  document.documentElement.classList.add('extension-popup');
  document.body.classList.add('extension-popup');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
