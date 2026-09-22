import api from '../lib/axios';
import type { TagResponse } from '../types/api';

export interface TagRequest {
  id: string;
  name: string;
  slug: string;
  requestedById: string;
  requestedBy?: { id: string; displayName: string; username: string };
  status: 'pending' | 'approved' | 'denied';
  createdAt: string;
}

export async function list(): Promise<TagResponse[]> {
  const { data } = await api.get<TagResponse[]>('/api/v1/tags');
  return data;
}

export async function listRequests(): Promise<TagRequest[]> {
  const { data } = await api.get<TagRequest[]>('/api/v1/tags/requests');
  return data;
}

export async function requestTag(name: string): Promise<TagRequest> {
  const { data } = await api.post<TagRequest>('/api/v1/tags/requests', { name });
  return data;
}

export async function approveRequest(id: string): Promise<void> {
  await api.post(`/api/v1/tags/requests/${id}/approve`);
}

export async function denyRequest(id: string): Promise<void> {
  await api.post(`/api/v1/tags/requests/${id}/deny`);
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
