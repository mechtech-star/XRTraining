import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Button } from '../../components/ui/button'
import Header from '../../components/pagecomponents/header'
import { apiClient } from '../../lib/api'

interface ModuleItem {
  id: string
  title: string
  status?: string
  version?: number
  updated_at?: string
}

export default function HomeOperate() {
  const navigate = useNavigate()
  const [modules, setModules] = useState<ModuleItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
      ; (async () => {
        try {
          setLoading(true)
          const list: any = await apiClient.getModules()
          if (!mounted) return
          // show only modules marked as published
          const published = (list || []).filter((m: any) => m.status === 'published')
          setModules(published)
        } catch (err) {
          console.warn('Failed to load published modules:', err)
        } finally {
          setLoading(false)
        }
      })()
    return () => { mounted = false }
  }, [])

  const reloadModules = async () => {
    try {
      setLoading(true)
      const list: any = await apiClient.getModules()
      const published = (list || []).filter((m: any) => m.status === 'published')
      setModules(published)
    } catch (err) {
      console.warn('Failed to reload modules:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="overflow-hidden h-screen">
        <div className="grid grid-rows-[auto_1fr] grid-cols-1 lg:grid-cols-12 h-screen">
          <Header title="Operate Workspace" onBack={() => navigate('/')} />

          <div className="col-span-1 lg:col-span-12 pl-2 py-2 overflow-hidden">
            <div className="h-full rounded-lg border border-border bg-background flex flex-col overflow-hidden">
              <div className="p-3 flex items-center justify-between border-b border-border flex-shrink-0">
                <h3 className="text-lg font-medium text-foreground">Published Modules</h3>
                <div className="flex items-center gap-3">
                  <Button variant="secondary" size="sm" onClick={reloadModules}>Reload</Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                {loading ? (
                  <div className="text-muted-foreground">Loading published modules...</div>
                ) : modules.length === 0 ? (
                  <div className="text-muted-foreground">No published modules found.</div>
                ) : (
                  <ul className="space-y-2">
                    {modules.map((m) => (
                      <li key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                        <div>
                          <div className="font-medium text-foreground">{m.title}</div>
                          {m.updated_at && (
                            <div className="text-sm text-muted-foreground">{new Date(m.updated_at).toLocaleString()}</div>
                          )}
                          <div className="text-sm text-muted-foreground">Version: {m.version ?? '-'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/operate/module/${m.id}`)}>Open</Button>
                          <Button variant="ghost" size="sm" onClick={async () => {
                            try {
                              const runtime = await apiClient.getModuleRuntime(m.id)
                              // open runtime JSON in new tab
                              const blob = new Blob([JSON.stringify(runtime, null, 2)], { type: 'application/json' })
                              const url = URL.createObjectURL(blob)
                              window.open(url, '_blank')
                            } catch (err) {
                              alert('Failed to fetch runtime payload')
                            }
                          }}>View JSON</Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>


        </div>
      </div>
    </main>
  )
}
