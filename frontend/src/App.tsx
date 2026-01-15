import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import ModeSelection from './pages/mode-selection'
import HomeOperate from './pages/operate/homeoperate'
import Develop from './pages/develop/indexdevelop'
import './App.css'
import { Toaster } from './components/ui/sonner'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ModeSelection />} />
        <Route path="/develop/*" element={<Develop />} />
        <Route path="/homeoperate" element={<HomeOperate />} />
      </Routes>
      <Toaster />
    </Router>
  )
}

export default App
