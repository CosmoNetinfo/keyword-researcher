import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AppAccess from './components/AppAccess.jsx'

console.log("Main.jsx: Initializing React root mounting to #root");
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppAccess><App /></AppAccess>
  </StrictMode>,
)
