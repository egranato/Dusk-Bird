export type Role = 'admin' | 'user';

export interface UserSummary {
  id: string;
  email: string;
  displayName: string;
  role: Role;
}

export interface AuthResponse {
  accessToken: string;
  user: UserSummary;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface TagSummary {
  id: string;
  name: string;
  slug: string;
}

export interface TagResponse {
  id: string;
  name: string;
  slug: string;
  usageCount: number;
  createdAt: string;
}

export interface MediaItem {
  id: string;
  uploaderId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  tags: TagSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedMedia {
  data: MediaItem[];
  total: number;
  page: number;
  limit: number;
}
