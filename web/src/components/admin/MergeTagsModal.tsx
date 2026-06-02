import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as tagsApi from '../../api/tags';
import type { TagResponse } from '../../types/api';

interface Props {
  tags: TagResponse[];
  onClose: () => void;
}

export default function MergeTagsModal({ tags, onClose }: Props) {
  const qc = useQueryClient();
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => tagsApi.merge(sourceId, targetId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags'] });
      qc.invalidateQueries({ queryKey: ['media'] });
      onClose();
    },
    onError: () => setError('Merge failed'),
  });

  function handleSubmit() {
    if (!sourceId || !targetId) { setError('Select both tags'); return; }
    if (sourceId === targetId) { setError('Source and target must be different'); return; }
    mutation.mutate();
  }

  const sourceName = tags.find((t) => t.id === sourceId)?.name;
  const targetName = tags.find((t) => t.id === targetId)?.name;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-1 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-1">Merge tags</h3>
        <p className="text-sm text-zinc-400 mb-4">
          All media tagged with the source will be re-tagged with the target. The source tag is then deleted.
        </p>

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-sm text-zinc-300 mb-1">Merge FROM (will be deleted)</label>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full bg-surface-2 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="">Select tag…</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.usageCount})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-zinc-300 mb-1">Merge INTO (kept)</label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full bg-surface-2 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="">Select tag…</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.usageCount})</option>
              ))}
            </select>
          </div>
        </div>

        {sourceName && targetName && (
          <p className="text-sm text-zinc-400 mb-3">
            "{sourceName}" → "{targetName}"
          </p>
        )}

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
            Cancel
          </button>
          <button
            disabled={mutation.isPending}
            onClick={handleSubmit}
            className="bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            {mutation.isPending ? 'Merging…' : 'Merge'}
          </button>
        </div>
      </div>
    </div>
  );
}
