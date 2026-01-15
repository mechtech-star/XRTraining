import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Code, Play } from 'lucide-react'

export default function ModeSelection() {
  const navigate = useNavigate()

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background relative"
      style={{
        backgroundImage: `url('/industry-background.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />

      {/* Glassmorphic center container */}
      <div className="relative max-w-lg p-8 rounded-2xl border border-border bg-card/5 backdrop-blur-md shadow-2xl">
        <div className="grid grid-cols-1 items-center text-card-foreground text-center">
          <div className="px-2 py-4 flex flex-col justify-center items-center">
            {/* Header section */}
            <div className="flex items-center justify-center gap-3">
              <h1 className="text-4xl font-extrabold mb-0 text-foreground">XR Training</h1>
              <span className="inline-block text-xs ml-1 px-2 py-1 rounded-md bg-primary/10 text-primary">beta</span>
            </div>

            <p className="text-sm text-muted-foreground mt-3">Pick a mode to either build experiences or run and preview them in the emulator.</p>

            {/* Action buttons */}
            <div className="flex flex-col items-center gap-4 pt-6">
              <Button
                onClick={() => navigate('/develop')}
                size="lg"
                className="w-full sm:w-72 flex items-center justify-center gap-2 py-3"
              >
                <Code size={18} />
                Develop
              </Button>

              <Button
                onClick={() => navigate('/homeoperate')}
                size="lg"
                variant="outline"
                className="w-full sm:w-72 flex items-center justify-center gap-2 py-3"
              >
                <Play size={18} />
                Operate
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
