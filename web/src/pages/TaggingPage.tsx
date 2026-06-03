import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as mediaApi from '../api/media';
import * as tagsApi from '../api/tags';
import AppLayout from '../components/layout/AppLayout';
import TagInput from '../components/shared/TagInput';
import { useAuth } from '../contexts/AuthContext';
import type { TagSummary } from '../types/api';

const BATCH_SIZE = 50;

function TagChip({
  tag,
  onRemove,
  disabled,
}: {
  tag: TagSummary;
  onRemove: () => void;
  disabled: boolean;
}) {
  return (
    <span className="flex items-center gap-1 bg-surface-2 rounded-full text-sm px-3 py-1">
      {tag.name}
      <button
        onClick={onRemove}
        disabled={disabled}
        className="text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-40"
      >
        ×
      </button>
    </span>
  );
}

export default function TaggingPage() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [currentTags, setCurrentTags] = useState<TagSummary[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const tagsQuery = useQuery({ queryKey: ['tags'], queryFn: tagsApi.list });

  const queueQuery = useQuery({
    queryKey: ['tagging-queue'],
    queryFn: () => mediaApi.browse({ maxTags: 2, sort: 'oldest', limit: BATCH_SIZE }),
  });

  const items = queueQuery.data?.data ?? [];
  const total = queueQuery.data?.total ?? 0;

  // Derive the active item from the URL param, falling back to the first item.
  const activeId = searchParams.get('id');
  const index = activeId ? Math.max(items.findIndex((i) => i.id === activeId), 0) : 0;
  const item = items[index] ?? null;

  // Set the URL param to the first item once the queue loads (if not already set).
  useEffect(() => {
    if (items.length > 0 && !activeId) {
      setSearchParams({ id: items[0].id }, { replace: true });
    }
  }, [items, activeId]);

  // Sync currentTags when the active item changes.
  useEffect(() => {
    if (item) setCurrentTags(item.tags ?? []);
  }, [item?.id]);

  const addMutation = useMutation({
    mutationFn: (name: string) => mediaApi.addTags(item!.id, [name]),
    onSuccess: (updated) => {
      setCurrentTags(updated.tags ?? []);
      qc.invalidateQueries({ queryKey: ['tagging-queue-count'] });
      inputRef.current?.focus();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (tagId: string) => mediaApi.removeTag(item!.id, tagId),
    onSuccess: (updated) => {
      setCurrentTags(updated.tags ?? []);
      qc.invalidateQueries({ queryKey: ['tagging-queue-count'] });
    },
  });

  function advance() {
    const nextIndex = index + 1;
    if (nextIndex >= items.length) {
      // Re-fetch; tagged items will have dropped out of the queue.
      qc.invalidateQueries({ queryKey: ['tagging-queue'] });
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ id: items[nextIndex].id }, { replace: true });
    }
  }

  const isVideo = item?.mimeType.startsWith('video/');
  const mutating = addMutation.isPending || removeMutation.isPending;
  const appliedIds = new Set(currentTags.map((t) => t.id));

  const quickAdd = (tagsQuery.data ?? [])
    .filter((t) => !appliedIds.has(t.id))
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 6);

  if (queueQuery.isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24 text-zinc-500">Loading queue…</div>
      </AppLayout>
    );
  }

  if (total === 0 || !item) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <p className="text-2xl">All caught up</p>
          <p className="text-zinc-500 text-sm">Every post has at least 3 tags.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Tag Queue</h2>
          <p className="text-sm text-zinc-500">{total} item{total !== 1 ? 's' : ''} need tags</p>
        </div>
        <span className="text-sm text-zinc-500">
          {index + 1} of {items.length} loaded
        </span>
      </div>

      <div className="max-w-2xl mx-auto space-y-4">
        {/* Media */}
        <div className="bg-black rounded-2xl overflow-hidden flex items-center justify-center">
          {isVideo ? (
            <video
              key={item.id}
              src={mediaApi.mediaDownloadUrl(item.id)}
              controls
              className="w-full max-h-[60vh] object-contain"
            />
          ) : (
            <img
              key={item.id}
              src={mediaApi.mediaThumbnailUrl(item.id)}
              alt=""
              className="w-full max-h-[60vh] object-contain"
            />
          )}
        </div>

        {/* Current tags */}
        <div className="flex flex-wrap gap-2 min-h-[2rem] items-center">
          {currentTags.length === 0 && (
            <span className="text-sm text-zinc-600">No tags yet</span>
          )}
          {[...currentTags]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((tag) => (
              <TagChip
                key={tag.id}
                tag={tag}
                onRemove={() => removeMutation.mutate(tag.id)}
                disabled={mutating}
              />
            ))}
        </div>

        {/* Quick-add suggestions */}
        {quickAdd.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {quickAdd.map((t) => (
              <button
                key={t.id}
                onClick={() => addMutation.mutate(t.name)}
                disabled={mutating}
                className="text-sm px-3 py-1 rounded-full border border-dashed border-zinc-600 text-zinc-400 hover:border-brand hover:text-brand disabled:opacity-40 transition-colors"
              >
                + {t.name}
              </button>
            ))}
          </div>
        )}

        {/* Tag input */}
        <TagInput
          allTags={tagsQuery.data ?? []}
          appliedIds={appliedIds}
          onAdd={(name) => addMutation.mutate(name)}
          isAdmin={isAdmin}
          inputRef={inputRef}
          placeholder="Add tags…"
        />

        {/* Navigation */}
        <div className="flex justify-between pt-2">
          <button
            onClick={advance}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Skip →
          </button>
          <button
            onClick={advance}
            disabled={currentTags.length === 0}
            className="bg-surface-2 hover:bg-surface-3 disabled:opacity-40 rounded-xl px-6 py-2.5 text-sm font-medium transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
