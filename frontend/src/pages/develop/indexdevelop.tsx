import { Routes, Route } from 'react-router-dom'
import HomeDevelop from './homedevelop'
import CreateModule from './createmodule'

export default function Develop() {
  return (
    <div className="w-full h-screen overflow-hidden bg-background">
      <Routes>
        <Route path="/" element={<HomeDevelop />} />
        <Route path="/createmodule/:moduleName" element={<CreateModule />} />
      </Routes>
    </div>
  )
}