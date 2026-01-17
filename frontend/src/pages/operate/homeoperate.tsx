import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Button } from '../../components/ui/button'
import { RefreshCw, Search } from 'lucide-react'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '../../components/ui/input-group'
import Header from '../../components/pagecomponents/header'
import { apiClient } from '../../lib/api'

interface ModuleItem {
  id: string
  title: string
  status?: string
  version?: number
  updated_at?: string
}

function formatPublishedDate(dateStr?: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const day = d.getDate()
  const month = d.toLocaleString('en-US', { month: 'short' })
  const year = d.getFullYear()
  let hours = d.getHours()
  const minutes = d.getMinutes().toString().padStart(2, '0')
  const ampm = hours >= 12 ? 'pm' : 'am'
  hours = hours % 12 || 12
  return `${day} ${month} ${year} - ${hours}:${minutes} ${ampm}`
}

export default function HomeOperate() {
  const navigate = useNavigate()
  const [modules, setModules] = useState<ModuleItem[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')

  const filteredModules = modules.filter((m) => {
    if (!query) return true
    return (m.title || '').toLowerCase().includes(query.toLowerCase())
  })

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
                  <div className="flex items-center gap-3">
                    <InputGroup className="w-64">
                      <InputGroupAddon align="inline-start">
                        <Search className="w-4 h-4" />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="module-search-input"
                        className="text-foreground"
                        placeholder="Search modules..."
                        value={query}
                        onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
                        aria-label="Search modules"
                      />
                    </InputGroup>
                    <Button variant="secondary" size="icon" onClick={reloadModules} aria-label="Reload modules">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                {loading ? (
                  <div className="text-muted-foreground">Loading published modules...</div>
                ) : filteredModules.length === 0 ? (
                  <div className="text-muted-foreground">
                    {modules.length === 0 ? 'No published modules found.' : 'No modules match your search.'}
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {filteredModules.map((m) => (
                      <li key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                        <div>
                          <div className="font-medium text-foreground">{m.title}</div>
                          {m.updated_at && (
                            <div className="text-sm text-muted-foreground">Published on {formatPublishedDate(m.updated_at)}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="lg"
                            onClick={() => {
                              const engineUrl = (import.meta as any).env?.VITE_ENGINE_URL || 'https://localhost:8081'
                              const url = `${engineUrl}?moduleId=${m.id}`
                              window.open(url, '_blank')
                            }}
                          >Open in XR</Button>
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
