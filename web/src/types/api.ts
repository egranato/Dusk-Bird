export type Role = 'admin' | 'user';

export interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  role: Role;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserSummary;
}

export interface User {
  id: string;
  username: string;
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

export type MediaVisibility = 'private' | 'public';
export type MediaKind = 'media' | 'file';

export interface MediaItem {
  id: string;
  uploaderId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  visibility: MediaVisibility;
  kind: MediaKind;
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
