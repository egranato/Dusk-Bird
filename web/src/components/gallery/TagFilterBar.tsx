import type { TagResponse } from '../../types/api';

interface Props {
  tags: TagResponse[];
  includedSlugs: string[];
  excludedSlugs: string[];
  mode: 'and' | 'or';
  onCycle: (slug: string) => void;
  onClear: () => void;
  onModeChange: (mode: 'and' | 'or') => void;
}

export default function TagFilterBar({
  tags,
  includedSlugs,
  excludedSlugs,
  mode,
  onCycle,
  onClear,
  onModeChange,
}: Props) {
  const visible = tags.filter((t) => t.usageCount > 0);
  if (visible.length === 0) return null;

  const hasAnyFilter = includedSlugs.length > 0 || excludedSlugs.length > 0;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {visible.map((tag) => {
        const included = includedSlugs.includes(tag.slug);
        const excluded = excludedSlugs.includes(tag.slug);

        return (
          <button
            key={tag.id}
            onClick={() => onCycle(tag.slug)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              included
                ? 'bg-brand border-brand text-white'
                : excluded
                ? 'bg-red-500/20 border-red-500 text-red-400'
                : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
            }`}
          >
            {excluded && <span className="mr-0.5 font-bold">−</span>}
            {tag.name}
            <span className="ml-1 opacity-60">{tag.usageCount}</span>
          </button>
        );
      })}

      {/* AND/OR toggle — only relevant when ≥2 tags are included */}
      {includedSlugs.length > 1 && (
        <button
          onClick={() => onModeChange(mode === 'and' ? 'or' : 'and')}
          className="text-xs px-2.5 py-1 rounded-full border border-zinc-600 text-zinc-400 hover:border-zinc-400 hover:text-zinc-200 transition-colors font-mono"
          title={
            mode === 'and'
              ? 'Showing items with ALL selected tags — click for ANY'
              : 'Showing items with ANY selected tag — click for ALL'
          }
        >
          {mode.toUpperCase()}
        </button>
      )}

      {hasAnyFilter && (
        <button
          onClick={onClear}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}
