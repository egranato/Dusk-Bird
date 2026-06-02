import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { currentUser, isAdmin, logout } = useAuth();
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-surface-1 border-b border-zinc-800 px-6 py-3 flex items-center gap-4 sticky top-0 z-10">
        <Link to="/" className="text-lg font-bold tracking-tight">
          DuskBird
        </Link>

        <nav className="flex gap-4 ml-2">
          <Link
            to="/"
            className={`text-sm transition-colors ${
              pathname === '/' ? 'text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Gallery
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className={`text-sm transition-colors ${
                pathname === '/admin' ? 'text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-zinc-400">{currentUser?.displayName}</span>
          <button
            onClick={logout}
            className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 py-6 max-w-screen-2xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
