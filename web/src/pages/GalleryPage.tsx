import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as mediaApi from '../api/media';
import * as tagsApi from '../api/tags';
import AppLayout from '../components/layout/AppLayout';
import TagFilterPanel from '../components/gallery/TagFilterPanel';
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
  const shuffleSeed = useRef<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Modal state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<MediaItem | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTagOpen, setBulkTagOpen] = useState(false);

  const tagsQuery = useQuery({ queryKey: ['tags'], queryFn: tagsApi.list });

  const seed = sort === 'random' ? shuffleSeed.current : undefined;

  const mediaQuery = useInfiniteQuery({
    queryKey: ['media', includedTags, excludedTags, filterMode, untaggedOnly, sort, seed],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      mediaApi.browse({
        tags: !untaggedOnly && includedTags.length > 0 ? includedTags.join(',') : undefined,
        excludeTags: !untaggedOnly && excludedTags.length > 0 ? excludedTags.join(',') : undefined,
        mode: filterMode === 'or' ? 'or' : undefined,
        maxTags: untaggedOnly ? 0 : undefined,
        sort: sort === 'random' ? 'random' : undefined,
        seed: seed ?? undefined,
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
  const totalItems = mediaQuery.data?.pages[0]?.total ?? 0;
  const activeFilterCount = includedTags.length + excludedTags.length + (untaggedOnly ? 1 : 0);

  return (
    <AppLayout>
      <div className="flex gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-56 shrink-0 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
          <TagFilterPanel
            tags={tagsQuery.data ?? []}
            includedSlugs={includedTags}
            excludedSlugs={excludedTags}
            mode={filterMode}
            untaggedOnly={untaggedOnly}
            onCycle={cycleTag}
            onClear={clearTags}
            onModeChange={setFilterMode}
            onUntaggedToggle={() => setUntaggedOnly((v) => !v)}
          />
        </aside>

        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden relative text-sm text-zinc-400 hover:text-zinc-100 border border-zinc-700 hover:border-zinc-500 rounded-lg px-3 py-1.5 transition-colors"
            >
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1.5 bg-brand text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <div className="ml-auto flex items-center gap-2">
              {!selectionMode && (includedTags.length > 0 || excludedTags.length > 0 || totalItems > 0) && (
                <button
                  onClick={() => mediaApi.bulkDownload(includedTags)}
                  className="hidden sm:inline-flex text-sm text-zinc-400 hover:text-zinc-100 border border-zinc-700 hover:border-zinc-500 rounded-lg px-3 py-1.5 transition-colors"
                >
                  Download ZIP
                </button>
              )}

              {!selectionMode && (
                <button
                  onClick={() => {
                    if (sort === 'newest') {
                      shuffleSeed.current = Math.random().toString(36).slice(2);
                      setSort('random');
                    } else {
                      setSort('newest');
                    }
                  }}
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
        </div>
      </div>

      {/* Mobile filter drawer */}
      <div
        className={`lg:hidden fixed inset-0 z-50 transition-opacity ${
          mobileFiltersOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-black/70" onClick={() => setMobileFiltersOpen(false)} />
        <div
          className={`absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-surface-1 border-r border-zinc-800 p-4 flex flex-col overflow-y-auto transition-transform duration-200 ${
            mobileFiltersOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-zinc-200">Filters</span>
            <button
              onClick={() => setMobileFiltersOpen(false)}
              className="text-zinc-400 hover:text-zinc-200 text-xl leading-none px-1"
            >
              &times;
            </button>
          </div>

          <TagFilterPanel
            tags={tagsQuery.data ?? []}
            includedSlugs={includedTags}
            excludedSlugs={excludedTags}
            mode={filterMode}
            untaggedOnly={untaggedOnly}
            onCycle={cycleTag}
            onClear={clearTags}
            onModeChange={setFilterMode}
            onUntaggedToggle={() => setUntaggedOnly((v) => !v)}
          />
        </div>
      </div>

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
