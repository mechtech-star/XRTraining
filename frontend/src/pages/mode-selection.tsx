import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'

export default function ModeSelection() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-white">XR Training</h1>
          <p className="text-lg text-slate-300">Select a mode to continue</p>
        </div>

        <div className="flex gap-6 justify-center">
          <Button
            onClick={() => navigate('/homedevelop')}
            size="lg"
            className="px-8 py-6 text-lg"
          >
            Develop
          </Button>
          <Button
            onClick={() => navigate('/homeoperate')}
            size="lg"
            variant="outline"
            className="px-8 py-6 text-lg"
          >
            Operate
          </Button>
        </div>
      </div>
    </div>
  )
}
