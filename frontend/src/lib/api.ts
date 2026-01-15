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
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || errorData.error || `HTTP ${response.status}`)
    }

    return response.json()
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

    const response = await fetch(`${this.baseUrl}/assets/upload`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || errorData.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  async getAssets() {
    return this.request(`/assets`)
  }

  // Step Asset Assignment API
  async assignAssetToStep(stepId: string, assetId: string, priority = 0) {
    return this.request(`/steps/${stepId}/assets`, {
      method: 'POST',
      body: JSON.stringify({
        assetId,
        priority,
      }),
    })
  }

  async deleteStepAsset(stepAssetId: string) {
    return this.request(`/step-assets/${stepAssetId}`, {
      method: 'DELETE',
    })
  }

  // Publish API
  async publishModule(moduleId: string) {
    return this.request(`/modules/${moduleId}/publish`, {
      method: 'POST',
    })
  }

  async getModuleRuntime(moduleId: string) {
    return this.request(`/modules/${moduleId}/runtime`)
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
export type { ApiResponse }
