import api from '../lib/axios';
import type { AuthResponse } from '../types/api';

export async function login(username: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/api/v1/auth/login', { username, password });
  return data;
}
