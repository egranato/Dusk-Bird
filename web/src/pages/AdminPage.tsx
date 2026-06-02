import { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import UserList from '../components/admin/UserList';
import TagList from '../components/admin/TagList';

type Tab = 'users' | 'tags';

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('users');

  return (
    <AppLayout>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Admin</h2>
        <div className="flex gap-1 bg-surface-1 p-1 rounded-lg w-fit">
          {(['users', 'tags'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? 'bg-surface-3 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'users' ? <UserList /> : <TagList />}
    </AppLayout>
  );
}
