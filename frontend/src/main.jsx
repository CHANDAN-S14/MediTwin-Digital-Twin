import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

/**
 * Entry point.
 *
 * StrictMode is on, and it is worth saying why given what it does to this app:
 * every effect runs twice in development, which means the socket connects,
 * disconnects and reconnects on mount. That is not a bug to be worked around — it
 * is the check that the cleanup in SocketContext actually works. An app that only
 * behaves correctly when effects run once will misbehave the first time a user
 * navigates away and back.
 */

const container = document.getElementById('root');

if (!container) {
  throw new Error('No #root element — index.html is not the one that got served.');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
