import type { MediaItem } from '../../types/api';
import MediaCard from './MediaCard';

interface Props {
  items: MediaItem[];
  isLoading: boolean;
  onSelect: (item: MediaItem) => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
}

export default function MediaGrid({ items, isLoading, onSelect, selectable, selectedIds }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="aspect-video bg-surface-1 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
        <p className="text-lg">No media found</p>
        <p className="text-sm mt-1">Upload something or try different tag filters</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {items.map((item) => (
        <MediaCard
          key={item.id}
          item={item}
          onClick={() => onSelect(item)}
          selectable={selectable}
          selected={selectedIds?.has(item.id)}
        />
      ))}
    </div>
  );
}
