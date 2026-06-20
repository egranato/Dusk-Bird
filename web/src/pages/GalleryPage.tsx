import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as mediaApi from '../api/media';
import * as tagsApi from '../api/tags';
import AppLayout from '../components/layout/AppLayout';
import TagFilterBar from '../components/gallery/TagFilterBar';
import MediaGrid from '../components/gallery/MediaGrid';
import UploadModal from '../components/gallery/UploadModal';
import MediaDetailModal from '../components/gallery/MediaDetailModal';
import BulkActionBar from '../components/gallery/BulkActionBar';
import BulkTagModal from '../components/gallery/BulkTagModal';
import type { MediaItem } from '../types/api';

const PAGE_SIZE = 50;

export default function GalleryPage() {
  const qc = useQueryClient();

  // Filter state
  const [includedTags, setIncludedTags] = useState<string[]>([]);
  const [excludedTags, setExcludedTags] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<'and' | 'or'>('and');
  const [untaggedOnly, setUntaggedOnly] = useState(false);
  const [sort, setSort] = useState<'newest' | 'random'>('newest');
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Modal state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<MediaItem | null>(null);

  // Selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTagOpen, setBulkTagOpen] = useState(false);

  const tagsQuery = useQuery({ queryKey: ['tags'], queryFn: tagsApi.list });

  const mediaQuery = useInfiniteQuery({
    queryKey: ['media', includedTags, excludedTags, filterMode, untaggedOnly, sort],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      mediaApi.browse({
        tags: !untaggedOnly && includedTags.length > 0 ? includedTags.join(',') : undefined,
        excludeTags: !untaggedOnly && excludedTags.length > 0 ? excludedTags.join(',') : undefined,
        mode: filterMode === 'or' ? 'or' : undefined,
        maxTags: untaggedOnly ? 0 : undefined,
        sort: sort === 'random' ? 'random' : undefined,
        page: pageParam,
        limit: PAGE_SIZE,
      }),
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce((sum, p) => sum + p.data.length, 0);
      if (loadedCount >= lastPage.total) return undefined;
      return allPages.length + 1;
    },
  });

  const allItems = useMemo(
    () => mediaQuery.data?.pages.flatMap((p) => p.data) ?? [],
    [mediaQuery.data],
  );

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !mediaQuery.hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && mediaQuery.hasNextPage && !mediaQuery.isFetchingNextPage) {
          mediaQuery.fetchNextPage();
        }
      },
      { rootMargin: '300px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [mediaQuery.hasNextPage, mediaQuery.isFetchingNextPage, mediaQuery.fetchNextPage]);

  // ── Tag filter ──────────────────────────────────────────────────────────────
  function cycleTag(slug: string) {
    if (includedTags.includes(slug)) {
      setIncludedTags((prev) => prev.filter((s) => s !== slug));
      setExcludedTags((prev) => [...prev, slug]);
    } else if (excludedTags.includes(slug)) {
      setExcludedTags((prev) => prev.filter((s) => s !== slug));
    } else {
      setIncludedTags((prev) => [...prev, slug]);
    }
  }

  function clearTags() {
    setIncludedTags([]);
    setExcludedTags([]);
  }

  // ── Selection ───────────────────────────────────────────────────────────────
  function enterSelection() {
    setSelectionMode(true);
    setSelectedIds(new Set());
  }

  function exitSelection() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  function handleCardClick(item: MediaItem) {
    if (selectionMode) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.has(item.id) ? next.delete(item.id) : next.add(item.id);
        return next;
      });
    } else {
      setDetailItem(item);
    }
  }

  // ── Bulk delete ─────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: () => mediaApi.bulkRemove([...selectedIds]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['media'] });
      exitSelection();
    },
  });

  function handleBulkDelete() {
    if (confirm(`Delete ${selectedIds.size} item${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`)) {
      deleteMutation.mutate();
    }
  }

  const selectedItems = allItems.filter((i) => selectedIds.has(i.id));

  return (
    <AppLayout>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <TagFilterBar
          tags={tagsQuery.data ?? []}
          includedSlugs={includedTags}
          excludedSlugs={excludedTags}
          mode={filterMode}
          onCycle={cycleTag}
          onClear={clearTags}
          onModeChange={setFilterMode}
        />

        <button
          onClick={() => setUntaggedOnly((v) => !v)}
          className={`text-sm rounded-full px-3 py-1 border transition-colors ${
            untaggedOnly
              ? 'bg-brand border-brand text-white'
              : 'border-zinc-600 text-zinc-400 hover:border-zinc-400 hover:text-zinc-200'
          }`}
        >
          Untagged
        </button>

        <div className="ml-auto flex items-center gap-2">
          {!selectionMode && (includedTags.length > 0 || excludedTags.length > 0 || (mediaQuery.data?.total ?? 0) > 0) && (
            <button
              onClick={() => mediaApi.bulkDownload(includedTags)}
              className="hidden sm:inline-flex text-sm text-zinc-400 hover:text-zinc-100 border border-zinc-700 hover:border-zinc-500 rounded-lg px-3 py-1.5 transition-colors"
            >
              Download ZIP
            </button>
          )}

          {!selectionMode && (
            <button
              onClick={() => setSort((s) => s === 'newest' ? 'random' : 'newest')}
              className="text-sm text-zinc-400 hover:text-zinc-100 border border-zinc-700 hover:border-zinc-500 rounded-lg px-3 py-1.5 transition-colors"
              title={sort === 'newest' ? 'Switch to random order' : 'Switch to newest first'}
            >
              {sort === 'newest' ? 'Newest' : 'Shuffle'}
            </button>
          )}

          {!selectionMode && allItems.length > 0 && (
            <button
              onClick={enterSelection}
              className="text-sm text-zinc-400 hover:text-zinc-100 border border-zinc-700 hover:border-zinc-500 rounded-lg px-3 py-1.5 transition-colors"
            >
              Select
            </button>
          )}

          {selectionMode && allItems.length > 0 && (() => {
            const allSelected = allItems.length > 0 && allItems.every((i) => selectedIds.has(i.id));
            return (
              <button
                onClick={() => setSelectedIds(allSelected ? new Set() : new Set(allItems.map((i) => i.id)))}
                className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
            );
          })()}

          {!selectionMode && (
            <button
              onClick={() => setUploadOpen(true)}
              className="bg-brand hover:bg-brand-hover rounded-lg px-4 py-1.5 text-sm font-medium transition-colors"
            >
              Upload
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <MediaGrid
        items={allItems}
        isLoading={mediaQuery.isLoading}
        onSelect={handleCardClick}
        selectable={selectionMode}
        selectedIds={selectedIds}
      />

      {/* Infinite scroll status */}
      {allItems.length > 0 && (
        <div className="mt-6 flex justify-center">
          <div className="flex flex-col items-center gap-2">
            <div ref={loadMoreRef} className="text-sm text-zinc-500 px-3 py-2">
              {mediaQuery.isFetchingNextPage
                ? 'Loading more…'
                : mediaQuery.hasNextPage
                  ? 'Scroll to load more'
                  : 'End of results'}
            </div>

            {mediaQuery.hasNextPage && !mediaQuery.isFetchingNextPage && (
              <button
                onClick={() => mediaQuery.fetchNextPage()}
                className="text-sm text-zinc-300 hover:text-zinc-100 border border-zinc-700 hover:border-zinc-500 rounded-lg px-3 py-1.5 transition-colors"
              >
                Load more
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {uploadOpen && (
        <UploadModal tags={tagsQuery.data ?? []} onClose={() => setUploadOpen(false)} />
      )}

      {detailItem && !selectionMode && (
        <MediaDetailModal
          item={detailItem}
          allTags={tagsQuery.data ?? []}
          onClose={() => setDetailItem(null)}
          onDeleted={() => setDetailItem(null)}
        />
      )}

      {/* Bulk action bar */}
      {selectionMode && (
        <BulkActionBar
          count={selectedIds.size}
          onTag={() => setBulkTagOpen(true)}
          onDelete={handleBulkDelete}
          onDone={exitSelection}
          isDeleting={deleteMutation.isPending}
        />
      )}

      {bulkTagOpen && (
        <BulkTagModal
          selectedItems={selectedItems}
          allTags={tagsQuery.data ?? []}
          onClose={() => { setBulkTagOpen(false); exitSelection(); }}
        />
      )}
    </AppLayout>
  );
}
