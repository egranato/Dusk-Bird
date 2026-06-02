import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as usersApi from '../../api/users';
import CreateUserModal from './CreateUserModal';
import type { User } from '../../types/api';

export default function UserList() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
  });

  const toggleActive = useMutation({
    mutationFn: (user: User) => usersApi.update(user.id, { isActive: !user.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  if (isLoading) return <p className="text-zinc-500 text-sm">Loading…</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-zinc-400">{users.length} user{users.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setCreateOpen(true)}
          className="bg-brand hover:bg-brand-hover rounded-lg px-4 py-1.5 text-sm font-medium transition-colors"
        >
          Create user
        </button>
      </div>

      <div className="bg-surface-1 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-zinc-500 text-xs uppercase tracking-wider">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-zinc-800/50 last:border-0">
                <td className="px-4 py-3">{user.displayName}</td>
                <td className="px-4 py-3 text-zinc-400">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    user.role === 'admin' ? 'bg-brand/20 text-brand' : 'bg-surface-2 text-zinc-400'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs ${user.isActive ? 'text-green-400' : 'text-zinc-500'}`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => toggleActive.mutate(user)}
                      className="text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
                    >
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete ${user.displayName}?`)) deleteUser.mutate(user.id); }}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {createOpen && <CreateUserModal onClose={() => setCreateOpen(false)} />}
    </div>
  );
}
