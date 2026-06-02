import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as mediaApi from '../../api/media';
import { useAuth } from '../../contexts/AuthContext';
import type { MediaItem, TagResponse } from '../../types/api';

interface Props {
  item: MediaItem;
  allTags: TagResponse[];
  onClose: () => void;
  onDeleted: () => void;
}

export default function MediaDetailModal({ item, allTags, onClose, onDeleted }: Props) {
  const { currentUser, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [tagInput, setTagInput] = useState('');
  const [suggestions, setSuggestions] = useState<TagResponse[]>([]);
  const [currentItem, setCurrentItem] = useState({ ...item, tags: item.tags ?? [] });

  const isVideo = currentItem.mimeType.startsWith('video/');
  const src = mediaDownloadUrl(currentItem.id);

  const addTagMutation = useMutation({
    mutationFn: (names: string[]) => mediaApi.addTags(currentItem.id, names),
    onSuccess: (updated) => {
      setCurrentItem({ ...updated, tags: updated.tags ?? [] });
      qc.invalidateQueries({ queryKey: ['media'] });
      qc.invalidateQueries({ queryKey: ['tags'] });
      setTagInput('');
      setSuggestions([]);
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: (tagId: string) => mediaApi.removeTag(currentItem.id, tagId),
    onSuccess: (updated) => {
      setCurrentItem({ ...updated, tags: updated.tags ?? [] });
      qc.invalidateQueries({ queryKey: ['media'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => mediaApi.remove(currentItem.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['media'] });
      onDeleted();
    },
  });

  function handleTagInput(value: string) {
    setTagInput(value);
    if (value.trim().length > 0) {
      setSuggestions(
        allTags
          .filter((t) => t.name.toLowerCase().includes(value.toLowerCase()))
          .filter((t) => !currentItem.tags.some((ct) => ct.id === t.id))
          .slice(0, 5),
      );
    } else {
      setSuggestions([]);
    }
  }

  function submitTag() {
    const names = tagInput.split(',').map((s) => s.trim()).filter(Boolean);
    if (names.length > 0) addTagMutation.mutate(names);
  }

  const canDelete = isAdmin || currentItem.uploaderId === currentUser?.id;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-1 rounded-2xl overflow-hidden w-full max-w-4xl flex flex-col md:flex-row max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Media preview */}
        <div className="flex-1 bg-black flex items-center justify-center min-h-64">
          {isVideo ? (
            <video src={src} controls className="max-w-full max-h-full" />
          ) : (
            <img src={src} alt={currentItem.fileName} className="max-w-full max-h-[70vh] object-contain" />
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-72 p-5 flex flex-col gap-4 overflow-y-auto">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs text-zinc-500">
              {(currentItem.sizeBytes / 1024 / 1024).toFixed(1)} MB
            </p>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 text-xl leading-none flex-shrink-0">
              ×
            </button>
          </div>

          {/* Tags */}
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Tags</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {[...currentItem.tags].sort((a, b) => a.name.localeCompare(b.name)).map((tag) => (
                <span key={tag.id} className="flex items-center gap-1 bg-surface-2 rounded-full text-xs px-2.5 py-1">
                  {tag.name}
                  <button
                    onClick={() => removeTagMutation.mutate(tag.id)}
                    className="text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {/* Quick-add: top tags by usage that aren't already applied */}
            {(() => {
              const applied = new Set(currentItem.tags.map((t) => t.id));
              const quick = allTags
                .filter((t) => !applied.has(t.id))
                .sort((a, b) => b.usageCount - a.usageCount)
                .slice(0, 5);
              return quick.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {quick.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => addTagMutation.mutate([t.name])}
                      disabled={addTagMutation.isPending}
                      className="text-xs px-2.5 py-1 rounded-full border border-dashed border-zinc-600 text-zinc-400 hover:border-brand hover:text-brand disabled:opacity-40 transition-colors"
                    >
                      + {t.name}
                    </button>
                  ))}
                </div>
              ) : null;
            })()}

            <div className="relative">
              <div className="flex gap-1.5">
                <input
                  value={tagInput}
                  onChange={(e) => handleTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); submitTag(); }
                  }}
                  placeholder="Add tags…"
                  className="flex-1 bg-surface-2 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-brand"
                />
                <button
                  onClick={submitTag}
                  disabled={!tagInput.trim() || addTagMutation.isPending}
                  className="bg-brand hover:bg-brand-hover disabled:opacity-40 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors flex-shrink-0"
                >
                  Add
                </button>
              </div>
              {suggestions.length > 0 && (
                <ul className="absolute top-full left-0 right-0 mt-1 bg-surface-2 border border-zinc-700 rounded-lg overflow-hidden z-10">
                  {suggestions.map((s) => (
                    <li key={s.id}>
                      <button
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-3 transition-colors"
                        onClick={() => { addTagMutation.mutate([s.name]); setTagInput(''); setSuggestions([]); }}
                      >
                        {s.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-auto flex flex-col gap-2">
            <a
              href={src}
              download={currentItem.fileName}
              className="block text-center bg-surface-2 hover:bg-surface-3 rounded-lg py-2 text-sm transition-colors"
            >
              Download
            </a>
            {canDelete && (
              <button
                onClick={() => { if (confirm('Delete this file?')) deleteMutation.mutate(); }}
                disabled={deleteMutation.isPending}
                className="text-red-400 hover:text-red-300 text-sm py-2 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Local import to avoid circular dependency
function mediaDownloadUrl(id: string): string {
  const token = localStorage.getItem('token') ?? '';
  const base = import.meta.env.VITE_API_BASE_URL as string;
  return `${base}/api/v1/media/${id}/download?token=${encodeURIComponent(token)}`;
}
