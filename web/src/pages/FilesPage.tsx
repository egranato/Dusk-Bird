import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as mediaApi from '../api/media';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import FilesUploadModal from '../components/files/FilesUploadModal';
import type { MediaItem } from '../types/api';

const PAGE_SIZE = 50;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let i = -1;
  do {
    size /= 1024;
    i++;
  } while (size >= 1024 && i < units.length - 1);
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[i]}`;
}

function extensionOf(fileName: string): string {
  const idx = fileName.lastIndexOf('.');
  return idx > 0 ? fileName.slice(idx + 1).toUpperCase() : '';
}

export default function FilesPage() {
  const qc = useQueryClient();
  const { currentUser } = useAuth();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [linkCopiedId, setLinkCopiedId] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const filesQuery = useInfiniteQuery({
    queryKey: ['media', 'file'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      mediaApi.browse({ kind: 'file', sort: 'newest', page: pageParam, limit: PAGE_SIZE }),
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce((sum, p) => sum + p.data.length, 0);
      if (loadedCount >= lastPage.total) return undefined;
      return allPages.length + 1;
    },
  });

  const allItems = useMemo(
    () => filesQuery.data?.pages.flatMap((p) => p.data) ?? [],
    [filesQuery.data],
  );

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !filesQuery.hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && filesQuery.hasNextPage && !filesQuery.isFetchingNextPage) {
          filesQuery.fetchNextPage();
        }
      },
      { rootMargin: '300px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [filesQuery.hasNextPage, filesQuery.isFetchingNextPage, filesQuery.fetchNextPage]);

  const visibilityMutation = useMutation({
    mutationFn: ({ id, visibility }: { id: string; visibility: 'public' | 'private' }) =>
      mediaApi.setVisibility(id, visibility),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['media', 'file'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mediaApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['media', 'file'] }),
  });

  function copyLink(item: MediaItem) {
    const url = `${window.location.origin}/media/${item.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopiedId(item.id);
      setTimeout(() => setLinkCopiedId((prev) => (prev === item.id ? null : prev)), 1500);
    });
  }

  return (
    <AppLayout>
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-lg font-semibold">Files</h1>
        <p className="text-sm text-zinc-500">Anything that isn't a photo or video — up to 20GB per file.</p>
        <button
          onClick={() => setUploadOpen(true)}
          className="ml-auto bg-brand hover:bg-brand-hover rounded-lg px-4 py-1.5 text-sm font-medium transition-colors"
        >
          Upload
        </button>
      </div>

      {filesQuery.isLoading ? (
        <p className="text-zinc-500 text-sm">Loading…</p>
      ) : allItems.length === 0 ? (
        <p className="text-zinc-500 text-sm">No files yet — upload something you can't email or send over Discord.</p>
      ) : (
        <div className="bg-surface-1 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-zinc-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3">Visibility</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {allItems.map((item) => {
                const canManage = currentUser?.role === 'admin' || item.uploaderId === currentUser?.id;
                return (
                  <tr key={item.id} className="border-b border-zinc-800/50 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center text-[10px] font-bold text-zinc-400 flex-shrink-0">
                          {extensionOf(item.fileName).slice(0, 4) || '?'}
                        </div>
                        <span className="truncate max-w-xs" title={item.fileName}>{item.fileName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{formatSize(item.sizeBytes)}</td>
                    <td className="px-4 py-3 text-zinc-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                      {item.uploaderId === currentUser?.id ? ' · you' : ''}
                    </td>
                    <td className="px-4 py-3">
                      {canManage ? (
                        <button
                          onClick={() =>
                            visibilityMutation.mutate({
                              id: item.id,
                              visibility: item.visibility === 'public' ? 'private' : 'public',
                            })
                          }
                          disabled={visibilityMutation.isPending}
                          className="text-xs text-zinc-400 hover:text-brand disabled:opacity-40 transition-colors"
                        >
                          {item.visibility === 'public' ? 'Public' : 'Private'}
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-500">
                          {item.visibility === 'public' ? 'Public' : 'Private'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3 justify-end items-center">
                        <button
                          onClick={() => copyLink(item)}
                          className="text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
                        >
                          {linkCopiedId === item.id ? 'Copied!' : 'Copy link'}
                        </button>
                        <a
                          href={mediaApi.mediaDownloadUrl(item.id)}
                          download={item.fileName}
                          className="text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
                        >
                          Download
                        </a>
                        {canManage && (
                          <button
                            onClick={() => { if (confirm(`Delete "${item.fileName}"?`)) deleteMutation.mutate(item.id); }}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {allItems.length > 0 && (
        <div className="mt-6 flex justify-center">
          <div ref={loadMoreRef} className="text-sm text-zinc-500 px-3 py-2">
            {filesQuery.isFetchingNextPage
              ? 'Loading more…'
              : filesQuery.hasNextPage
                ? 'Scroll to load more'
                : 'End of results'}
          </div>
        </div>
      )}

      {uploadOpen && <FilesUploadModal onClose={() => setUploadOpen(false)} />}
    </AppLayout>
  );
}
