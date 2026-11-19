import React from 'react';
import { createRoot } from 'react-dom/client';

// UIkit 3 Core & Icons
import 'uikit/dist/css/uikit.min.css';
import UIkit from 'uikit';
import Icons from 'uikit/dist/js/uikit-icons';
// oxlint-disable-next-line react-hooks/rules-of-hooks
UIkit.use(Icons);

// Sistema de diseño BRICOR: Tokens, Base, Layout y Componentes
import './styles/tokens.css';
import './styles/global.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/motion.css';
import './styles/extracted.css';
import './styles/chat.css';

import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
