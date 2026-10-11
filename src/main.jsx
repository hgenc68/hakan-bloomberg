import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Chart as ChartJS, registerables } from 'chart.js'
import './index.css'
import App from './App.jsx'

// Register all Chart.js controllers, scales, and plugins globally at app startup
ChartJS.register(...registerables);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

