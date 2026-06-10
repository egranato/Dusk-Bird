import { Role } from './role.enum';

export interface JwtPayload {
  sub: string;
  username: string;
  role: Role;
  tokenType: 'access' | 'refresh';
}
