import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/App';
import { backend } from '@/backend';
import '@/styles/index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root is missing from index.html');

void backend.init().catch((error) => {
  if (import.meta.env.DEV) console.error('MAKU backend init failed', error);
});

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
