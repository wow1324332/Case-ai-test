import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '../App.jsx' // Fix: Update the import path for App
// Remove the import for index.css as it is not needed for the single-file setup
// import './index.css' 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
