import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import * as mediaApi from '../../api/media';

interface Props {
  onClose: () => void;
}

interface UploadResult {
  uploaded: number;
  duplicates: number;
}

export default function FilesUploadModal({ onClose }: Props) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [visibleToEveryone, setVisibleToEveryone] = useState(false);
  const [error, setError] = useState('');
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) setFiles(Array.from(e.dataTransfer.files));
  }

  const mutation = useMutation<UploadResult>({
    mutationFn: async () => {
      let uploaded = 0;
      let duplicates = 0;

      for (let i = 0; i < files.length; i++) {
        setCurrentFileIndex(i + 1);
        setProgress(0);
        try {
          await mediaApi.upload(files[i], setProgress, visibleToEveryone ? 'public' : 'private');
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
      setCurrentFileIndex(0);
      setProgress(0);
      setFiles([]);
      if (fileRef.current) fileRef.current.value = '';
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
      setError('Upload failed');
    },
  });

  const isUploading = mutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-1 rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">Upload files</h3>

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
            multiple
            className="hidden"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
          {files.length > 0 ? (
            <p className="text-sm text-zinc-300">
              {files.length} file{files.length > 1 ? 's' : ''} selected
            </p>
          ) : dragging ? (
            <p className="text-sm text-brand font-medium">Drop to add</p>
          ) : (
            <p className="text-sm text-zinc-500">
              Drag & drop or <span className="text-zinc-300">click to browse</span> — any file type, up to 20GB
            </p>
          )}
        </div>

        <label className="flex items-center gap-2 mb-4 text-sm text-zinc-300 cursor-pointer">
          <input
            type="checkbox"
            checked={visibleToEveryone}
            onChange={(e) => setVisibleToEveryone(e.target.checked)}
            className="rounded border-zinc-600 bg-surface-2 text-brand focus:ring-brand focus:ring-offset-0"
          />
          Visible to everyone (default: only you and admins)
        </label>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

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
