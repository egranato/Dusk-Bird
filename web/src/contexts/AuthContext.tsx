import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import * as authApi from '../api/auth';
import type { UserSummary } from '../types/api';

interface AuthContextValue {
  currentUser: UserSummary | null;
  token: string | null;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadFromStorage(): { user: UserSummary | null; token: string | null } {
  try {
    const token = localStorage.getItem('token');
    const raw = localStorage.getItem('user');
    const user = raw ? (JSON.parse(raw) as UserSummary) : null;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initial = loadFromStorage();
  const [token, setToken] = useState<string | null>(initial.token);
  const [currentUser, setCurrentUser] = useState<UserSummary | null>(initial.user);

  const login = useCallback(async (username: string, password: string) => {
    const res = await authApi.login(username, password);
    localStorage.setItem('token', res.accessToken);
    localStorage.setItem('refreshToken', res.refreshToken);
    localStorage.setItem('user', JSON.stringify(res.user));
    setToken(res.accessToken);
    setCurrentUser(res.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setToken(null);
    setCurrentUser(null);
  }, []);

  useEffect(() => {
    const syncFromStorage = () => {
      const next = loadFromStorage();
      setToken(next.token);
      setCurrentUser(next.user);
    };

    window.addEventListener('auth:updated', syncFromStorage);
    window.addEventListener('auth:cleared', syncFromStorage);

    return () => {
      window.removeEventListener('auth:updated', syncFromStorage);
      window.removeEventListener('auth:cleared', syncFromStorage);
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        isAdmin: currentUser?.role === 'admin',
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
