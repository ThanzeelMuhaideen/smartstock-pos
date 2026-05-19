import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      {/* NO LAYOUT OR ROUTES HERE! App.jsx handles the security and routing */}
      <App />
    </BrowserRouter>
  </StrictMode>,
)