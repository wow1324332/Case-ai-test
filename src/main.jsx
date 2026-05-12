import React from 'react'
import ReactDOM from 'react-dom/client'
// 반드시 App.jsx가 같은 폴더에 있어야 하고, 점 하나(./)로 시작해야 합니다.
import App from './App.jsx' 
// 반드시 index.css가 같은 폴더에 있어야 하고, 점 하나(./)로 시작해야 합니다.
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
