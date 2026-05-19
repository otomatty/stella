import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import '@/lib/pdfjs-worker';

const root = document.getElementById('root');
if (!root) throw new Error('Root element missing');

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
