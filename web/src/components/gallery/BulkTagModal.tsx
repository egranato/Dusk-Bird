import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as mediaApi from '../../api/media';
import type { MediaItem, TagResponse } from '../../types/api';

interface Props {
  selectedItems: MediaItem[];
  allTags: TagResponse[];
  onClose: () => void;
}

export default function BulkTagModal({ selectedItems, allTags, onClose }: Props) {
  const qc = useQueryClient();
  const [tagInput, setTagInput] = useState('');
  const [suggestions, setSuggestions] = useState<TagResponse[]>([]);

  // Tags present on at least one selected item, with a count of how many items have them.
  const tagCounts = new Map<string, { tag: TagResponse; count: number }>();
  for (const item of selectedItems) {
    for (const t of item.tags) {
      const entry = tagCounts.get(t.id);
      const full = allTags.find((at) => at.id === t.id);
      if (!full) continue;
      tagCounts.set(t.id, { tag: full, count: (entry?.count ?? 0) + 1 });
    }
  }
  const presentTags = [...tagCounts.values()].sort((a, b) => a.tag.name.localeCompare(b.tag.name));

  const selectedIds = selectedItems.map((i) => i.id);

  const addMutation = useMutation({
    mutationFn: (names: string[]) => mediaApi.bulkAddTags(selectedIds, names),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['media'] });
      qc.invalidateQueries({ queryKey: ['tags'] });
      setTagInput('');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (tagId: string) => mediaApi.bulkRemoveTag(selectedIds, tagId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['media'] });
      qc.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  function handleInput(value: string) {
    setTagInput(value);
    const last = value.split(',').pop()?.trim() ?? '';
    setSuggestions(
      last.length > 0
        ? allTags.filter((t) => t.name.toLowerCase().includes(last.toLowerCase())).slice(0, 5)
        : [],
    );
  }

  function submitAdd() {
    const names = tagInput.split(',').map((s) => s.trim()).filter(Boolean);
    if (names.length > 0) addMutation.mutate(names);
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-1 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Edit tags</h3>
          <span className="text-xs text-zinc-500">{selectedItems.length} items</span>
        </div>

        {/* Add tags */}
        <div className="mb-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Add to all selected</p>
          <div className="relative flex gap-1.5">
            <input
              value={tagInput}
              onChange={(e) => handleInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitAdd(); } }}
              placeholder="Tag name…"
              className="flex-1 bg-surface-2 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand"
            />
            <button
              onClick={submitAdd}
              disabled={!tagInput.trim() || addMutation.isPending}
              className="bg-brand hover:bg-brand-hover disabled:opacity-40 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            >
              {addMutation.isPending ? '…' : 'Add'}
            </button>
            {suggestions.length > 0 && (
              <ul className="absolute top-full left-0 right-12 mt-1 bg-surface-2 border border-zinc-700 rounded-lg overflow-hidden z-10">
                {suggestions.map((s) => (
                  <li key={s.id}>
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-surface-3 transition-colors"
                      onClick={() => { addMutation.mutate([s.name]); setTagInput(''); setSuggestions([]); }}
                    >
                      {s.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Remove tags */}
        {presentTags.length > 0 && (
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Remove from selected</p>
            <div className="flex flex-wrap gap-1.5">
              {presentTags.map(({ tag, count }) => (
                <button
                  key={tag.id}
                  onClick={() => removeMutation.mutate(tag.id)}
                  disabled={removeMutation.isPending}
                  className="flex items-center gap-1 bg-surface-2 hover:bg-red-500/20 hover:border-red-500/50 border border-transparent rounded-full text-xs px-2.5 py-1 transition-colors disabled:opacity-50"
                >
                  {tag.name}
                  {count < selectedItems.length && (
                    <span className="text-zinc-500">({count})</span>
                  )}
                  <span className="text-zinc-500 hover:text-red-400">×</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-600 mt-2">Numbers in brackets = not on all selected items</p>
          </div>
        )}

        <div className="flex justify-end mt-5">
          <button onClick={onClose} className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
