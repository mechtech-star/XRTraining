import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import ModeSelection from './pages/mode-selection'
import HomeDevelop from './pages/develop/homedevelop'
import HomeOperate from './pages/operate/homeoperate'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ModeSelection />} />
        <Route path="/homedevelop" element={<HomeDevelop />} />
        <Route path="/homeoperate" element={<HomeOperate />} />
      </Routes>
    </Router>
  )
}

export default App
