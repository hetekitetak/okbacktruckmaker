import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// グローバル CSS（リセット等はApp.cssに統合）
const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
