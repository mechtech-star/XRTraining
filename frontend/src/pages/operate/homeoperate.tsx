import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/button'

export default function HomeOperate() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-8">
      <div className="max-w-6xl mx-auto">
        <Button
          onClick={() => navigate('/')}
          variant="outline"
          className="mb-8"
        >
          ← Back to Mode Selection
        </Button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Operate Mode</h1>
          <p className="text-gray-600 text-lg">
            Welcome to the operation environment. Deploy and manage your XR applications here.
          </p>
        </div>
      </div>
    </div>
  )
}
