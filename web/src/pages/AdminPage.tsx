import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '../components/layout/AppLayout';
import UserList from '../components/admin/UserList';
import TagList from '../components/admin/TagList';
import * as tagsApi from '../api/tags';

type Tab = 'users' | 'tags';

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('users');

  const requestsQuery = useQuery({
    queryKey: ['tag-requests'],
    queryFn: tagsApi.listRequests,
    staleTime: 30_000,
  });
  const pendingCount = requestsQuery.data?.length ?? 0;

  return (
    <AppLayout>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Admin</h2>
        <div className="flex gap-1 bg-surface-1 p-1 rounded-lg w-fit">
          {(['users', 'tags'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? 'bg-surface-3 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t}
              {t === 'tags' && pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-brand text-white text-xs font-bold rounded-full min-w-[1rem] h-4 flex items-center justify-center px-1 leading-none">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === 'users' ? <UserList /> : <TagList />}
    </AppLayout>
  );
}
