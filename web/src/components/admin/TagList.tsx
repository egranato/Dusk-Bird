import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as tagsApi from '../../api/tags';
import MergeTagsModal from './MergeTagsModal';
import type { TagResponse } from '../../types/api';

export default function TagList() {
  const qc = useQueryClient();
  const [mergeOpen, setMergeOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => tagsApi.update(id, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags'] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tagsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  });

  function startEdit(tag: TagResponse) {
    setEditingId(tag.id);
    setEditName(tag.name);
  }

  if (isLoading) return <p className="text-zinc-500 text-sm">Loading…</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-zinc-400">{tags.length} tag{tags.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setMergeOpen(true)}
          className="border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-100 rounded-lg px-4 py-1.5 text-sm transition-colors"
        >
          Merge tags
        </button>
      </div>

      <div className="bg-surface-1 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-zinc-500 text-xs uppercase tracking-wider">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Usage</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {tags.map((tag) => (
              <tr key={tag.id} className="border-b border-zinc-800/50 last:border-0">
                <td className="px-4 py-3">
                  {editingId === tag.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        renameMutation.mutate({ id: tag.id, name: editName });
                      }}
                      className="flex gap-2"
                    >
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                        className="bg-surface-2 rounded px-2 py-0.5 text-sm outline-none focus:ring-1 focus:ring-brand w-36"
                      />
                      <button type="submit" className="text-xs text-brand">Save</button>
                      <button type="button" onClick={() => setEditingId(null)} className="text-xs text-zinc-500">Cancel</button>
                    </form>
                  ) : (
                    tag.name
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-500 font-mono text-xs">{tag.slug}</td>
                <td className="px-4 py-3 text-zinc-400">{tag.usageCount}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => startEdit(tag)}
                      className="text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete tag "${tag.name}"?`)) deleteMutation.mutate(tag.id); }}
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

      {mergeOpen && <MergeTagsModal tags={tags} onClose={() => setMergeOpen(false)} />}
    </div>
  );
}
