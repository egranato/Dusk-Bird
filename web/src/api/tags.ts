import api from '../lib/axios';
import type { TagResponse } from '../types/api';

export async function list(): Promise<TagResponse[]> {
  const { data } = await api.get<TagResponse[]>('/api/v1/tags');
  return data;
}

export async function create(name: string): Promise<TagResponse> {
  const { data } = await api.post<TagResponse>('/api/v1/tags', { name });
  return data;
}

export async function update(id: string, name: string): Promise<TagResponse> {
  const { data } = await api.patch<TagResponse>(`/api/v1/tags/${id}`, { name });
  return data;
}

export async function merge(sourceId: string, targetId: string): Promise<void> {
  await api.post('/api/v1/tags/merge', { sourceId, targetId });
}

export async function remove(id: string): Promise<void> {
  await api.delete(`/api/v1/tags/${id}`);
}
