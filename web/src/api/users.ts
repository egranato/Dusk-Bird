import api from '../lib/axios';
import type { User } from '../types/api';

export async function list(): Promise<User[]> {
  const { data } = await api.get<User[]>('/api/v1/users');
  return data;
}

export async function create(payload: {
  username: string;
  displayName: string;
  password: string;
  role?: 'admin' | 'user';
}): Promise<User> {
  const { data } = await api.post<User>('/api/v1/users', payload);
  return data;
}

export async function update(
  id: string,
  payload: { displayName?: string; isActive?: boolean; password?: string },
): Promise<User> {
  const { data } = await api.patch<User>(`/api/v1/users/${id}`, payload);
  return data;
}

export async function remove(id: string): Promise<void> {
  await api.delete(`/api/v1/users/${id}`);
}
