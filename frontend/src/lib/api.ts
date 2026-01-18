/**
 * API client for backend communication
 * Centralized service for all authoring backend endpoints
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

interface ApiResponse<T> {
  data?: T
  error?: string
  detail?: string
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T | null> {
    const url = `${this.baseUrl}${endpoint}`
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      let errorData: any = {}
      try {
        errorData = text ? JSON.parse(text) : {}
      } catch (e) {
        // ignore non-json error body
      }
      throw new Error(errorData.detail || errorData.error || `HTTP ${response.status}`)
    }

    // Allow for 204 No Content responses
    if (response.status === 204) return null

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      return response.json()
    }

    // Fallback: try to parse text body as JSON, otherwise return raw text
    const text = await response.text().catch(() => '')
    if (!text) return null
    try {
      return JSON.parse(text)
    } catch (e) {
      return (text as unknown) as T
    }
  }

  // Module API
  async createModule(title: string, description?: string, coverAssetId?: string) {
    return this.request('/modules', {
      method: 'POST',
      body: JSON.stringify({
        title,
        description,
        cover_asset: coverAssetId || null,
      }),
    })
  }

  async getModule(moduleId: string) {
    return this.request(`/modules/${moduleId}`)
  }

  async getModules() {
    return this.request(`/modules`)
  }

  async updateModule(moduleId: string, updates: any) {
    return this.request(`/modules/${moduleId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  async deleteModule(moduleId: string) {
    return this.request(`/modules/${moduleId}`, {
      method: 'DELETE',
    })
  }

  // Step API
  async createStep(moduleId: string, title: string, body: string, required = false) {
    return this.request(`/modules/${moduleId}/steps`, {
      method: 'POST',
      body: JSON.stringify({
        title,
        body,
        required,
      }),
    })
  }

  async updateStep(stepId: string, updates: any) {
    return this.request(`/steps/${stepId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  async deleteStep(stepId: string) {
    return this.request(`/steps/${stepId}`, {
      method: 'DELETE',
    })
  }

  async reorderSteps(moduleId: string, orderedStepIds: string[]) {
    return this.request(`/modules/${moduleId}/steps/reorder`, {
      method: 'POST',
      body: JSON.stringify({
        orderedStepIds,
      }),
    })
  }

  // Asset API
  async uploadAsset(
    file: File,
    type: 'image' | 'audio' | 'video' | 'gltf' | 'model' | 'other',
    metadata?: any
  ) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata))
    }

    // Debug: log FormData keys being sent
    try {
      const keys: string[] = []
      formData.forEach((v, k) => keys.push(k))
      // eslint-disable-next-line no-console
      console.debug('[apiClient] uploadAsset FormData keys:', keys)
    } catch (e) {
      // ignore
    }

    const response = await fetch(`${this.baseUrl}/assets/upload`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      // Try to get raw response text for clearer server error
      const text = await response.text().catch(() => '')
      let errorData: any = {}
      try {
        errorData = JSON.parse(text || '{}')
      } catch (e) {
        // not JSON
      }
      // eslint-disable-next-line no-console
      console.error('[apiClient] uploadAsset failed response:', response.status, text)
      throw new Error(errorData.detail || errorData.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  async deleteAsset(assetId: string) {
    const url = `${this.baseUrl}/assets/${assetId}`
    const response = await fetch(url, { method: 'DELETE' })
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      let errorData: any = {}
      try {
        errorData = JSON.parse(text || '{}')
      } catch (e) {}
      throw new Error(errorData.detail || errorData.error || `HTTP ${response.status}`)
    }
    // allow 204 No Content
    const text = await response.text().catch(() => '')
    if (!text) return null
    return JSON.parse(text)
  }

  async getAssets() {
    return this.request(`/assets`)
  }

  // Step Asset Assignment API
  // Assign an existing Asset to a Step. Optionally include per-step metadata
  // such as animation clip, slot name, or transform. Backend may ignore
  // unknown fields until server-side support is added.
  async assignAssetToStep(
    stepId: string,
    assetId: string,
    priority = 0,
    metadata?: { animation?: string; slot?: string; transform?: any }
  ) {
    return this.request(`/steps/${stepId}/assets`, {
      method: 'POST',
      body: JSON.stringify({
        assetId,
        priority,
        metadata: metadata || null,
      }),
    })
  }

  async deleteStepAsset(stepAssetId: string) {
    return this.request(`/step-assets/${stepAssetId}`, {
      method: 'DELETE',
    })
  }

  async updateStepAssetMetadata(stepAssetId: string, metadata: any) {
    return this.request(`/step-assets/${stepAssetId}`, {
      method: 'PUT',
      body: JSON.stringify({ metadata }),
    })
  }

  // Publish API
  async publishModule(moduleId: string) {
    return this.request(`/modules/${moduleId}/publish`, {
      method: 'POST',
    })
  }

  // Update step models in bulk (client-side helper). Backend must support
  // consuming this shape (e.g., via a dedicated endpoint) for changes to persist.
  async setStepModels(stepId: string, models: Array<any>) {
    return this.request(`/steps/${stepId}`, {
      method: 'PUT',
      body: JSON.stringify({ models }),
    })
  }

  async getModuleRuntime(moduleId: string) {
    return this.request(`/modules/${moduleId}/runtime`)
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
export type { ApiResponse }
