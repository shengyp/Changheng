export interface Model {
  id: number;
  modelName: string;
  modelCode: string;
  modelCategory: 'api' | 'local_llm' | 'detection';
  modelType: 'api' | 'ollama' | 'transformers' | 'fealearner' | 'emoji';
  provider?: string;
  apiBaseUrl?: string;
  configTemplate?: string;
  ollamaModelName?: string;
  ollamaBaseUrl?: string;
  modelPath?: string;
  modelFilePath?: string;
  embeddingFilePath?: string;
  detectionType?: string;
  supportedDatasets?: string[];
  description?: string;
  version?: string;
  isAvailable?: boolean;
  isBuiltin?: boolean;
  status: 'active' | 'inactive' | 'error';
  hasApiKey?: boolean;
  performanceMetrics?: Record<string, number>;
  createdAt?: string;
  updatedAt?: string;
}

export interface PromptTemplate {
  id: number;
  name: string;
  taskType: string;
  description?: string;
  promptContent: string;
  variables?: unknown;
  modelId?: number;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
}

const API_BASE = import.meta.env.VITE_MODEL_CENTER_API_BASE || '';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    },
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(payload?.detail || payload?.message || `HTTP ${response.status}`);
  }

  if (payload && typeof payload === 'object' && 'success' in payload) {
    if (!payload.success) {
      throw new Error(payload.message || payload.error || '请求失败');
    }
    return payload.data as T;
  }

  return payload as T;
}

export async function fetchModels(params?: {
  category?: string;
  type?: string;
  status?: string;
}): Promise<Model[]> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set('category', params.category);
  if (params?.type) searchParams.set('model_type', params.type);
  if (params?.status) searchParams.set('status', params.status);
  return request<Model[]>(`/api/models?${searchParams.toString()}`);
}

export async function fetchPromptTemplates(params?: {
  taskType?: string;
}): Promise<PromptTemplate[]> {
  const searchParams = new URLSearchParams();
  if (params?.taskType) searchParams.set('task_type', params.taskType);
  return request<PromptTemplate[]>(`/api/models/templates?${searchParams.toString()}`);
}

export async function createPromptTemplate(
  template: Pick<PromptTemplate, 'name' | 'taskType' | 'promptContent'> & Partial<PromptTemplate>,
): Promise<PromptTemplate> {
  return request<PromptTemplate>('/api/models/templates', {
    method: 'POST',
    body: JSON.stringify(template),
  });
}

export async function updatePromptTemplate(
  templateId: number,
  template: Partial<PromptTemplate>,
): Promise<PromptTemplate> {
  return request<PromptTemplate>(`/api/models/templates/${templateId}`, {
    method: 'PUT',
    body: JSON.stringify(template),
  });
}

export async function deletePromptTemplate(templateId: number): Promise<void> {
  await request(`/api/models/templates/${templateId}`, { method: 'DELETE' });
}

export async function createModel(model: Partial<Model>): Promise<Model> {
  return request<Model>('/api/models', {
    method: 'POST',
    body: JSON.stringify(model),
  });
}

export async function updateModel(modelId: number, model: Partial<Model>): Promise<Model> {
  return request<Model>(`/api/models/${modelId}`, {
    method: 'PUT',
    body: JSON.stringify(model),
  });
}

export async function deleteModel(modelId: number): Promise<void> {
  await request(`/api/models/${modelId}`, { method: 'DELETE' });
}

export async function updateModelApiKey(modelId: number, apiKey: string): Promise<Model> {
  return request<Model>(`/api/models/${modelId}/api-key`, {
    method: 'PUT',
    body: JSON.stringify({ apiKey }),
  });
}
