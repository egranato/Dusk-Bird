import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as tagsApi from '../../api/tags';
import MergeTagsModal from './MergeTagsModal';
import type { TagResponse } from '../../types/api';

export default function TagList() {
  const qc = useQueryClient();
  const [mergeOpen, setMergeOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editWebhook, setEditWebhook] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagWebhook, setNewTagWebhook] = useState('');
  const newTagRef = useRef<HTMLInputElement>(null);

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['tag-requests'],
    queryFn: tagsApi.listRequests,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => tagsApi.approveRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tag-requests'] });
      qc.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  const denyMutation = useMutation({
    mutationFn: (id: string) => tagsApi.denyRequest(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tag-requests'] }),
  });

  const createMutation = useMutation({
    mutationFn: ({ name, webhookUrl }: { name: string; webhookUrl: string }) =>
      tagsApi.create(name, webhookUrl),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags'] });
      setNewTagName('');
      setNewTagWebhook('');
      newTagRef.current?.focus();
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name, webhookUrl }: { id: string; name: string; webhookUrl: string }) =>
      tagsApi.update(id, name, webhookUrl),
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
    setEditWebhook(tag.webhookUrl ?? '');
  }

  if (isLoading) return <p className="text-zinc-500 text-sm">Loading…</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4 gap-3">
        <form
          className="flex gap-2 flex-1 max-w-lg"
          onSubmit={(e) => {
            e.preventDefault();
            if (newTagName.trim()) {
              createMutation.mutate({ name: newTagName.trim(), webhookUrl: newTagWebhook.trim() });
            }
          }}
        >
          <input
            ref={newTagRef}
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="New tag name…"
            className="flex-1 bg-surface-2 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand"
          />
          <input
            value={newTagWebhook}
            onChange={(e) => setNewTagWebhook(e.target.value)}
            placeholder="Discord webhook URL (optional)"
            className="flex-1 bg-surface-2 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand"
          />
          <button
            type="submit"
            disabled={!newTagName.trim() || createMutation.isPending}
            className="bg-brand hover:bg-brand-hover disabled:opacity-40 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          >
            Add
          </button>
        </form>

        <div className="flex items-center gap-2">
          <p className="text-sm text-zinc-500">{tags.length} tag{tags.length !== 1 ? 's' : ''}</p>
          <button
            onClick={() => setMergeOpen(true)}
            className="border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-100 rounded-lg px-4 py-1.5 text-sm transition-colors"
          >
            Merge tags
          </button>
        </div>
      </div>

      {/* Pending tag requests */}
      {requests.length > 0 && (
        <div className="bg-surface-1 rounded-xl overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">
              Pending requests ({requests.length})
            </p>
          </div>
          {requests.map((req) => (
            <div key={req.id} className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50 last:border-0">
              <div>
                <span className="text-sm font-medium">{req.name}</span>
                {req.requestedBy && (
                  <span className="text-xs text-zinc-500 ml-2">
                    requested by {req.requestedBy.displayName}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => approveMutation.mutate(req.id)}
                  disabled={approveMutation.isPending || denyMutation.isPending}
                  className="text-xs bg-brand/20 text-brand hover:bg-brand/30 rounded-lg px-3 py-1 transition-colors disabled:opacity-40"
                >
                  Approve
                </button>
                <button
                  onClick={() => denyMutation.mutate(req.id)}
                  disabled={approveMutation.isPending || denyMutation.isPending}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-40"
                >
                  Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-surface-1 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-zinc-500 text-xs uppercase tracking-wider">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Usage</th>
              <th className="px-4 py-3">Discord webhook</th>
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
                        renameMutation.mutate({ id: tag.id, name: editName, webhookUrl: editWebhook.trim() });
                      }}
                      className="flex flex-col gap-1"
                    >
                      <div className="flex gap-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          autoFocus
                          className="bg-surface-2 rounded px-2 py-0.5 text-sm outline-none focus:ring-1 focus:ring-brand w-36"
                        />
                        <button type="submit" className="text-xs text-brand">Save</button>
                        <button type="button" onClick={() => setEditingId(null)} className="text-xs text-zinc-500">Cancel</button>
                      </div>
                      <input
                        value={editWebhook}
                        onChange={(e) => setEditWebhook(e.target.value)}
                        placeholder="Discord webhook URL (optional)"
                        className="bg-surface-2 rounded px-2 py-0.5 text-xs outline-none focus:ring-1 focus:ring-brand w-full"
                      />
                    </form>
                  ) : (
                    tag.name
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-500 font-mono text-xs">{tag.slug}</td>
                <td className="px-4 py-3 text-zinc-400">{tag.usageCount}</td>
                <td className="px-4 py-3">
                  {tag.webhookUrl ? (
                    <span className="text-xs text-green-400" title={tag.webhookUrl}>Connected</span>
                  ) : (
                    <span className="text-xs text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => startEdit(tag)}
                      className="text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
                    >
                      Edit
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
