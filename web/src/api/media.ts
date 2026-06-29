import api from '../lib/axios';
import type { MediaItem, PaginatedMedia } from '../types/api';

function getJwtExpiryMs(token: string): number | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(normalized));
    if (typeof json.exp !== 'number') return null;
    return json.exp * 1000;
  } catch {
    return null;
  }
}

function getStableMediaToken(): string {
  const accessToken = localStorage.getItem('token') ?? '';
  if (!accessToken) return '';

  const mediaToken = localStorage.getItem('mediaToken');
  if (mediaToken) {
    const expiry = getJwtExpiryMs(mediaToken);
    if (expiry === null || expiry - Date.now() > 60_000) {
      return mediaToken;
    }
  }

  localStorage.setItem('mediaToken', accessToken);
  return accessToken;
}

export async function browse(params: {
  tags?: string;
  excludeTags?: string;
  mode?: 'and' | 'or';
  sort?: 'newest' | 'oldest' | 'random';
  seed?: string;
  maxTags?: number;
  page?: number;
  limit?: number;
}): Promise<PaginatedMedia> {
  const { data } = await api.get<PaginatedMedia>('/api/v1/media', { params });
  return data;
}

export async function getOne(id: string): Promise<MediaItem> {
  const { data } = await api.get<MediaItem>(`/api/v1/media/${id}`);
  return data;
}

export async function upload(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<MediaItem> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<MediaItem>('/api/v1/media/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) {
        onProgress(Math.round((evt.loaded * 100) / evt.total));
      }
    },
  });
  return data;
}

export async function remove(id: string): Promise<void> {
  await api.delete(`/api/v1/media/${id}`);
}

export async function addTags(id: string, tagNames: string[]): Promise<MediaItem> {
  const { data } = await api.post<MediaItem>(`/api/v1/media/${id}/tags`, { tagNames });
  return data;
}

export async function removeTag(mediaId: string, tagId: string): Promise<MediaItem> {
  const { data } = await api.delete<MediaItem>(`/api/v1/media/${mediaId}/tags/${tagId}`);
  return data;
}

export async function bulkAddTags(ids: string[], tagNames: string[]): Promise<void> {
  await Promise.all(ids.map((id) => addTags(id, tagNames)));
}

export async function bulkRemoveTag(ids: string[], tagId: string): Promise<void> {
  await Promise.all(ids.map((id) => removeTag(id, tagId)));
}

export async function bulkRemove(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => remove(id)));
}

export async function bulkDownload(tagSlugs: string[]): Promise<void> {
  const response = await api.post(
    '/api/v1/media/bulk-download',
    { tags: tagSlugs.length > 0 ? tagSlugs : undefined },
    { responseType: 'blob' },
  );
  const url = URL.createObjectURL(response.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'duskbird-export.zip';
  a.click();
  URL.revokeObjectURL(url);
}

export function mediaDownloadUrl(id: string): string {
  const token = getStableMediaToken();
  const base = import.meta.env.VITE_API_BASE_URL as string;
  return `${base}/api/v1/media/${id}/download?token=${encodeURIComponent(token)}`;
}

export function mediaThumbnailUrl(id: string): string {
  const token = getStableMediaToken();
  const base = import.meta.env.VITE_API_BASE_URL as string;
  return `${base}/api/v1/media/${id}/download?thumbnail=true&token=${encodeURIComponent(token)}`;
}
