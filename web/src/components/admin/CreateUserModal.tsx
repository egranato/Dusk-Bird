import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as usersApi from '../../api/users';

const schema = z.object({
  username: z.string().min(1).max(100),
  displayName: z.string().min(1).max(100),
  password: z.string().min(8, 'Minimum 8 characters'),
  role: z.enum(['admin', 'user']),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onClose: () => void;
}

export default function CreateUserModal({ onClose }: Props) {
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'user' },
  });

  const mutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: () => setError('root', { message: 'Failed to create user — username may already be taken' }),
  });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-1 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">Create user</h3>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-3">
          {[
            { name: 'username' as const, label: 'Username', type: 'text' },
            { name: 'displayName' as const, label: 'Display name', type: 'text' },
            { name: 'password' as const, label: 'Password', type: 'password' },
          ].map(({ name, label, type }) => (
            <div key={name}>
              <label className="block text-sm text-zinc-300 mb-1">{label}</label>
              <input
                {...register(name)}
                type={type}
                className="w-full bg-surface-2 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
              />
              {errors[name] && (
                <p className="text-red-400 text-xs mt-1">{errors[name]?.message}</p>
              )}
            </div>
          ))}

          <div>
            <label className="block text-sm text-zinc-300 mb-1">Role</label>
            <select
              {...register('role')}
              className="w-full bg-surface-2 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {errors.root && <p className="text-red-400 text-sm">{errors.root.message}</p>}

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || mutation.isPending}
              className="bg-brand hover:bg-brand-hover disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
