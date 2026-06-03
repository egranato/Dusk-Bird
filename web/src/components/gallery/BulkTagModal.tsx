import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as mediaApi from '../../api/media';
import TagInput from '../shared/TagInput';
import type { MediaItem, TagResponse } from '../../types/api';

interface Props {
  selectedItems: MediaItem[];
  allTags: TagResponse[];
  onClose: () => void;
}

export default function BulkTagModal({ selectedItems, allTags, onClose }: Props) {
  const qc = useQueryClient();

  // Staged changes — nothing hits the API until Done is clicked.
  const [toAdd, setToAdd] = useState<string[]>([]);            // tag names
  const [toRemove, setToRemove] = useState<Set<string>>(new Set()); // tag IDs

  const tagCounts = new Map<string, { tag: TagResponse; count: number }>();
  for (const item of selectedItems) {
    for (const t of item.tags) {
      const full = allTags.find((at) => at.id === t.id);
      if (!full) continue;
      const entry = tagCounts.get(t.id);
      tagCounts.set(t.id, { tag: full, count: (entry?.count ?? 0) + 1 });
    }
  }
  const presentTags = [...tagCounts.values()].sort((a, b) => a.tag.name.localeCompare(b.tag.name));
  const selectedIds = selectedItems.map((i) => i.id);

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (toAdd.length > 0) await mediaApi.bulkAddTags(selectedIds, toAdd);
      for (const tagId of toRemove) {
        await mediaApi.bulkRemoveTag(selectedIds, tagId);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['media'] });
      qc.invalidateQueries({ queryKey: ['tags'] });
      onClose();
    },
  });

  const hasChanges = toAdd.length > 0 || toRemove.size > 0;

  function stageAdd(name: string) {
    if (!toAdd.includes(name)) setToAdd((prev) => [...prev, name]);
  }

  function unstageAdd(name: string) {
    setToAdd((prev) => prev.filter((n) => n !== name));
  }

  function toggleRemove(tagId: string) {
    setToRemove((prev) => {
      const next = new Set(prev);
      next.has(tagId) ? next.delete(tagId) : next.add(tagId);
      return next;
    });
  }

  // Tags already staged to add shouldn't appear in the remove list or input.
  const stagedAddIds = new Set(
    toAdd.map((name) => allTags.find((t) => t.name === name)?.id ?? ''),
  );

  // Quick-add: top tags by usage that aren't on every selected item and aren't staged already.
  const fullyPresentIds = new Set(
    presentTags.filter(({ count }) => count === selectedItems.length).map(({ tag }) => tag.id),
  );
  const quickAdd = allTags
    .filter((t) => !fullyPresentIds.has(t.id) && !stagedAddIds.has(t.id) && !toAdd.includes(t.name))
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 6);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-1 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Edit tags</h3>
          <span className="text-xs text-zinc-500">{selectedItems.length} items</span>
        </div>

        {/* Add section */}
        <div className="mb-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Add to all selected</p>

          {toAdd.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {toAdd.map((name) => (
                <span key={name} className="flex items-center gap-1 bg-brand/20 text-brand rounded-full text-xs px-2.5 py-1">
                  {name}
                  <button onClick={() => unstageAdd(name)} className="hover:text-white transition-colors">×</button>
                </span>
              ))}
            </div>
          )}

          {quickAdd.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {quickAdd.map((t) => (
                <button
                  key={t.id}
                  onClick={() => stageAdd(t.name)}
                  className="text-xs px-2.5 py-1 rounded-full border border-dashed border-zinc-600 text-zinc-400 hover:border-brand hover:text-brand transition-colors"
                >
                  + {t.name}
                </button>
              ))}
            </div>
          )}

          <TagInput
            allTags={allTags}
            appliedIds={stagedAddIds}
            onAdd={stageAdd}
            placeholder="Tag name…"
          />
        </div>

        {/* Remove section */}
        {presentTags.length > 0 && (
          <div className="mb-5">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
              Remove from selected — click to mark
            </p>
            <div className="flex flex-wrap gap-1.5">
              {presentTags.map(({ tag, count }) => {
                const marked = toRemove.has(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleRemove(tag.id)}
                    className={`flex items-center gap-1 rounded-full text-xs px-2.5 py-1 border transition-colors ${
                      marked
                        ? 'bg-red-500/20 border-red-500/50 text-red-400 line-through'
                        : 'bg-surface-2 border-transparent text-zinc-300 hover:border-red-500/40 hover:text-red-400'
                    }`}
                  >
                    {tag.name}
                    {count < selectedItems.length && (
                      <span className="opacity-60 no-underline">({count})</span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-zinc-600 mt-2">Numbers in brackets = not on all selected items</p>
          </div>
        )}

        <div className="flex justify-between items-center mt-2">
          <button
            onClick={onClose}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => hasChanges ? applyMutation.mutate() : onClose()}
            disabled={applyMutation.isPending}
            className="bg-brand hover:bg-brand-hover disabled:opacity-50 rounded-xl px-5 py-2 text-sm font-medium transition-colors"
          >
            {applyMutation.isPending ? 'Applying…' : hasChanges ? 'Apply & Done' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}
