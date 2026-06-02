import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import * as mediaApi from '../../api/media';
import type { TagResponse } from '../../types/api';

interface Props {
  tags: TagResponse[];
  onClose: () => void;
}

interface UploadResult {
  uploaded: number;
  duplicates: number;
}

const ACCEPTED = ['image/', 'video/'];

function filterMediaFiles(fileList: FileList | File[]): File[] {
  return Array.from(fileList).filter((f) => ACCEPTED.some((p) => f.type.startsWith(p)));
}

export default function UploadModal({ tags, onClose }: Props) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [suggestions, setSuggestions] = useState<TagResponse[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = filterMediaFiles(e.dataTransfer.files);
    if (dropped.length > 0) setFiles(dropped);
  }

  const mutation = useMutation<UploadResult>({
    mutationFn: async () => {
      const tagNames = [
        ...selectedTags,
        ...tagInput.split(',').map((s) => s.trim()).filter(Boolean),
      ];
      let uploaded = 0;
      let duplicates = 0;

      for (let i = 0; i < files.length; i++) {
        setCurrentFileIndex(i + 1);
        setProgress(0);
        try {
          const media = await mediaApi.upload(files[i], setProgress);
          if (tagNames.length > 0) await mediaApi.addTags(media.id, tagNames);
          uploaded++;
        } catch (err) {
          if (axios.isAxiosError(err) && err.response?.status === 409) {
            duplicates++;
          } else {
            throw err;
          }
        }
      }
      return { uploaded, duplicates };
    },
    onSuccess: ({ uploaded, duplicates }) => {
      qc.invalidateQueries({ queryKey: ['media'] });
      qc.invalidateQueries({ queryKey: ['tags'] });
      setCurrentFileIndex(0);
      setProgress(0);
      if (duplicates > 0 && uploaded === 0) {
        setError(`${duplicates} file${duplicates > 1 ? 's' : ''} already uploaded — nothing new added.`);
      } else if (duplicates > 0) {
        setError(`${duplicates} duplicate${duplicates > 1 ? 's' : ''} skipped, ${uploaded} uploaded.`);
      } else {
        onClose();
      }
    },
    onError: () => {
      setCurrentFileIndex(0);
      setProgress(0);
      setError('Upload failed — check file type (images and videos only)');
    },
  });

  function handleTagInput(value: string) {
    setTagInput(value);
    const last = value.split(',').pop()?.trim() ?? '';
    if (last.length > 0) {
      setSuggestions(tags.filter((t) => t.name.toLowerCase().includes(last.toLowerCase())).slice(0, 5));
    } else {
      setSuggestions([]);
    }
  }

  function pickSuggestion(name: string) {
    setSelectedTags((prev) => (prev.includes(name) ? prev : [...prev, name]));
    const parts = tagInput.split(',');
    parts.pop();
    setTagInput(parts.join(', '));
    setSuggestions([]);
  }

  function removeSelectedTag(name: string) {
    setSelectedTags((prev) => prev.filter((t) => t !== name));
  }

  const isUploading = mutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-1 rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">Upload media</h3>

        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4 ${
            dragging
              ? 'border-brand bg-brand/10'
              : 'border-zinc-700 hover:border-zinc-500'
          }`}
          onClick={() => !isUploading && fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => setFiles(filterMediaFiles(e.target.files ?? new FileList()))}
          />
          {files.length > 0 ? (
            <p className="text-sm text-zinc-300">
              {files.length} file{files.length > 1 ? 's' : ''} selected
            </p>
          ) : dragging ? (
            <p className="text-sm text-brand font-medium">Drop to add</p>
          ) : (
            <p className="text-sm text-zinc-500">
              Drag & drop or <span className="text-zinc-300">click to browse</span>
            </p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm text-zinc-300 mb-1">Tags (optional)</label>
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {selectedTags.map((name) => (
                <span key={name} className="flex items-center gap-1 bg-brand/20 text-brand rounded-full text-xs px-2 py-0.5">
                  {name}
                  <button onClick={() => removeSelectedTag(name)} className="hover:text-white">×</button>
                </span>
              ))}
            </div>
          )}
          <div className="relative">
            <input
              value={tagInput}
              onChange={(e) => handleTagInput(e.target.value)}
              placeholder="e.g. Beach, Summer 2024"
              className="w-full bg-surface-2 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
            />
            {suggestions.length > 0 && (
              <ul className="absolute top-full left-0 right-0 mt-1 bg-surface-2 border border-zinc-700 rounded-lg overflow-hidden z-10">
                {suggestions.map((s) => (
                  <li key={s.id}>
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-surface-3 transition-colors"
                      onClick={() => pickSuggestion(s.name)}
                    >
                      {s.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        {/* Progress bar */}
        {isUploading && (
          <div className="mb-4">
            <p className="text-xs text-zinc-400 mb-1.5">
              File {currentFileIndex} of {files.length} — {progress}%
            </p>
            <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 disabled:opacity-40 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={files.length === 0 || isUploading}
            onClick={() => mutation.mutate()}
            className="bg-brand hover:bg-brand-hover disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            {isUploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
